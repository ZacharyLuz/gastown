import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import type { Request, Response } from "express";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { createServer } from "./server.js";

function loadTlsCerts(): { cert: string; key: string } | null {
  const certEnv = process.env.MCP_TLS_CERT;
  const keyEnv = process.env.MCP_TLS_KEY;
  if (certEnv && keyEnv) return { cert: fs.readFileSync(certEnv, "utf-8"), key: fs.readFileSync(keyEnv, "utf-8") };
  const appDir = import.meta.dirname;
  for (const base of [appDir, path.resolve(appDir, "..")]) {
    const c = path.join(base, ".certs", "localhost.pem");
    const k = path.join(base, ".certs", "localhost-key.pem");
    if (fs.existsSync(c) && fs.existsSync(k)) return { cert: fs.readFileSync(c, "utf-8"), key: fs.readFileSync(k, "utf-8") };
  }
  return null;
}

export async function startStreamableHTTPServer(
  createServerFn: () => McpServer,
): Promise<void> {
  const useTls = process.argv.includes("--tls") || process.env.MCP_TLS === "true";
  const basePort = parseInt(process.env.PORT ?? "3011", 10);
  const port = useTls ? basePort + 1000 : basePort;
  const protocol = useTls ? "https" : "http";

  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts: ["localhost", "127.0.0.1"] });
  app.use(cors());

  app.all("/mcp", async (req: Request, res: Response) => {
    const server = createServerFn();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  if (useTls) {
    const certs = loadTlsCerts();
    if (!certs) {
      console.error("TLS requested but no certs found. Set MCP_TLS_CERT+MCP_TLS_KEY or place in .certs/");
      process.exit(1);
    }
    const httpsServer = https.createServer(certs, app);
    httpsServer.listen(port, () => console.log(`Gas Town Convoy MCP server on ${protocol}://localhost:${port}/mcp`));
    const shutdown = () => { httpsServer.close(() => process.exit(0)); };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } else {
    const httpServer = app.listen(port, () => console.log(`Gas Town Convoy MCP server on ${protocol}://localhost:${port}/mcp`));
    const shutdown = () => { httpServer.close(() => process.exit(0)); };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}

export async function startStdioServer(createServerFn: () => McpServer): Promise<void> {
  await createServerFn().connect(new StdioServerTransport());
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await startStdioServer(createServer);
  } else {
    await startStreamableHTTPServer(createServer);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
