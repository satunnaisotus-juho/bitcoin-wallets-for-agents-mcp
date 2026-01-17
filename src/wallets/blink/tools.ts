import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createBlinkService } from "./service.js";
import { getBlinkConfig } from "../../config/index.js";

export function registerBlinkTools(server: McpServer): void {
  // blink_get_account - Get wallet IDs and balances
  server.tool(
    "blink_get_account",
    "Get Blink account info including wallet IDs and balances (BTC in satoshis, USD in cents)",
    {},
    async () => {
      console.log(`[${new Date().toISOString()}] Tool called: blink_get_account`);

      const config = getBlinkConfig();
      const blinkService = createBlinkService(config);
      const account = await blinkService.getAccount();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, account }),
          },
        ],
      };
    }
  );

  // blink_get_transactions - Get transaction history with pagination
  server.tool(
    "blink_get_transactions",
    "Get transaction history for a Blink wallet with pagination",
    {
      walletId: z.string().describe("Wallet ID to get transactions for"),
      first: z.number().optional().describe("Number of transactions to return (default: 20)"),
      after: z.string().optional().describe("Cursor for pagination (from previous pageInfo.endCursor)"),
    },
    async ({ walletId, first, after }) => {
      console.log(`[${new Date().toISOString()}] Tool called: blink_get_transactions (walletId: ${walletId})`);

      const config = getBlinkConfig();
      const blinkService = createBlinkService(config);
      const result = await blinkService.getTransactions(walletId, first ?? 20, after);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, ...result }),
          },
        ],
      };
    }
  );

  // blink_get_webhooks - List registered webhooks
  server.tool(
    "blink_get_webhooks",
    "List all registered Blink webhook endpoints",
    {},
    async () => {
      console.log(`[${new Date().toISOString()}] Tool called: blink_get_webhooks`);

      const config = getBlinkConfig();
      const blinkService = createBlinkService(config);
      const webhooks = await blinkService.getWebhooks();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, webhooks }),
          },
        ],
      };
    }
  );

  // blink_create_btc_invoice - Create Lightning invoice to receive BTC
  server.tool(
    "blink_create_btc_invoice",
    "Create a Lightning invoice to receive BTC payments",
    {
      walletId: z.string().describe("BTC wallet ID to receive payment"),
      amount: z.number().positive().describe("Amount in satoshis"),
      memo: z.string().optional().describe("Optional invoice description/memo"),
    },
    async ({ walletId, amount, memo }) => {
      console.log(`[${new Date().toISOString()}] Tool called: blink_create_btc_invoice (walletId: ${walletId}, amount: ${amount})`);

      const config = getBlinkConfig();
      const blinkService = createBlinkService(config);
      const invoice = await blinkService.createBtcInvoice(walletId, amount, memo);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, invoice }),
          },
        ],
      };
    }
  );

  // blink_pay_invoice - Pay a BOLT11 Lightning invoice
  server.tool(
    "blink_pay_invoice",
    "Pay a BOLT11 Lightning invoice from your wallet. Returns status: SUCCESS, PENDING, ALREADY_PAID, or FAILURE",
    {
      walletId: z.string().describe("Wallet ID to pay from"),
      paymentRequest: z.string().describe("BOLT11 Lightning invoice (starts with lnbc...)"),
      memo: z.string().optional().describe("Optional payment memo/note"),
    },
    async ({ walletId, paymentRequest, memo }) => {
      console.log(`[${new Date().toISOString()}] Tool called: blink_pay_invoice (walletId: ${walletId})`);

      const config = getBlinkConfig();
      const blinkService = createBlinkService(config);
      const result = await blinkService.payInvoice(walletId, paymentRequest, memo);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, ...result }),
          },
        ],
      };
    }
  );

  // blink_send_to_lnaddress - Send to a Lightning address
  server.tool(
    "blink_send_to_lnaddress",
    "Send satoshis to a Lightning address (e.g., user@blink.sv). Returns status: SUCCESS, PENDING, or FAILURE",
    {
      walletId: z.string().describe("Wallet ID to send from"),
      lnAddress: z.string().describe("Lightning address (e.g., user@blink.sv)"),
      amount: z.number().positive().describe("Amount in satoshis"),
      memo: z.string().optional().describe("Optional payment memo/note"),
    },
    async ({ walletId, lnAddress, amount, memo }) => {
      console.log(`[${new Date().toISOString()}] Tool called: blink_send_to_lnaddress (walletId: ${walletId}, lnAddress: ${lnAddress}, amount: ${amount})`);

      const config = getBlinkConfig();
      const blinkService = createBlinkService(config);
      const result = await blinkService.sendToLnAddress(walletId, lnAddress, amount, memo);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, ...result }),
          },
        ],
      };
    }
  );

  // blink_send_to_lnurl - Send via LNURL
  server.tool(
    "blink_send_to_lnurl",
    "Send satoshis via LNURL payRequest. Returns status: SUCCESS, PENDING, or FAILURE",
    {
      walletId: z.string().describe("Wallet ID to send from"),
      lnurl: z.string().describe("LNURL payRequest string (starts with LNURL1...)"),
      amount: z.number().positive().describe("Amount in satoshis"),
    },
    async ({ walletId, lnurl, amount }) => {
      console.log(`[${new Date().toISOString()}] Tool called: blink_send_to_lnurl (walletId: ${walletId}, amount: ${amount})`);

      const config = getBlinkConfig();
      const blinkService = createBlinkService(config);
      const result = await blinkService.sendToLnurl(walletId, lnurl, amount);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, ...result }),
          },
        ],
      };
    }
  );
}
