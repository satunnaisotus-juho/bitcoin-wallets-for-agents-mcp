# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Keep This File Updated

When planning any implementation task, include updating this CLAUDE.md file as part of your plan. Document new patterns, commands, architectural changes, or configuration options that future Claude Code instances would need to know.

## Project Overview

MCP (Model Context Protocol) server exposing Bitcoin wallet operations for AI agents. Currently supports the Blink wallet backend (Bitcoin/Lightning payments via GraphQL).

## Commands

```bash
npm run build       # Compile TypeScript to dist/
npm run dev         # Run with hot reload (tsx)
npm run start       # Run compiled production server
npm run lint        # ESLint check
npm run typecheck   # Type check without emitting
```

## Architecture

```
src/
├── index.ts              # Express server, MCP setup, authentication middleware
├── config/index.ts       # Environment validation (getMcpServerConfig, getBlinkConfig)
├── types/mcp.ts          # MCP server config interfaces
└── wallets/blink/
    ├── types.ts          # Blink type definitions (BlinkAccount, BlinkTransaction, etc.)
    ├── service.ts        # BlinkService class - GraphQL client for Blink API
    └── tools.ts          # MCP tool registrations (registerBlinkTools)
```

### Key Patterns

**Wallet Backend Pattern**: Each wallet backend lives in `src/wallets/{name}/` with:
- `types.ts` - Type definitions
- `service.ts` - API client implementation
- `tools.ts` - MCP tool registrations via `register{Name}Tools(server)`

**Transaction InitiationVia**: Discriminated union with three types:
- `lightning` (paymentHash)
- `onchain` (address)
- `intraledger` (counterPartyUsername)

**Currency Units**: BTC amounts in satoshis, USD amounts in cents.

**Server Modes**:
- HTTP mode (no `MCP_DOMAIN`): Simple Express server on `MCP_PORT`
- HTTPS mode (with `MCP_DOMAIN`): greenlock-express handles Let's Encrypt certificates

### MCP Tools

| Tool | Description |
|------|-------------|
| `blink_get_account` | Get wallet IDs and balances |
| `blink_get_transactions` | Get paginated transaction history (params: walletId, first?, after?) |
| `blink_get_webhooks` | List webhook endpoints |

### Endpoints

- `POST /mcp` - MCP endpoint (authenticated via `x-api-key` header if `MCP_API_KEY` set)
- `GET /health` - Health check (no auth)

## Configuration

Required environment variables for Blink:
- `BLINK_API_KEY` - Must start with `blink_` (from dashboard.blink.sv)
- `BLINK_ENDPOINT` - Defaults to `https://api.blink.sv/graphql`

MCP server:
- `MCP_PORT` - HTTP port (default: 3000)
- `MCP_API_KEY` - Optional authentication key

See `.env.example` for full configuration including HTTPS/Let's Encrypt options.
