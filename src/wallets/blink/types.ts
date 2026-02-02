export interface BlinkConfig {
  apiKey: string;
  endpoint: string;
}

export type WalletCurrency = "BTC" | "USD";

export interface BlinkWallet {
  id: string;
  walletCurrency: WalletCurrency;
  balance: number;
  pendingIncomingBalance: number;
}

export interface BlinkAccount {
  defaultWalletId: string;
  wallets: BlinkWallet[];
}

export type TransactionStatus = "SUCCESS" | "PENDING" | "FAILURE";
export type TransactionDirection = "SEND" | "RECEIVE";

export interface InitiationViaLightning {
  type: "lightning";
  paymentHash: string;
}

export interface InitiationViaOnChain {
  type: "onchain";
  address: string;
}

export interface InitiationViaIntraLedger {
  type: "intraledger";
  counterPartyUsername: string | null;
}

export type InitiationVia =
  | InitiationViaLightning
  | InitiationViaOnChain
  | InitiationViaIntraLedger;

export interface BlinkTransaction {
  id: string;
  status: TransactionStatus;
  direction: TransactionDirection;
  memo: string | null;
  createdAt: string;
  settlementAmount: number;
  settlementCurrency: WalletCurrency;
  settlementDisplayAmount: string;
  initiationVia: InitiationVia;
}

export interface TransactionPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface TransactionConnection {
  transactions: BlinkTransaction[];
  pageInfo: TransactionPageInfo;
}

export interface BlinkWebhook {
  id: string;
  url: string;
}

export interface BlinkInvoice {
  paymentRequest: string;
  paymentHash: string;
  paymentSecret: string;
  satoshis: number;
}

export interface BlinkError {
  message: string;
  path?: string[];
  code?: string;
}

export type PaymentStatus = "SUCCESS" | "PENDING" | "ALREADY_PAID" | "FAILURE";

export interface PaymentResult {
  status: PaymentStatus;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface LayerHealth {
  available: boolean;
  error?: string;
}

export interface HealthCheckResult {
  status: HealthStatus;
  layers: {
    lightning: LayerHealth;
    onchain: LayerHealth;
    liquid: LayerHealth;
  };
}

export interface IBlinkService {
  getAccount(): Promise<BlinkAccount>;
  getTransactions(
    walletId: string,
    first?: number,
    after?: string
  ): Promise<TransactionConnection>;
  getWebhooks(): Promise<BlinkWebhook[]>;
  createBtcInvoice(
    walletId: string,
    amount: number,
    memo?: string
  ): Promise<BlinkInvoice>;
  payInvoice(
    walletId: string,
    paymentRequest: string,
    memo?: string
  ): Promise<PaymentResult>;
  sendToLnAddress(
    walletId: string,
    lnAddress: string,
    amount: number,
    memo?: string
  ): Promise<PaymentResult>;
  sendToLnurl(
    walletId: string,
    lnurl: string,
    amount: number
  ): Promise<PaymentResult>;
}
