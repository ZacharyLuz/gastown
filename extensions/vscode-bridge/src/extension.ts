/**
 * Gas Town Bridge Extension — main entry point
 *
 * Bridges Gas Town multi-agent orchestration with GitHub Copilot:
 * 1. Terminal Event Hook Emitter — writes .events.jsonl on command execution
 * 2. Heartbeat Watcher — monitors Deacon heartbeat, shows status in status bar
 * 3. Session Context Tools — save/load session summaries for Seance-like recovery
 */
import * as vscode from "vscode";
import { TerminalHookEmitter } from "./terminal-hooks";
import { HeartbeatWatcher } from "./heartbeat-watcher";
import { SessionManager } from "./session-manager";

export function activate(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration("gastown");
  const townRoot = resolveTownRoot(config);

  // 1. Terminal Hook Emitter
  if (config.get<boolean>("emitTerminalEvents", true)) {
    const hooks = new TerminalHookEmitter(townRoot);
    context.subscriptions.push(hooks);
  }

  // 2. Heartbeat Watcher + Status Bar
  if (config.get<boolean>("heartbeatWatchEnabled", true)) {
    const watcher = new HeartbeatWatcher(townRoot, context);
    context.subscriptions.push(watcher);
  }

  // 3. Session Context Commands
  const sessions = new SessionManager(townRoot);
  context.subscriptions.push(
    vscode.commands.registerCommand("gastown.showStatus", () => sessions.showStatus()),
    vscode.commands.registerCommand("gastown.saveSession", () => sessions.saveSession()),
    vscode.commands.registerCommand("gastown.loadSession", () => sessions.loadSession()),
  );

  // Log activation
  const outputChannel = vscode.window.createOutputChannel("Gas Town Bridge");
  outputChannel.appendLine(`Gas Town Bridge activated. Town root: ${townRoot}`);
  context.subscriptions.push(outputChannel);
}

export function deactivate(): void {
  // cleanup handled by disposables
}

function resolveTownRoot(config: vscode.WorkspaceConfiguration): string {
  const explicit = config.get<string>("townRoot", "");
  if (explicit) return explicit;
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
  return require("path").join(home, "gt");
}
