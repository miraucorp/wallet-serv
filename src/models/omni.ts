import { AppCtx, Provider, UnsetCurrency, Wallet, WalletType } from "../types/types";
import { newErrWithCode } from "../utils/errs";
import { getCurrencyName, bcOmniWalletService } from "../variables";
import variables = require("../variables");

/**
 * Sends a request to get a user wallet in omniwallet
 */
export const getWallet = async (appCtx: AppCtx, { contactId, walletId }: GetWalletRequest): Promise<Wallet> => {
  return appCtx.API.get(`${bcOmniWalletService}/wallets/${walletId}`, { headers: { contactId } }).then((result) => {
    const wallet = mapToClassicalWallet(result.data.data);
    addDisabledActionsData(wallet);
    return wallet;
  });
};

/**
 * Sends a request to get all users wallet in omniwallet
 */
export const getWallets = async (appCtx: AppCtx, { contactId, partnerId }: GetWalletsRequest): Promise<Wallet[]> => {
  return appCtx.API.get(`${bcOmniWalletService}/wallets`, { headers: { contactId, partnerId } }).then((result) =>
    result.data.data.wallets.map((w: WalletResponse) => {
      const wallet = mapToClassicalWallet(w);
      addDisabledActionsData(wallet);
      return wallet;
    })
  );
};

/**
 * Gets the enabled ledger currencies for a partner&contact by retrieving the setup omniwallets for the partner
 */
export const getEnabledCurrencies = async (appCtx: AppCtx, contactId: string, partnerId: string): Promise<string[]> => {
  const omnis: OmniWallet[] = await appCtx.API.get(`${bcOmniWalletService}/admin/omniwallets`, {
    params: { partnerId },
  }).then((result) => result.data.data.omniWallets);

  return omnis
    .map((w) => w.currency)
    .filter((c) => isCurrencyEnabledForContact(contactId, c))
    .filter((c) => !variables.tempDisabledLedgerCreateWalletCurrencies.includes(c));
};

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
function isCurrencyEnabledForContact(contactId: string, currency: string): boolean {
  // code to temporary allow new currencies in ledger only for whitelisted contacts
  // if ("BCH" === currency) {
  //   return variables.whiteListedContacts.includes(contactId);
  // }
  return true;
}

/**
 * Sends a request to create a user wallet in omniwallet
 */
export const createWallet = async (
  appCtx: AppCtx,
  { contactId, partnerId, name, currency }: CreateWalletRequest
): Promise<Wallet> => {
  const enabledCurrencies = await getEnabledCurrencies(appCtx, contactId, partnerId);
  if (!enabledCurrencies.includes(currency)) {
    throw newErrWithCode(`currency ${currency} not supported`, 400);
  }
  return appCtx.API.post(
    `${bcOmniWalletService}/wallets`,
    { label: name, currency },
    { headers: { contactId, partnerId } }
  ).then((result) => mapToClassicalWallet(result.data.data));
};

export const getLedgerUnsetCurrencies = async (
  appCtx: AppCtx,
  partnerId: string,
  contactId: string,
  enabledLedgerCurrencies: string[] = []
): Promise<UnsetCurrency[]> => {
  // filter out already set currencies for customer
  const skip = (await getWallets(appCtx, { contactId, partnerId })).map((w) => w.currency);
  return enabledLedgerCurrencies
    .filter((c) => !skip.includes(c))
    .map((c) => ({
      currency: c,
      type: WalletType.LEDGER,
      coinChain: variables.getCoinChain(c),
    }));
};

type GetWalletRequest = {
  contactId: string;
  walletId: string;
};

type GetWalletsRequest = {
  contactId: string;
  partnerId: string;
};

type WalletResponse = {
  walletId: string;
  contactId: string;
  externalWalletId: string; // do not return for UI
  omniWalletId: string; // do not return for UI
  partnerId: string;
  currentReceiveAddress: string;
  addressStatus?: string;
  balance: string;
  availableBalance: string;
  currency: string;
  type: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  provider: Provider;
};

type CreateWalletRequest = {
  contactId: string;
  partnerId: string;
  name: string;
  currency: string;
};

function mapToClassicalWallet(w: WalletResponse): Wallet {
  const wallet: Wallet = {
    walletId: w.walletId,
    contactId: w.contactId,
    externalWalletId: w.externalWalletId,
    name: w.label,
    receivingAddress: w.currentReceiveAddress,
    type: WalletType.LEDGER,
    currency: w.currency,
    balance: w.balance,
    confirmedBalance: w.availableBalance,
    spendableBalance: w.availableBalance,
    createdDate: w.createdAt,
    updatedAt: Date.parse(w.updatedAt),
    provider: w.provider || Provider.BITGO,
    currencyName: getCurrencyName(w.currency),
    coinChain: variables.getCoinChain(w.currency),
  };
  if (w.addressStatus) {
    wallet.addressStatus = w.addressStatus;
  }
  return wallet;
}

type OmniWallet = {
  omniWalletId: string;
  externalWalletId: string;
  currency: string;
  label: string;
  status: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
  nativeCurrencyOmniWalletId: string;
};

/**
 * Modifies `wallet` adding to it `disabledActions` information:
 * ```
 * {
 *     ...,
 *     disabledActions: { buy: true, sell: true, send: true, receive: true },
 *     ...
 * }
 * ```
 */
function addDisabledActionsData(wallet: Wallet) {
  if (!wallet || !wallet.currency) {
    return;
  }
  const walletCurrency = wallet.currency.toUpperCase();
  wallet.disabledActions = {};

  if (variables.tempDisabledLedgerBuyCurrencies.includes(walletCurrency)) {
    wallet.disabledActions.buy = true;
  }
  if (variables.tempDisabledLedgerSellCurrencies.includes(walletCurrency)) {
    wallet.disabledActions.sell = true;
  }
  if (variables.tempDisabledLedgerSendCurrencies.includes(walletCurrency)) {
    wallet.disabledActions.send = true;
  }
  if (variables.tempDisabledLedgerReceiveCurrencies.includes(walletCurrency)) {
    wallet.disabledActions.receive = true;
    wallet.receivingAddress = ""; // do not show receiving address on receive disabled
  }
}
