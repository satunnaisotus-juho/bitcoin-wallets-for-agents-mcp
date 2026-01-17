export interface McpServerConfig {
  port: number;
  apiKey?: string;
  https?: McpHttpsConfig;
}

export interface McpHttpsConfig {
  domain: string;
  email: string;
  httpsPort: number;
  staging: boolean;
}
