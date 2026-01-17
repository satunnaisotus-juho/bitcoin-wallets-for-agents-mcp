import "dotenv/config";
import path from "path";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getMcpServerConfig } from "./config/index.js";
import { registerBlinkTools } from "./wallets/blink/tools.js";

// Configuration
const config = getMcpServerConfig();

// Create MCP server
const server = new McpServer({
  name: "bitcoin-wallets-for-agents-mcp",
  version: "0.1.0",
});

// Register wallet tools
registerBlinkTools(server);

// Setup Express
const app = express();
app.use(express.json());

// API Key authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  if (!config.apiKey) {
    // No API key configured - allow request (for local testing)
    return next();
  }

  const providedKey = req.headers["x-api-key"];
  if (providedKey !== config.apiKey) {
    return res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized: Invalid API key" },
      id: null,
    });
  }
  next();
};

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // Stateless mode
});

// MCP endpoint (authenticated)
app.post("/mcp", authenticate, async (req: Request, res: Response) => {
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request error:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal server error" },
      id: null,
    });
  }
});

// Health check (no auth required)
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Start server
async function main() {
  await server.connect(transport);

  if (config.https) {
    // HTTPS mode with Let's Encrypt
    const greenlockModule = await import("greenlock-express");
    const greenlock = greenlockModule.default;
    const httpsConfig = config.https;

    console.log("");
    console.log(`Initializing HTTPS with Let's Encrypt for ${httpsConfig.domain}...`);

    let certObtained = false;

    const gl = greenlock.init({
      packageRoot: path.join(import.meta.dirname, '..'),
      configDir: path.join(import.meta.dirname, '../greenlock.d'),
      maintainerEmail: httpsConfig.email,
      cluster: false,
      staging: httpsConfig.staging,
      notify: (event: string, details: { subject?: string }) => {
        if (event === 'cert_issue') {
          console.log(`Certificate issued for ${details.subject}`);
          certObtained = true;
        } else if (event === 'cert_renewal') {
          console.log(`Certificate renewed for ${details.subject}`);
          certObtained = true;
        }
      },
    });

    gl.ready((glx: { httpsServer: (opts: null, app: express.Application) => { listen: (port: number, callback?: () => void) => void }; httpServer: () => { listen: (port: number, callback?: () => void) => void } }) => {
        if (!certObtained) {
          console.log(`Using cached certificate for ${httpsConfig.domain}`);
        }
        console.log("Auto-renewal enabled (checks daily, renews at 45 days remaining)");

        if (!config.apiKey) {
          console.log("Warning: No MCP_API_KEY configured - running without authentication");
        } else {
          console.log("API key authentication enabled");
        }

        const httpsServer = glx.httpsServer(null, app);
        const httpServer = glx.httpServer();

        httpsServer.listen(httpsConfig.httpsPort, () => {
          console.log(`MCP server listening on https://${httpsConfig.domain}:${httpsConfig.httpsPort}/mcp`);
        });

        // HTTP server for ACME challenges + redirect to HTTPS
        httpServer.listen(80, () => {
          console.log("HTTP server listening on port 80 (ACME challenges + redirect)");
        });
      });
  } else {
    // HTTP mode (no domain configured)
    console.log("");
    console.log("No MCP_DOMAIN configured - running in HTTP mode");
    console.log("For production, set MCP_DOMAIN and MCP_ACME_EMAIL");
    console.log("");

    if (!config.apiKey) {
      console.log("Warning: No MCP_API_KEY configured - running without authentication");
      console.log("");
    } else {
      console.log("API key authentication enabled");
    }

    app.listen(config.port, () => {
      console.log(`MCP server listening on http://0.0.0.0:${config.port}/mcp`);
    });
  }
}

main().catch(console.error);
