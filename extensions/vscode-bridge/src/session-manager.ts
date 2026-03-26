/**
 * Session Manager
 *
 * Provides VS Code commands for saving and loading session context,
 * bridging GHCP sessions with Gas Town's Seance-like recovery.
 *
 * Session files are stored in ~/gt/sessions/ as JSON.
 */
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

interface SessionRecord {
  sessionId: string;
  agent: string;
  rig: string;
  issueIds: string[];
  summary: string;
  timestamp: string;
  files?: string[];
}

export class SessionManager {
  private sessionsDir: string;

  constructor(private townRoot: string) {
    this.sessionsDir = path.join(townRoot, "sessions");
  }

  async showStatus(): Promise<void> {
    const lines: string[] = [];

    // Town status
    if (!fs.existsSync(this.townRoot)) {
      vscode.window.showInformationMessage("Gas Town is not installed at " + this.townRoot);
      return;
    }

    lines.push("## Gas Town Status\n");

    // Rig count
    try {
      const rigsPath = path.join(this.townRoot, "mayor", "rigs.json");
      if (fs.existsSync(rigsPath)) {
        const rigs = JSON.parse(fs.readFileSync(rigsPath, "utf-8"));
        const count = Array.isArray(rigs) ? rigs.length : Object.keys(rigs).length;
        lines.push(`**Rigs:** ${count}`);
      }
    } catch { /* ignore */ }

    // Session count
    try {
      if (fs.existsSync(this.sessionsDir)) {
        const files = fs.readdirSync(this.sessionsDir).filter(f => f.endsWith(".json"));
        lines.push(`**Saved sessions:** ${files.length}`);
      }
    } catch { /* ignore */ }

    // Events count
    const eventsPath = path.join(this.townRoot, ".events.jsonl");
    try {
      if (fs.existsSync(eventsPath)) {
        const content = fs.readFileSync(eventsPath, "utf-8");
        const count = content.split("\n").filter(Boolean).length;
        lines.push(`**Events logged:** ${count}`);
      }
    } catch { /* ignore */ }

    // CLI status
    lines.push("\n**gt CLI:** " + (await this.checkCmd("gt") ? "installed" : "not found"));
    lines.push("**bd CLI:** " + (await this.checkCmd("bd") ? "installed" : "not found"));

    const doc = await vscode.workspace.openTextDocument({
      content: lines.join("\n"),
      language: "markdown",
    });
    await vscode.window.showTextDocument(doc, { preview: true });
  }

  async saveSession(): Promise<void> {
    const summary = await vscode.window.showInputBox({
      prompt: "Session summary — what was accomplished, decisions made, next steps",
      placeHolder: "Implemented feature X, fixed bug Y, next: test Z",
    });
    if (!summary) return;

    const rigInput = await vscode.window.showInputBox({
      prompt: "Rig name (press Enter for mcpapps1)",
      value: "mcpapps1",
    });
    const rig = rigInput ?? "mcpapps1";

    // Collect open dirty files as context
    const dirtyFiles = vscode.workspace.textDocuments
      .filter(d => d.isDirty && d.uri.scheme === "file")
      .map(d => vscode.workspace.asRelativePath(d.uri));

    const sessionId = `ghcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record: SessionRecord = {
      sessionId,
      agent: "github-copilot",
      rig,
      issueIds: [],
      summary,
      timestamp: new Date().toISOString(),
      files: dirtyFiles,
    };

    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }

    const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf-8");

    // Emit to events.jsonl
    this.appendEvent({
      type: "session_save",
      actor: `${rig}/copilot`,
      payload: record,
    });

    vscode.window.showInformationMessage(`Session saved: ${sessionId}`);
  }

  async loadSession(): Promise<void> {
    if (!fs.existsSync(this.sessionsDir)) {
      vscode.window.showInformationMessage("No previous sessions found.");
      return;
    }

    const files = fs.readdirSync(this.sessionsDir)
      .filter(f => f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) {
      vscode.window.showInformationMessage("No previous sessions found.");
      return;
    }

    // Show quick pick of recent sessions
    const items = files.slice(0, 10).map(f => {
      const raw = fs.readFileSync(path.join(this.sessionsDir, f), "utf-8");
      const record: SessionRecord = JSON.parse(raw);
      return {
        label: `${record.rig} — ${new Date(record.timestamp).toLocaleString()}`,
        description: record.summary.slice(0, 80),
        detail: `Agent: ${record.agent} | Files: ${record.files?.length ?? 0}`,
        record,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a session to load context from",
    });

    if (!selected) return;

    // Show full session in a document
    const doc = await vscode.workspace.openTextDocument({
      content: [
        `# Session: ${selected.record.sessionId}`,
        `**Agent:** ${selected.record.agent}`,
        `**Rig:** ${selected.record.rig}`,
        `**Time:** ${selected.record.timestamp}`,
        `**Issues:** ${selected.record.issueIds.join(", ") || "none"}`,
        selected.record.files?.length ? `**Files:** ${selected.record.files.join(", ")}` : "",
        "",
        "## Summary",
        selected.record.summary,
      ].filter(Boolean).join("\n"),
      language: "markdown",
    });
    await vscode.window.showTextDocument(doc, { preview: true });
  }

  private appendEvent(event: { type: string; actor: string; payload: unknown }): void {
    try {
      const eventsPath = path.join(this.townRoot, ".events.jsonl");
      const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
      fs.appendFileSync(eventsPath, line + "\n", "utf-8");
    } catch { /* ignore */ }
  }

  private async checkCmd(cmd: string): Promise<boolean> {
    const { exec } = require("child_process");
    return new Promise(resolve => {
      exec(`${cmd} version`, { timeout: 5000 }, (err: Error | null) => {
        resolve(!err);
      });
    });
  }
}
