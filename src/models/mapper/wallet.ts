import { Wallet, WalletResponse } from "../../types/types";

export const toWalletResponse = (w: Wallet): WalletResponse => ({
  walletId: w.walletId,
  contactId: w.contactId,
  name: w.name,
  receivingAddress: w.receivingAddress,
  addressStatus: w.addressStatus,
  balance: w.balance,
  confirmedBalance: w.confirmedBalance,
  spendableBalance: w.spendableBalance,
  updatedAt: w.updatedAt,
  createdDate: w.createdDate,
  currency: w.currency,
  coinChain: w.coinChain,
  disabledActions: w.disabledActions,
  currencyName: w.currencyName,
  type: w.type,
});

export const toWalletListResponse = (ws: Wallet[]): WalletResponse[] => {
  return ws.map(toWalletResponse);
};
