import type {
  BlinkConfig,
  BlinkAccount,
  BlinkWallet,
  BlinkTransaction,
  BlinkWebhook,
  BlinkInvoice,
  TransactionConnection,
  TransactionPageInfo,
  IBlinkService,
  InitiationVia,
  PaymentResult,
  PaymentStatus,
} from "./types.js";

export class BlinkServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "BlinkServiceError";
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
}

const ME_QUERY = `
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
`;

const TRANSACTIONS_QUERY = `
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
`;

const WEBHOOKS_QUERY = `
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
`;

const LN_INVOICE_CREATE_MUTATION = `
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
      }
    }
  }
`;

const LN_INVOICE_PAYMENT_SEND_MUTATION = `
  mutation LnInvoicePaymentSend($input: LnInvoicePaymentInput!) {
    lnInvoicePaymentSend(input: $input) {
      status
      errors {
        message
      }
    }
  }
`;

const LN_ADDRESS_PAYMENT_SEND_MUTATION = `
  mutation LnAddressPaymentSend($input: LnAddressPaymentSendInput!) {
    lnAddressPaymentSend(input: $input) {
      status
      errors {
        message
      }
    }
  }
`;

const LNURL_PAYMENT_SEND_MUTATION = `
  mutation LnurlPaymentSend($input: LnurlPaymentSendInput!) {
    lnurlPaymentSend(input: $input) {
      status
      errors {
        message
      }
    }
  }
`;

export class BlinkService implements IBlinkService {
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(config: BlinkConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
  }

  private async graphql<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new BlinkServiceError(
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join("; ");
      throw new BlinkServiceError(`Blink API error: ${errorMessages}`);
    }

    if (!result.data) {
      throw new BlinkServiceError("Unexpected response format from Blink API");
    }

    return result.data;
  }

  async getAccount(): Promise<BlinkAccount> {
    try {
      interface MeResponse {
        me: {
          defaultAccount: {
            defaultWalletId: string;
            wallets: Array<{
              id: string;
              walletCurrency: "BTC" | "USD";
              balance: number;
              pendingIncomingBalance: number;
            }>;
          };
        };
      }

      const data = await this.graphql<MeResponse>(ME_QUERY);

      const account = data.me.defaultAccount;
      const wallets: BlinkWallet[] = account.wallets.map((w) => ({
        id: w.id,
        walletCurrency: w.walletCurrency,
        balance: w.balance,
        pendingIncomingBalance: w.pendingIncomingBalance,
      }));

      return {
        defaultWalletId: account.defaultWalletId,
        wallets,
      };
    } catch (error) {
      if (error instanceof BlinkServiceError) throw error;
      throw new BlinkServiceError("Failed to get account from Blink", error);
    }
  }

  async getTransactions(
    walletId: string,
    first: number = 20,
    after?: string
  ): Promise<TransactionConnection> {
    try {
      interface TransactionsResponse {
        me: {
          defaultAccount: {
            walletById: {
              transactions: {
                pageInfo: {
                  hasNextPage: boolean;
                  hasPreviousPage: boolean;
                  startCursor: string | null;
                  endCursor: string | null;
                };
                edges: Array<{
                  node: {
                    id: string;
                    status: "SUCCESS" | "PENDING" | "FAILURE";
                    direction: "SEND" | "RECEIVE";
                    memo: string | null;
                    createdAt: string;
                    settlementAmount: number;
                    settlementCurrency: "BTC" | "USD";
                    settlementDisplayAmount: string;
                    initiationVia: {
                      paymentHash?: string;
                      address?: string;
                      counterPartyUsername?: string | null;
                    };
                  };
                }>;
              };
            };
          };
        };
      }

      const data = await this.graphql<TransactionsResponse>(TRANSACTIONS_QUERY, {
        walletId,
        first,
        after: after ?? null,
      });

      const transactionsData = data.me.defaultAccount.walletById.transactions;

      const transactions: BlinkTransaction[] = transactionsData.edges.map(
        (edge) => {
          const node = edge.node;
          let initiationVia: InitiationVia;

          if (node.initiationVia.paymentHash !== undefined) {
            initiationVia = {
              type: "lightning",
              paymentHash: node.initiationVia.paymentHash,
            };
          } else if (node.initiationVia.address !== undefined) {
            initiationVia = {
              type: "onchain",
              address: node.initiationVia.address,
            };
          } else {
            initiationVia = {
              type: "intraledger",
              counterPartyUsername: node.initiationVia.counterPartyUsername ?? null,
            };
          }

          return {
            id: node.id,
            status: node.status,
            direction: node.direction,
            memo: node.memo,
            createdAt: node.createdAt,
            settlementAmount: node.settlementAmount,
            settlementCurrency: node.settlementCurrency,
            settlementDisplayAmount: node.settlementDisplayAmount,
            initiationVia,
          };
        }
      );

      const pageInfo: TransactionPageInfo = {
        hasNextPage: transactionsData.pageInfo.hasNextPage,
        hasPreviousPage: transactionsData.pageInfo.hasPreviousPage,
        startCursor: transactionsData.pageInfo.startCursor,
        endCursor: transactionsData.pageInfo.endCursor,
      };

      return { transactions, pageInfo };
    } catch (error) {
      if (error instanceof BlinkServiceError) throw error;
      throw new BlinkServiceError(
        "Failed to get transactions from Blink",
        error
      );
    }
  }

  async getWebhooks(): Promise<BlinkWebhook[]> {
    try {
      interface WebhooksResponse {
        me: {
          defaultAccount: {
            callbackEndpoints: Array<{
              id: string;
              url: string;
            }>;
          };
        };
      }

      const data = await this.graphql<WebhooksResponse>(WEBHOOKS_QUERY);

      return data.me.defaultAccount.callbackEndpoints.map((endpoint) => ({
        id: endpoint.id,
        url: endpoint.url,
      }));
    } catch (error) {
      if (error instanceof BlinkServiceError) throw error;
      throw new BlinkServiceError("Failed to get webhooks from Blink", error);
    }
  }

  async createBtcInvoice(
    walletId: string,
    amount: number,
    memo?: string
  ): Promise<BlinkInvoice> {
    try {
      interface LnInvoiceCreateResponse {
        lnInvoiceCreate: {
          invoice: {
            paymentRequest: string;
            paymentHash: string;
            paymentSecret: string;
            satoshis: number;
          } | null;
          errors: Array<{ message: string }>;
        };
      }

      const data = await this.graphql<LnInvoiceCreateResponse>(
        LN_INVOICE_CREATE_MUTATION,
        {
          input: {
            walletId,
            amount,
            ...(memo && { memo }),
          },
        }
      );

      const result = data.lnInvoiceCreate;

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.message).join("; ");
        throw new BlinkServiceError(`Invoice creation failed: ${errorMessages}`);
      }

      if (!result.invoice) {
        throw new BlinkServiceError("Invoice creation returned no invoice");
      }

      return {
        paymentRequest: result.invoice.paymentRequest,
        paymentHash: result.invoice.paymentHash,
        paymentSecret: result.invoice.paymentSecret,
        satoshis: result.invoice.satoshis,
      };
    } catch (error) {
      if (error instanceof BlinkServiceError) throw error;
      throw new BlinkServiceError("Failed to create BTC invoice", error);
    }
  }

  async payInvoice(
    walletId: string,
    paymentRequest: string,
    memo?: string
  ): Promise<PaymentResult> {
    try {
      interface LnInvoicePaymentSendResponse {
        lnInvoicePaymentSend: {
          status: PaymentStatus;
          errors: Array<{ message: string }>;
        };
      }

      const data = await this.graphql<LnInvoicePaymentSendResponse>(
        LN_INVOICE_PAYMENT_SEND_MUTATION,
        {
          input: {
            walletId,
            paymentRequest,
            ...(memo && { memo }),
          },
        }
      );

      const result = data.lnInvoicePaymentSend;

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.message).join("; ");
        throw new BlinkServiceError(`Payment failed: ${errorMessages}`);
      }

      return { status: result.status };
    } catch (error) {
      if (error instanceof BlinkServiceError) throw error;
      throw new BlinkServiceError("Failed to pay invoice", error);
    }
  }

  async sendToLnAddress(
    walletId: string,
    lnAddress: string,
    amount: number,
    memo?: string
  ): Promise<PaymentResult> {
    try {
      interface LnAddressPaymentSendResponse {
        lnAddressPaymentSend: {
          status: PaymentStatus;
          errors: Array<{ message: string }>;
        };
      }

      const data = await this.graphql<LnAddressPaymentSendResponse>(
        LN_ADDRESS_PAYMENT_SEND_MUTATION,
        {
          input: {
            walletId,
            lnAddress,
            amount,
            ...(memo && { memo }),
          },
        }
      );

      const result = data.lnAddressPaymentSend;

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.message).join("; ");
        throw new BlinkServiceError(`Payment to Lightning address failed: ${errorMessages}`);
      }

      return { status: result.status };
    } catch (error) {
      if (error instanceof BlinkServiceError) throw error;
      throw new BlinkServiceError("Failed to send to Lightning address", error);
    }
  }

  async sendToLnurl(
    walletId: string,
    lnurl: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      interface LnurlPaymentSendResponse {
        lnurlPaymentSend: {
          status: PaymentStatus;
          errors: Array<{ message: string }>;
        };
      }

      const data = await this.graphql<LnurlPaymentSendResponse>(
        LNURL_PAYMENT_SEND_MUTATION,
        {
          input: {
            walletId,
            lnurl,
            amount,
          },
        }
      );

      const result = data.lnurlPaymentSend;

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.message).join("; ");
        throw new BlinkServiceError(`LNURL payment failed: ${errorMessages}`);
      }

      return { status: result.status };
    } catch (error) {
      if (error instanceof BlinkServiceError) throw error;
      throw new BlinkServiceError("Failed to send via LNURL", error);
    }
  }
}

export function createBlinkService(config: BlinkConfig): IBlinkService {
  return new BlinkService(config);
}
