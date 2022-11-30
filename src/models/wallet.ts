import * as variables from "../variables";
import * as auHelpers from "au-helpers";
import { v5 as uuidv5 } from "uuid";
import { newErrWithCode, isNumeric } from "../utils/errs";
import * as cryptoServiceModel from "./marketClient";

import * as txFeeModel from "./txfee";
import * as crmModel from "./crmClient";
import { bitgoProvider } from "./bitgoWallet";
import * as ddbModel from "./ddbWallet";
import {
  AppCtx,
  AvailableCurrencies,
  CreateWalletRequest,
  Provider,
  UnsetCurrency,
  Wallet,
  WalletType,
} from "../types/types";
import { eth, getCurrencyName, isEthOrErc20 } from "../variables";

const isNil = auHelpers.objectHelpers.isNil;

/**
 * Creates a wallet for a member
 */
export const createWallet = async (
  appCtx: AppCtx,
  contactId: string,
  partnerId: string,
  data: CreateWalletRequest
): Promise<Wallet> => {
  const availableCurrencies = await getAvailableCurrencies(
    appCtx,
    partnerId,
    contactId,
    !data.skipFee && data.currency === variables.eth
  );
  await validateCreateWallet(appCtx, contactId, data, availableCurrencies);

  const walletId = getWalletId(contactId, data.currency);
  // create DDB wallet preventing race conditions
  await ddbModel.insertWallet(appCtx, {
    walletId,
    contactId,
    name: data.name,
    updatedAt: Date.now(),
    createdDate: new Date().toISOString(),
    currency: data.currency,
    provider: Provider.BITGO,
    currencyName: getCurrencyName(data.currency),
    balance: 0,
    confirmedBalance: 0,
    spendableBalance: 0,
  });

  // charge fee
  if (!data.skipFee && Number(availableCurrencies.props[data.currency].setupFee) > 0) {
    await txFeeModel
      .debitCreationFee(appCtx, contactId, {
        accountId: data.feeAccountId,
        amount: availableCurrencies.props[data.currency].setupFee,
        currencyCode: availableCurrencies.props[data.currency].setupFeeCurrency,
        reference: `WCF - ${data.currency} Wallet Creation Fee`,
        deduplicationId: walletId,
      })
      .catch(async (e) => {
        appCtx.log.error(`failed to charge creation wallet fee ${walletId}`, e);
        await ddbModel.deleteWallet(appCtx, walletId);
        throw e;
      });
  }
  // creates the wallet with the wallet provider
  const wallet = await bitgoProvider.createWallet(appCtx, contactId, walletId, data).catch(async (e) => {
    appCtx.log.error(`failed to create wallet ${walletId} in BitGo`, e);
    await ddbModel.deleteWallet(appCtx, walletId);
    throw e;
  });
  await ddbModel.updateWallet(appCtx, wallet);
  await crmModel.createCrmWallet(appCtx, wallet);
  await bitgoProvider.finishWalletCreation(appCtx, wallet.currency, walletId, contactId);
  return wallet;
};

/**
 * Gets the wallet for a contact
 */
export const getWallet = async (appCtx: AppCtx, contactId: string, walletId: string): Promise<Wallet> => {
  const wallet = await ddbModel.getWallet(appCtx, contactId, walletId);
  addDisabledActionsData(wallet);
  addCoinChainData(wallet);
  return wallet;
};

/**
 * Gets the wallet list for a contact
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
export const getWalletList = async (appCtx: AppCtx, contactId: string, partnerId: string): Promise<Wallet[]> => {
  const wallets = await ddbModel.getWalletsByContactId(appCtx, contactId);
  return wallets.map((w) => {
    addDisabledActionsData(w);
    addCoinChainData(w);
    return w;
  });
};

export const getOnchainUnsetCurrencies = async (
  appCtx: AppCtx,
  partnerId: string,
  contactId: string,
  enabledLedgerCurrencies: string[] = []
): Promise<UnsetCurrency[]> => {
  const userWallets = await getWalletList(appCtx, contactId, partnerId);
  const skip = userWallets.map((w) => w.currency);
  if (enabledLedgerCurrencies.length && !includesAnyEthOrErc20(userWallets)) {
    // skip onchain ETH and all ERC20 tokens if ETH enabled in ledger
    enabledLedgerCurrencies.forEach((c) => {
      if (isEthOrErc20(c) && !skip.includes(c)) {
        skip.push(c);
      }
    });
  }
  const currencies = await getAvailableCurrencies(appCtx, partnerId, contactId, !skip.includes(eth));
  return currencies.enabled
    .filter((c) => !skip.includes(c))
    .map((c) => ({
      currency: c,
      setupFee: currencies.props[c].setupFee,
      setupFeeCurrency: currencies.props[c].setupFeeCurrency,
      type: WalletType.ONCHAIN,
      coinChain: variables.getCoinChain(c),
    }));
};

function includesAnyEthOrErc20(wallets: Wallet[]) {
  return wallets.find((w) => isEthOrErc20(w.currency));
}

/**
 * Validates wallet creation request
 */
async function validateCreateWallet(
  appCtx: AppCtx,
  contactId: string,
  data: CreateWalletRequest,
  availableCurrencies: AvailableCurrencies
) {
  if (!isNil(data.walletVersion) && data.currency !== variables.eth) {
    throw newErrWithCode("walletVersion only supported for ETH", 400);
  }
  if (!availableCurrencies.enabled.includes(data.currency)) {
    throw newErrWithCode(`${data.currency} is not enabled`, 400);
  }
  if (variables.tempDisabledCreateWalletCurrencies.includes(data.currency.toUpperCase())) {
    throw newErrWithCode(`${data.currency} wallet creation temporary disabled`, 403);
  }
  if (Number(availableCurrencies.props[data.currency].setupFee) > 0 && !data.feeAccountId) {
    throw newErrWithCode("feeAccountId is required", 400);
  }
  if (variables.ercTokens.includes(data.currency?.toUpperCase())) {
    const contactHasEthWallet = await ddbModel.hasCurrencyWallet(appCtx, contactId, variables.eth);
    if (!contactHasEthWallet) {
      throw newErrWithCode(`You need to create an ETH wallet before creating an ERC-20 token wallet`, 400);
    }
  }
  await Promise.all([
    // wallet doesn't exist in CRM for this contact
    crmModel.getWalletByCurrency(appCtx, data.currency, contactId).then((w) => {
      if (w.length) {
        throw newErrWithCode(`${data.currency} wallet already exists`, 400);
      }
    }),
    // wallet doesn't exist in DDB for this contact
    ddbModel.hasCurrencyWallet(appCtx, contactId, data.currency).then((contactHasWallet) => {
      if (contactHasWallet) {
        throw newErrWithCode(`${data.currency} wallet already exists`, 400);
      }
    }),
  ]);
}

async function getAvailableCurrencies(appCtx: AppCtx, partnerId: string, contactId: string, computeEthFee = false) {
  const validCurrencies = await cryptoServiceModel.getAvailableCurrencies(appCtx, partnerId);
  // TODO only for beta testing paxg
  if (!variables.whiteListedContacts.includes(contactId)) {
    // removing PAXG
    validCurrencies.enabled = validCurrencies.enabled.filter((c) => !["PAXG", "paxg"].includes(c));
  }
  // removing temp disabled currencies
  validCurrencies.enabled = validCurrencies.enabled.filter(
    (c) => !variables.tempDisabledCreateWalletCurrencies.includes(c)
  );
  // compute eth fee only if not set already
  if (
    validCurrencies.enabled &&
    validCurrencies.enabled.includes(variables.eth) &&
    computeEthFee &&
    !isNumeric(validCurrencies.props[variables.eth].setupFee)
  ) {
    validCurrencies.props[variables.eth] = await txFeeModel.calculateEthSetupFee(appCtx, contactId);
  }
  return validCurrencies;
}

/**
 * Returns the deterministic wallet ID based on the contactId and currency
 */
function getWalletId(contactId: string, currency: string) {
  return uuidv5(`${contactId}-${currency}`, uuidv5.URL);
}

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
  // TODO! remove this: just disable account for a contact
  if (wallet.contactId === "705f1d35-bad1-4ec5-a4fc-0d67fbe36dae") {
    wallet.disabledActions = {
      buy: true,
      sell: true,
      send: true,
      receive: true,
    };
    wallet.receivingAddress = "";
    return;
  }
  const walletCurrency = wallet.currency.toUpperCase();
  wallet.disabledActions = {};

  if (variables.tempDisabledBuyCurrencies.includes(walletCurrency)) {
    wallet.disabledActions.buy = true;
  }
  if (variables.tempDisabledSellCurrencies.includes(walletCurrency)) {
    wallet.disabledActions.sell = true;
  }
  if (variables.tempDisabledSendCurrencies.includes(walletCurrency)) {
    wallet.disabledActions.send = true;
  }
  if (variables.tempDisabledReceiveCurrencies.includes(walletCurrency)) {
    wallet.disabledActions.receive = true;
    wallet.receivingAddress = ""; // do not show receiving address on receive disabled
  }
}

function addCoinChainData(wallet: Wallet) {
  if (!wallet) {
    return;
  }
  const coinChain = variables.getCoinChain(wallet.currency);
  if (coinChain) {
    wallet.coinChain = coinChain;
  }
}
