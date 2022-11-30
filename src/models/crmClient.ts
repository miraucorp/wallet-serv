import { AppCtx, Wallet } from "../types/types";

import * as variables from "../variables";

export const getWalletByCurrency = async (appCtx: AppCtx, currency: string, contactId: string) => {
  return appCtx.API.get(`${variables.bcCRMAdapter}/bitgo/wallet/${currency}/${contactId}`, {
    headers: {
      "Content-Type": "application/json",
    },
  }).then((response) => response.data.data);
};

export const createCrmWallet = async (appCtx: AppCtx, wallet: Wallet) => {
  return appCtx.API.post(`${variables.bcCRMAdapter}/bitgo/wallets/${wallet.walletId}`, toCrmWallet(wallet), {
    headers: {
      "Content-Type": "application/json",
    },
  }).then((response) => response.data.data);
};

function toCrmWallet(w: Wallet): CrmWalletUpdateReq {
  return {
    walletId: w.walletId,
    externalWalletId: w.externalWalletId,
    contactId: w.contactId,
    currency: w.currency,
    name: w.name,
    cold: w.isCold,
    balance: w.balance,
    confirmedBalance: w.confirmedBalance,
    spendableBalance: w.spendableBalance,
    receivingAddress: w.receivingAddress,
    keys: w.keys,
  };
}

type CrmWalletUpdateReq = {
  walletId: string;
  externalWalletId: string;
  contactId: string;
  currency: string;
  name: string;
  cold: boolean;
  balance: string | number;
  confirmedBalance: string | number;
  spendableBalance: string | number;
  receivingAddress: string;
  keys: string[];
};
