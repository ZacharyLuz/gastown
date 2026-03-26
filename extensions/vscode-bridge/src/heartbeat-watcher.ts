/**
 * Heartbeat Watcher
 *
 * Monitors ~/gt/deacon/heartbeat.json for staleness and shows
 * Gas Town status in the VS Code status bar.
 *
 * Status states:
 * - 🟢 Gas Town OK — heartbeat fresh (< 5 min)
 * - 🟡 Gas Town stale — heartbeat between 5–15 min old
 * - 🔴 Gas Town down — heartbeat > 15 min or missing
 * - ⚫ Gas Town N/A — not installed
 */
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

interface Heartbeat {
  timestamp: string;
  cycle: number;
  last_action: string;
  healthy_agents: number;
  unhealthy_agents: number;
}

const STALE_MS = 5 * 60 * 1000;     // 5 minutes
const VERY_STALE_MS = 15 * 60 * 1000; // 15 minutes
const POLL_MS = 30_000; // check every 30s

export class HeartbeatWatcher implements vscode.Disposable {
  private statusBar: vscode.StatusBarItem;
  private heartbeatPath: string;
  private rigListPath: string;
  private timer: ReturnType<typeof setInterval> | undefined;
  private fileWatcher: vscode.FileSystemWatcher | undefined;

  constructor(
    private townRoot: string,
    context: vscode.ExtensionContext,
  ) {
    this.heartbeatPath = path.join(townRoot, "deacon", "heartbeat.json");
    this.rigListPath = path.join(townRoot, "mayor", "rigs.json");

    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      50,
    );
    this.statusBar.command = "gastown.showStatus";
    context.subscriptions.push(this.statusBar);

    // Initial update
    this.update();

    // Poll periodically
    this.timer = setInterval(() => this.update(), POLL_MS);

    // Also watch for heartbeat file changes
    try {
      const deaconDir = path.join(townRoot, "deacon");
      if (fs.existsSync(deaconDir)) {
        const pattern = new vscode.RelativePattern(deaconDir, "heartbeat.json");
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        this.fileWatcher.onDidChange(() => this.update());
        this.fileWatcher.onDidCreate(() => this.update());
        this.fileWatcher.onDidDelete(() => this.update());
      }
    } catch {
      // Ignore — Gas Town may not be installed
    }
  }

  private update(): void {
    if (!fs.existsSync(this.townRoot)) {
      this.statusBar.text = "$(circle-slash) GT N/A";
      this.statusBar.tooltip = "Gas Town not installed";
      this.statusBar.backgroundColor = undefined;
      this.statusBar.show();
      return;
    }

    // Count rigs
    let rigCount = 0;
    try {
      if (fs.existsSync(this.rigListPath)) {
        const raw = fs.readFileSync(this.rigListPath, "utf-8");
        const rigs = JSON.parse(raw);
        rigCount = Array.isArray(rigs) ? rigs.length : Object.keys(rigs).length;
      }
    } catch {
      // ignore parse errors
    }

    // Check heartbeat
    if (!fs.existsSync(this.heartbeatPath)) {
      this.statusBar.text = `$(circle-outline) GT ${rigCount}r`;
      this.statusBar.tooltip = "Gas Town: Deacon not running (no heartbeat)";
      this.statusBar.backgroundColor = undefined;
      this.statusBar.show();
      return;
    }

    try {
      const raw = fs.readFileSync(this.heartbeatPath, "utf-8");
      const hb: Heartbeat = JSON.parse(raw);
      const age = Date.now() - new Date(hb.timestamp).getTime();

      if (age < STALE_MS) {
        this.statusBar.text = `$(pass-filled) GT ${rigCount}r ${hb.healthy_agents}a`;
        this.statusBar.tooltip = `Gas Town OK — cycle ${hb.cycle}, ${hb.healthy_agents} healthy, ${hb.unhealthy_agents} unhealthy\nLast: ${hb.last_action}`;
        this.statusBar.backgroundColor = undefined;
      } else if (age < VERY_STALE_MS) {
        this.statusBar.text = `$(warning) GT stale`;
        this.statusBar.tooltip = `Gas Town heartbeat stale (${Math.round(age / 60000)}m ago)\nLast: ${hb.last_action}`;
        this.statusBar.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
      } else {
        this.statusBar.text = `$(error) GT down`;
        this.statusBar.tooltip = `Gas Town heartbeat very stale (${Math.round(age / 60000)}m ago)\nDeacon may need restart: gt daemon start`;
        this.statusBar.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
      }
    } catch {
      this.statusBar.text = `$(circle-outline) GT ?`;
      this.statusBar.tooltip = "Gas Town: Could not read heartbeat";
      this.statusBar.backgroundColor = undefined;
    }

    this.statusBar.show();
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.fileWatcher?.dispose();
    this.statusBar.dispose();
  }
}
