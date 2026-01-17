# Blink API Reference

Blink is a Bitcoin and Lightning payment platform that enables sending and receiving payments in BTC or USD (via Stablesats synthetic dollars).

## Quick Setup

### 1. Create a Blink Account

1. Go to [dashboard.blink.sv](https://dashboard.blink.sv)
2. Register with your phone number
3. Complete verification if required

### 2. Generate an API Key

1. Log in to [dashboard.blink.sv](https://dashboard.blink.sv)
2. Navigate to **"API Keys"** in the left menu
3. Click the **`+`** button to create a new key
4. Select the appropriate scopes:
   - **Read** - For viewing balances and transactions (minimum required)
   - **Receive** - For creating invoices and addresses
   - **Write** - For sending payments
5. Click **"Create"** and copy your API key
6. **Important:** Save the key securely - it starts with `blink_` and cannot be retrieved later

### 3. Configure Environment

Add to your `.env` file:

```bash
# Required
BLINK_API_KEY="blink_xxxxxxxxxxxxxxxx"

# Optional - defaults to mainnet
BLINK_ENDPOINT="https://api.blink.sv/graphql"
```

Or run `bin/setup.sh` which will prompt for these values.

### 4. Test the Connection

Start the MCP server and use the `blink_get_account` tool to verify your setup:

```bash
npm run dev
```

## API Overview

| Type | Endpoint |
|------|----------|
| **GraphQL (Mainnet)** | `https://api.blink.sv/graphql` |
| **GraphQL (Staging)** | `https://api.staging.blink.sv/graphql` |
| **WebSocket** | `wss://ws.blink.sv/graphql` |
| **OAuth2 Auth** | `https://oauth.blink.sv/oauth2/auth` |
| **OAuth2 Token** | `https://oauth.blink.sv/oauth2/token` |

## Authentication

### API Key Authentication

All requests require the `X-API-KEY` header:

```
X-API-KEY: blink_xxxxxxxxxxxxxxxx
```

### OAuth2 Authentication

For third-party applications, Blink supports OAuth2 (via Ory Hydra):

1. Register your app at [chat.blink.sv](https://chat.blink.sv) to get client credentials
2. Redirect users to authorization endpoint
3. Exchange authorization code for access token
4. Use `Oauth2-Token: ory_at_...` header for requests

Available OAuth2 scopes: `read`, `receive`, `write`, `offline` (for refresh tokens)

### API Key Scopes

| Scope | Permissions |
|-------|-------------|
| **Read** | Query user info, wallet balances, transaction history |
| **Receive** | Create invoices and generate onchain addresses |
| **Write** | Send payments and modify user data |

### Staging Environment

For testing without real funds:

1. Contact Blink support at [chat.blink.sv](https://chat.blink.sv) (Mattermost) to request staging access
2. Register at [dashboard.staging.blink.sv](https://dashboard.staging.blink.sv)
3. Set `BLINK_ENDPOINT="https://api.staging.blink.sv/graphql"` in your `.env`

## Wallets

Each Blink account has two wallets:

| Wallet | Currency | Unit | Description |
|--------|----------|------|-------------|
| BTC Wallet | Bitcoin | Satoshis | Standard Bitcoin balance |
| USD Wallet | Stablesats | Cents | Synthetic USD pegged to dollar value |

## Payment Methods

### Lightning Network
- Create invoices (BTC or USD denominated)
- Pay BOLT11 invoices
- Send to Lightning addresses (e.g., `user@blink.sv`)
- Send via LNURL

### Onchain Bitcoin
- Generate receiving addresses
- Send to Bitcoin addresses
- Fee estimation before sending

### Intraledger
- Zero-fee transfers between Blink users

## Real-Time Notifications

### Webhooks (via Svix)

Register webhook endpoints to receive payment notifications:

| Event Type | Description |
|------------|-------------|
| `send.lightning` | Outgoing Lightning payment |
| `receive.lightning` | Incoming Lightning payment |
| `send.intraledger` | Outgoing intraledger transfer |
| `receive.intraledger` | Incoming intraledger transfer |
| `send.onchain` | Outgoing onchain transaction |
| `receive.onchain` | Incoming onchain transaction |

Webhook payload includes: `accountId`, `walletId`, `eventType`, and full `transaction` object.

Failed deliveries use exponential backoff for retries. Test webhooks at [play.svix.com](https://play.svix.com).

### WebSocket Subscriptions

Connect to `wss://ws.blink.sv/graphql` for real-time updates:

```json
{
  "type": "connection_init",
  "payload": {
    "X-API-KEY": "blink_your_api_key_here"
  }
}
```

Required header: `Sec-WebSocket-Protocol: graphql-transport-ws`

Available subscriptions:
- `myUpdates` - Account activity
- `lnInvoicePaymentStatus` - Invoice payment status
- `realtimePrice` - Real-time BTC price
- `price` - Price updates

## Error Handling

GraphQL returns HTTP 200 even for errors. Check the `errors` array in responses:

```json
{
  "data": { ... },
  "errors": [{ "message": "Error description" }]
}
```

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Success (check `errors` array for partial failures) |
| 400 | Malformed GraphQL request |
| 401 | Invalid authentication token |
| 429 | Rate limited |
| 500 | Server error |

## Rate Limits and Fees

- **Intraledger**: Zero fees
- **Lightning (outgoing)**: ~0.02% routing fee
- **Onchain (incoming)**: 0% for deposits over 1M sats
- **No minimum transaction amounts**

## Resources

- [Developer Documentation](https://dev.blink.sv/)
- [Dashboard](https://dashboard.blink.sv)
- [GraphQL Playground](https://api.blink.sv/graphql)
- [Full API Reference](https://dev.blink.sv/public-api-reference.html)
- [LLM-Optimized API Schema](https://dev.blink.sv/reference/graphql-api-for-llm.json)
- [Postman Collection](https://dev.blink.sv/api/postman)
- [Community Chat (Mattermost)](https://chat.blink.sv)
- [GitHub](https://github.com/blinkbitcoin)
