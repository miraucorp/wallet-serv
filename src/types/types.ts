import { AxiosInstance } from "axios";
import { Context, Response } from "koa";

export interface AppCtx {
  API: AxiosInstance;
  traced: any;
  log: any;
}

/**
 * Enhanced koa.Context by au_helpers
 */
export interface AuContext extends Context {
  response: {
    ok: any;
    forbidden: any;
    badRequest: any;
  } & Response;
}

/**
 * The BitGo wallet response data
 */
export type BitGoWallet = {
  id: string;
  name: string;
  address: string;
  currency: string;
  keys: string[];
  isCold: boolean;
  balance: number;
  confirmedBalance: number;
  spendableBalance: number;
  walletVersion: string;
  tokens?: Record<
    string,
    {
      balance: number;
      confirmedBalance: number;
      spendableBalance: number;
    }
  >;
};

export const enum Provider {
  BITGO = "BITGO",
  CHAINIFY = "CHAINIFY",
}

export const enum CoinChain {
  ERC20 = "ERC20",
  TRC20 = "TRC20",
}

export const enum WalletType {
  LEDGER = "LEDGER",
  ONCHAIN = "ONCHAIN",
}

/**
 * The main wallet model saved in DB and CRM
 */
export type Wallet = {
  walletId: string;
  externalWalletId: string;
  contactId: string;
  name: string;
  receivingAddress: string;
  addressStatus?: string;
  balance: number | string;
  confirmedBalance: number | string;
  spendableBalance: number | string;
  updatedAt: number;
  createdDate?: string;
  currency: string;
  provider: Provider;
  isCold?: boolean;
  walletVersion?: string; // only for BitGo
  coinChain?: CoinChain;
  disabledActions?: Record<string, boolean>;
  currencyName?: string;
  type?: WalletType; // defaults to onchain
  keys?: string[];
};

export type WalletResponse = {
  walletId: string;
  contactId: string;
  name: string;
  receivingAddress: string;
  addressStatus?: string;
  balance: string | number;
  confirmedBalance: string | number;
  spendableBalance: string | number;
  updatedAt: number;
  createdDate?: string;
  currency: string;
  coinChain?: string;
  disabledActions?: Record<string, boolean>;
  currencyName: string;
  type?: WalletType; // defaults to onchain
};

export type AvailableCurrencies = {
  enabled: string[];
  disabled: string[];
  props: Record<string, { setupFee: number; setupFeeCurrency: string }>;
};

export type CreateWalletRequest = {
  name: string; // The name of the wallet
  currency: string; // The currency of the wallet
  feeAccountId?: string; // The customer's fee account id to collect the wallet creation fee from
  skipFee?: boolean; // Wheather to skip the fee (in case of manual creation)
  walletVersion?: number; // The bitgo's ETH contract version, only applicable to BitGo ETH (0 or 1)
};

export interface WalletProvider {
  createWallet(appCtx: AppCtx, contactId: string, walletId: string, data: CreateWalletRequest): Promise<Wallet>;
  finishWalletCreation(appCtx: AppCtx, currency: string, walletId: string, contactId: string): Promise<void>;
}

export type UnsetCurrency = {
  currency: string;
  setupFee?: number;
  setupFeeCurrency?: string;
  type?: WalletType;
  coinChain?: CoinChain;
};
