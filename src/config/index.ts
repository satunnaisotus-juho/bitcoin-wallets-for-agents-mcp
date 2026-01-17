import type { McpServerConfig } from "../types/mcp.js";
import type { BlinkConfig } from "../wallets/blink/types.js";

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new ConfigurationError(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getMcpServerConfig(): McpServerConfig {
  const portStr = process.env["MCP_PORT"] ?? "3000";
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new ConfigurationError(`Invalid MCP_PORT: ${portStr}`);
  }

  const apiKey = process.env["MCP_API_KEY"];
  const domain = process.env["MCP_DOMAIN"];

  // If no domain configured, return HTTP-only config
  if (!domain) {
    return { port, apiKey };
  }

  // HTTPS mode - domain is configured
  const email = process.env["MCP_ACME_EMAIL"];
  if (!email) {
    throw new ConfigurationError(
      "MCP_ACME_EMAIL is required when MCP_DOMAIN is set"
    );
  }

  const httpsPortStr = process.env["MCP_HTTPS_PORT"] ?? "443";
  const httpsPort = parseInt(httpsPortStr, 10);
  if (isNaN(httpsPort) || httpsPort < 1 || httpsPort > 65535) {
    throw new ConfigurationError(`Invalid MCP_HTTPS_PORT: ${httpsPortStr}`);
  }

  const stagingStr = process.env["MCP_ACME_STAGING"] ?? "false";
  const staging = stagingStr.toLowerCase() === "true";

  return {
    port,
    apiKey,
    https: {
      domain,
      email,
      httpsPort,
      staging,
    },
  };
}

export function getBlinkConfig(): BlinkConfig {
  const apiKey = getRequiredEnv("BLINK_API_KEY");
  const endpoint = process.env["BLINK_ENDPOINT"] ?? "https://api.blink.sv/graphql";

  if (!apiKey.startsWith("blink_")) {
    throw new ConfigurationError(
      "Invalid BLINK_API_KEY format: expected key starting with 'blink_'"
    );
  }

  return {
    apiKey,
    endpoint,
  };
}
