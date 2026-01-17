# bitcoin-wallets-for-agents-mcp

MCP server exposing Bitcoin wallet operations for AI agents. Supports the Blink (https://www.blink.sv/) wallet. Offers an extendable framework.

## Requirements

- Node.js 18+
- npm

### Ubuntu 24.04 LTS

```bash
sudo apt update
sudo apt install -y git curl nodejs npm
```

## Installation

```bash
git clone https://github.com/satunnaisotus-juho/bitcoin-wallets-for-agents-mcp.git
cd bitcoin-wallets-for-agents-mcp
./bin/setup.sh
```

The setup script will:
1. Install npm dependencies
2. Prompt for configuration values
3. Create `.env` file
4. Configure Let's Encrypt (if HTTPS enabled)

## Configuration

Configuration is stored in `.env` (see `.env.example`).

**MCP Server:**
- `MCP_PORT` - HTTP port (default: 3000)
- `MCP_API_KEY` - API key for authentication (optional)
- `MCP_DOMAIN` - Domain for HTTPS (optional, enables Let's Encrypt)
- `MCP_ACME_EMAIL` - Email for Let's Encrypt (required when MCP_DOMAIN is set)
- `MCP_HTTPS_PORT` - HTTPS port (default: 443)
- `MCP_ACME_STAGING` - Use Let's Encrypt staging (default: false)

**Blink Wallet:**
- `BLINK_API_KEY` - Blink API key (format: blink_xxx, get from dashboard.blink.sv)
- `BLINK_ENDPOINT` - Blink GraphQL endpoint (default: https://api.blink.sv/graphql)

## Usage

```bash
# Start server (development)
npm run dev

# Start server (production)
npm run start

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `blink_get_account` | Get Blink wallet IDs and balances (BTC in satoshis, USD in cents) |
| `blink_get_transactions` | Get transaction history with pagination |
| `blink_get_webhooks` | List registered webhook endpoints |
| `blink_create_btc_invoice` | Create Lightning invoice to receive BTC (amount in satoshis) |
| `blink_pay_invoice` | Pay a BOLT11 Lightning invoice |
| `blink_send_to_lnaddress` | Send sats to a Lightning address (e.g., user@blink.sv) |
| `blink_send_to_lnurl` | Send sats via LNURL payRequest |

## Claude Code Configuration

To use this MCP server with Claude Code, create a `.mcp.json` file in your project directory.

**Local development without authentication:**
```json
{
  "mcpServers": {
    "bitcoin-wallet": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**Production with authentication:**
```json
{
  "mcpServers": {
    "bitcoin-wallet": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "x-api-key": "your-secret-key"
      }
    }
  }
}
```

## HTTP vs HTTPS Mode

**HTTP Mode (Local Development):**
```bash
MCP_PORT=3000
npm run dev
```

**HTTPS Mode (Production):**
```bash
MCP_DOMAIN=mcp.example.com
MCP_ACME_EMAIL=admin@example.com
MCP_API_KEY=your-secret-key
npm run dev
```

Requirements for HTTPS:
- Port 80 accessible (ACME HTTP-01 challenge)
- Port 443 accessible (HTTPS)
- Domain pointing to server

## Adding New Wallet Backends

The architecture supports adding more wallets. Create a new directory under `src/wallets/` with:
- `types.ts` - Type definitions for the wallet
- `service.ts` - Service implementation
- `tools.ts` - MCP tool registrations

Then import and register the tools in `src/index.ts`.

## Development

```bash
npm run dev        # Run with hot reload
npm run build      # Build for production
npm run typecheck  # Type-check without emitting
npm run lint       # Lint code
```
