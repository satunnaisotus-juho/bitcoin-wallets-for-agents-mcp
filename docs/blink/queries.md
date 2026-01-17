# Blink GraphQL Queries

## Account & Wallets

### Get Account Info

Returns wallet IDs, currencies, and balances.

```graphql
query Me {
  me {
    defaultAccount {
      defaultWalletId
      wallets {
        id
        walletCurrency
        balance
        pendingIncomingBalance
      }
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "me": {
      "defaultAccount": {
        "defaultWalletId": "abc123",
        "wallets": [
          {
            "id": "abc123",
            "walletCurrency": "BTC",
            "balance": 100000,
            "pendingIncomingBalance": 0
          },
          {
            "id": "def456",
            "walletCurrency": "USD",
            "balance": 5000,
            "pendingIncomingBalance": 0
          }
        ]
      }
    }
  }
}
```

**Notes:**
- BTC balance is in **satoshis**
- USD balance is in **cents**
- `pendingIncomingBalance` shows unconfirmed onchain deposits

## Transaction History

### Get Transactions (Paginated)

Uses cursor-based pagination to fetch transaction history.

```graphql
query TransactionsByWalletId(
  $walletId: WalletId!
  $first: Int
  $after: String
) {
  me {
    defaultAccount {
      walletById(walletId: $walletId) {
        transactions(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              status
              direction
              memo
              createdAt
              settlementAmount
              settlementCurrency
              settlementDisplayAmount
              initiationVia {
                ... on InitiationViaLn {
                  paymentHash
                }
                ... on InitiationViaOnChain {
                  address
                }
                ... on InitiationViaIntraLedger {
                  counterPartyUsername
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Variables:**
```json
{
  "walletId": "abc123",
  "first": 20,
  "after": null
}
```

**Pagination:**
1. First request: `after: null`
2. Next page: use `endCursor` as `after` value
3. Continue until `hasNextPage` is `false`

### Get Transactions with Proof of Payment

For Lightning payments, retrieve proof elements:

```graphql
query PaymentsWithProof($walletId: WalletId!, $first: Int) {
  me {
    defaultAccount {
      walletById(walletId: $walletId) {
        transactions(first: $first) {
          edges {
            node {
              initiationVia {
                ... on InitiationViaLn {
                  paymentRequest
                  paymentHash
                  preImage
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Verify proof:** The `paymentHash` is the SHA256 hash of the `preImage`:
```bash
echo -n '<preimage_in_hex>' | xxd -r -p | sha256sum
```

## Webhooks

### List Webhook Endpoints

```graphql
query CallbackEndpoints {
  me {
    defaultAccount {
      callbackEndpoints {
        id
        url
      }
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "me": {
      "defaultAccount": {
        "callbackEndpoints": [
          {
            "id": "endpoint-123",
            "url": "https://example.com/webhook"
          }
        ]
      }
    }
  }
}
```

## Fee Estimation

### Lightning Fee Probe

Estimate the fee for paying a Lightning invoice.

```graphql
mutation LnInvoiceFeeProbe($input: LnInvoiceFeeProbeInput!) {
  lnInvoiceFeeProbe(input: $input) {
    errors {
      message
    }
    amount
  }
}
```

**Variables:**
```json
{
  "input": {
    "paymentRequest": "lnbc...",
    "walletId": "abc123"
  }
}
```

### Onchain Fee Estimate (BTC)

```graphql
query OnChainTxFee(
  $walletId: WalletId!
  $address: OnChainAddress!
  $amount: SatAmount!
) {
  onChainTxFee(
    walletId: $walletId
    address: $address
    amount: $amount
  ) {
    amount
  }
}
```

**Variables:**
```json
{
  "walletId": "abc123",
  "address": "bc1q...",
  "amount": 100000
}
```

### Onchain Fee Estimate (USD)

```graphql
query OnChainUsdTxFee(
  $walletId: WalletId!
  $address: OnChainAddress!
  $amount: CentAmount!
) {
  onChainUsdTxFee(
    walletId: $walletId
    address: $address
    amount: $amount
  ) {
    amount
  }
}
```

## Price Queries

### Get Current BTC Price

```graphql
query RealtimePrice {
  realtimePrice {
    btcSatPrice {
      base
      offset
    }
    usdCentPrice {
      base
      offset
    }
  }
}
```

## WebSocket Subscriptions

### Invoice Payment Status

Subscribe to payment status updates for a specific invoice:

```graphql
subscription LnInvoicePaymentStatus($input: LnInvoicePaymentStatusInput!) {
  lnInvoicePaymentStatus(input: $input) {
    status
    errors {
      message
    }
  }
}
```

### Account Updates

Subscribe to all account activity:

```graphql
subscription MyUpdates {
  myUpdates {
    ... on LnUpdate {
      paymentHash
      status
    }
    ... on OnChainUpdate {
      txHash
      status
    }
    ... on IntraLedgerUpdate {
      txId
      status
    }
  }
}
```

## Example: cURL Request

```bash
curl -X POST https://api.blink.sv/graphql \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: blink_xxxxxxxx" \
  -d '{
    "query": "query Me { me { defaultAccount { wallets { id walletCurrency balance } } } }"
  }'
```

## Example: WebSocket Connection

Using `websocat`:

```bash
websocat -H "Sec-WebSocket-Protocol: graphql-transport-ws" \
  wss://ws.blink.sv/graphql
```

Then send:
```json
{"type": "connection_init", "payload": {"X-API-KEY": "blink_xxx"}}
```
