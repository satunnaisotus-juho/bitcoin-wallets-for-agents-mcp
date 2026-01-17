# Blink GraphQL Mutations

> **Note:** These mutations are documented for reference. Phase 1 implements read-only operations.

## Lightning - Receive

### Create BTC Invoice

Generate a Lightning invoice to receive satoshis.

```graphql
mutation LnInvoiceCreate($input: LnInvoiceCreateInput!) {
  lnInvoiceCreate(input: $input) {
    invoice {
      paymentRequest
      paymentHash
      paymentSecret
      satoshis
    }
    errors {
      message
      path
      code
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "walletId": "btc-wallet-id",
    "amount": 10000,
    "memo": "Payment for services"
  }
}
```

### Create USD Invoice

Generate a Lightning invoice to receive USD (Stablesats). The satoshi amount reflects the current USD/BTC exchange rate.

```graphql
mutation LnUsdInvoiceCreate($input: LnUsdInvoiceCreateInput!) {
  lnUsdInvoiceCreate(input: $input) {
    invoice {
      paymentRequest
      paymentHash
      paymentSecret
      satoshis
    }
    errors {
      message
      path
      code
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "walletId": "usd-wallet-id",
    "amount": 1000,
    "memo": "Payment for $10"
  }
}
```

**Note:** Amount is in **cents**. The invoice's satoshi amount dynamically reflects the exchange rate.

## Lightning - Send

### Pay BOLT11 Invoice

Pay a Lightning invoice from your wallet.

```graphql
mutation LnInvoicePaymentSend($input: LnInvoicePaymentInput!) {
  lnInvoicePaymentSend(input: $input) {
    status
    errors {
      message
      path
      code
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "paymentRequest": "lnbc10u1p...",
    "walletId": "wallet-id",
    "memo": "Payment note"
  }
}
```

**Status Values:**
- `SUCCESS` - Payment completed
- `PENDING` - Payment in progress
- `ALREADY_PAID` - Invoice was already paid
- `FAILURE` - Payment failed

### Send to Lightning Address

Send sats to a Lightning address (e.g., `user@blink.sv`).

```graphql
mutation LnAddressPaymentSend($input: LnAddressPaymentSendInput!) {
  lnAddressPaymentSend(input: $input) {
    status
    errors {
      message
      path
      code
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "lnAddress": "user@blink.sv",
    "amount": 1000,
    "walletId": "wallet-id",
    "memo": "Tip"
  }
}
```

### Send via LNURL

Send sats to a static LNURL payRequest.

```graphql
mutation LnurlPaymentSend($input: LnurlPaymentSendInput!) {
  lnurlPaymentSend(input: $input) {
    status
    errors {
      message
      path
      code
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "lnurl": "LNURL1DP68...",
    "amount": 1000,
    "walletId": "wallet-id"
  }
}
```

## Onchain - Receive

### Generate BTC Receiving Address

Create a new Bitcoin address for receiving onchain payments to your BTC wallet.

```graphql
mutation OnChainAddressCreate($input: OnChainAddressCreateInput!) {
  onChainAddressCreate(input: $input) {
    address
    errors {
      message
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "walletId": "btc-wallet-id"
  }
}
```

### Generate USD Receiving Address

Create an address that converts incoming BTC to USD at the current exchange rate.

```graphql
mutation OnChainAddressCreate($input: OnChainAddressCreateInput!) {
  onChainAddressCreate(input: $input) {
    address
    errors {
      message
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "walletId": "usd-wallet-id"
  }
}
```

## Onchain - Send

### Send BTC Onchain

Send Bitcoin to an onchain address from your BTC wallet.

```graphql
mutation OnChainPaymentSend($input: OnChainPaymentSendInput!) {
  onChainPaymentSend(input: $input) {
    status
    errors {
      message
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "walletId": "btc-wallet-id",
    "address": "bc1q...",
    "amount": 100000,
    "memo": "Withdrawal"
  }
}
```

### Send USD Onchain (USD-denominated)

Send from USD wallet with amount specified in cents.

```graphql
mutation OnChainUsdPaymentSend($input: OnChainUsdPaymentSendInput!) {
  onChainUsdPaymentSend(input: $input) {
    status
    errors {
      message
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "walletId": "usd-wallet-id",
    "address": "bc1q...",
    "amount": 1000,
    "memo": "Send $10"
  }
}
```

### Send USD Onchain (BTC-denominated)

Send from USD wallet but specify amount in satoshis.

```graphql
mutation OnChainUsdPaymentSendAsBtcDenominated($input: OnChainUsdPaymentSendAsBtcDenominatedInput!) {
  onChainUsdPaymentSendAsBtcDenominated(input: $input) {
    status
    errors {
      message
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "walletId": "usd-wallet-id",
    "address": "bc1q...",
    "amount": 50000,
    "memo": "Send 50k sats from USD wallet"
  }
}
```

## Webhooks

### Add Webhook Endpoint

Register a URL to receive payment notifications.

```graphql
mutation CallbackEndpointAdd($input: CallbackEndpointAddInput!) {
  callbackEndpointAdd(input: $input) {
    id
    url
    errors {
      message
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "url": "https://example.com/webhook"
  }
}
```

### Remove Webhook Endpoint

Unregister a webhook endpoint.

```graphql
mutation CallbackEndpointDelete($input: CallbackEndpointDeleteInput!) {
  callbackEndpointDelete(input: $input) {
    success
    errors {
      message
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "endpoint-123"
  }
}
```

## Webhook Events

When an event occurs, Blink sends a JSON payload via Svix:

```json
{
  "accountId": "account-123",
  "walletId": "wallet-456",
  "eventType": "receive.lightning",
  "transaction": {
    "id": "txn-789",
    "status": "SUCCESS",
    "createdAt": "2024-01-15T10:30:00Z",
    "settlementAmount": 10000,
    "settlementCurrency": "BTC",
    "settlementFee": 0,
    "settlementDisplayAmount": "10,000 sats",
    "memo": "Payment received",
    "initiationVia": {
      "paymentHash": "abc123...",
      "pubkey": "...",
      "type": "lightning"
    }
  }
}
```

**Event Types:**
- `send.lightning` / `receive.lightning`
- `send.intraledger` / `receive.intraledger`
- `send.onchain` / `receive.onchain`

**Requirements:**
- Endpoint must return 2xx status code promptly
- Failed deliveries retry with exponential backoff
- Test at [play.svix.com](https://play.svix.com)

## Error Response Format

All mutations may return errors in this format:

```json
{
  "data": {
    "mutationName": {
      "errors": [
        {
          "message": "Error description",
          "path": ["field", "path"],
          "code": "ERROR_CODE"
        }
      ]
    }
  }
}
```

Common error scenarios:
- Insufficient balance
- Invalid address/invoice
- Rate limiting
- Network issues
