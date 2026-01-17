import type {
  BlinkConfig,
  BlinkAccount,
  BlinkWallet,
  BlinkTransaction,
  BlinkWebhook,
  TransactionConnection,
  TransactionPageInfo,
  IBlinkService,
  InitiationVia,
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
}

export function createBlinkService(config: BlinkConfig): IBlinkService {
  return new BlinkService(config);
}
