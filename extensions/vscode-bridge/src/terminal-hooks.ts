/**
 * Terminal Hook Emitter
 *
 * Listens for terminal shell execution events and writes them to
 * ~/gt/.events.jsonl in Gas Town's canonical JSONL event format.
 *
 * This gives Gas Town's Seance discovery system visibility into
 * GHCP sessions without requiring Claude Code's built-in hooks.
 */
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class TerminalHookEmitter implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private eventsPath: string;
  private sessionStarted = false;

  constructor(private townRoot: string) {
    this.eventsPath = path.join(townRoot, ".events.jsonl");

    // Listen for terminal shell execution start
    const startSub = vscode.window.onDidStartTerminalShellExecution((event) => {
      this.onCommandStart(event);
    });
    this.disposables.push(startSub);

    // Listen for terminal shell execution end
    const endSub = vscode.window.onDidEndTerminalShellExecution((event) => {
      this.onCommandEnd(event);
    });
    this.disposables.push(endSub);

    // Emit session_start on first terminal interaction
    const shellSub = vscode.window.onDidChangeTerminalShellIntegration((event) => {
      if (!this.sessionStarted) {
        this.emitSessionStart(event.terminal);
      }
    });
    this.disposables.push(shellSub);
  }

  private emitSessionStart(terminal: vscode.Terminal): void {
    this.sessionStarted = true;
    const sessionId = `ghcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.appendEvent({
      type: "session_start",
      actor: "mcpapps1/copilot",
      payload: {
        session_id: sessionId,
        topic: "ghcp-terminal",
        agent: "github-copilot",
        terminal_name: terminal.name,
      },
    });
  }

  private onCommandStart(event: vscode.TerminalShellExecutionStartEvent): void {
    const cmdLine = event.execution.commandLine;
    if (!cmdLine || cmdLine.confidence === vscode.TerminalShellExecutionCommandLineConfidence.Low) {
      return; // skip unreliable commands
    }
    this.appendEvent({
      type: "command_start",
      actor: "mcpapps1/copilot",
      payload: {
        command: cmdLine.value,
        confidence: cmdLine.confidence,
        cwd: event.execution.cwd?.fsPath ?? "",
        terminal: event.terminal.name,
      },
    });
  }

  private onCommandEnd(event: vscode.TerminalShellExecutionEndEvent): void {
    const cmdLine = event.execution.commandLine;
    if (!cmdLine || cmdLine.confidence === vscode.TerminalShellExecutionCommandLineConfidence.Low) {
      return;
    }
    this.appendEvent({
      type: "command_end",
      actor: "mcpapps1/copilot",
      payload: {
        command: cmdLine.value,
        exitCode: event.exitCode,
        cwd: event.execution.cwd?.fsPath ?? "",
        terminal: event.terminal.name,
      },
    });
  }

  private appendEvent(event: { type: string; actor: string; payload: unknown }): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.eventsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
      fs.appendFileSync(this.eventsPath, line + "\n", "utf-8");
    } catch (err) {
      // Silently ignore write failures (Gas Town may not be installed)
    }
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
