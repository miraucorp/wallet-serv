import { errorResponseHandler as errorHandler, validate } from "au-helpers";
import { AppCtx, AuContext, Wallet, WalletType } from "../types/types";

import * as walletModel from "../models/wallet";
import * as userModel from "../models/user";
import * as sqsModel from "../models/sqs";
import * as omniModel from "../models/omni";
import * as marketClient from "../models/marketClient";
import { uuidValidation, currencyStringValidation, newErrWithCode } from "../utils/errs";
import Big from "big.js";
import { toWalletListResponse, toWalletResponse } from "../models/mapper/wallet";
import { isEthOrErc20 } from "../variables";
import variables = require("../variables");

const createValidationRules = {
  contactId: `required|${uuidValidation}`,
  partnerId: `required|${uuidValidation}`,
  name: "required|min:1|max:255",
  currency: `required|${currencyStringValidation}`,
  feeAccountId: `${uuidValidation}`,
  inLedger: "boolean",
};

export const createWallet = async (ctx: AuContext) => {
  const contactId = <string>ctx.request.header.contactid;
  const partnerId = <string>ctx.request.header.partnerid;
  const { name, currency, feeAccountId, inLedger } = ctx.request.body;
  try {
    validate({ contactId, partnerId, name, currency, feeAccountId, inLedger }, createValidationRules);
    if (!(await userModel.isKycApproved(ctx.appCtx, contactId, partnerId))) {
      throw newErrWithCode(`Kyc not approved`, 400);
    }
    const isLedgerAllowed = await userModel.getLedgerAllowed(ctx.appCtx, partnerId);
    let wallet: Wallet;
    if (inLedger && isLedgerAllowed) {
      wallet = await omniModel.createWallet(ctx.appCtx, { contactId, partnerId, name, currency });
      ctx.response.ok({ wallets: [toWalletResponse(wallet)] }, "Wallet created successfully.");
    } else {
      throw newErrWithCode(`disabled standard crypto wallet`, 400);
    }
  } catch (e) {
    errorHandler(ctx, e);
  }
};

const createOnBehalfOfMemberValidationRules = {
  contactId: `required|${uuidValidation}`,
  partnerId: `required|${uuidValidation}`,
  name: "required|min:1|max:255",
  currency: `required|${currencyStringValidation}`,
  walletVersion: `in:0,1`, // defaults to 0 (only for BitGo ETH)
  inLedger: "boolean",
};

export const createWalletOnBehalfOfMember = async (ctx: AuContext) => {
  const contactId = <string>ctx.request.header.contactid;
  const partnerId = <string>ctx.request.header.partnerid;
  const { name, currency, walletVersion, inLedger } = ctx.request.body;
  try {
    validate({ contactId, partnerId, name, currency, walletVersion, inLedger }, createOnBehalfOfMemberValidationRules);
    if (!(await userModel.isKycApproved(ctx.appCtx, contactId, partnerId))) {
      throw newErrWithCode(`Kyc not approved`, 400);
    }
    let wallet: Wallet;
    if (inLedger && (await userModel.getLedgerAllowed(ctx.appCtx, partnerId))) {
      wallet = await omniModel.createWallet(ctx.appCtx, { contactId, partnerId, name, currency });
    } else {
      wallet = await walletModel.createWallet(ctx.appCtx, contactId, partnerId, {
        name,
        currency,
        skipFee: true,
        walletVersion,
      });
    }
    ctx.response.ok({ wallets: [toWalletResponse(wallet)] }, "Wallet created successfully.");
  } catch (e) {
    errorHandler(ctx, e);
  }
};

const getWalletValidationRules = {
  contactId: `required|${uuidValidation}`,
  partnerId: `required|${uuidValidation}`,
  walletId: `required|${uuidValidation}`,
};

/**
 * WARNING: we are not passing the partner id here so we cannot check if it is a currently disabled currency
 * as we do check on the wallet list endpoint
 */
export const getWallet = async (ctx: AuContext) => {
  const contactId = <string>ctx.request.header.contactid;
  const partnerId = <string>ctx.request.header.partnerid;
  const { walletId } = ctx.params;
  try {
    validate({ contactId, walletId, partnerId }, getWalletValidationRules);
    const wallet = await getWalletById(ctx.appCtx, contactId, partnerId, walletId);
    ctx.response.ok(wallet, "Wallet fetched successfully.");
  } catch (err) {
    errorHandler(ctx, err);
  }
};

const isLedgerValidationRules = {
  contactId: `required|${uuidValidation}`,
  partnerId: `required|${uuidValidation}`,
  walletId: `required|${uuidValidation}`,
};

export const isLedger = async (ctx: AuContext) => {
  const contactId = <string>ctx.request.header.contactid;
  const partnerId = <string>ctx.request.header.partnerid;
  const { walletId } = ctx.params;
  try {
    validate({ contactId, walletId, partnerId }, isLedgerValidationRules);
    const wallet = await getWalletById(ctx.appCtx, contactId, partnerId, walletId);
    if (wallet.type === WalletType.LEDGER) {
      ctx.response.ok({ isLedger: true }, "IsLedger get success.");
    } else {
      ctx.response.ok({ isLedger: false }, "IsLedger get success.");
    }
  } catch (err) {
    errorHandler(ctx, err);
  }
};

async function getWalletById(appCtx: AppCtx, contactId: string, partnerId: string, walletId: string): Promise<Wallet> {
  const wallet = await walletModel.getWallet(appCtx, contactId, walletId);
  if (wallet) {
    return wallet;
  }
  if (await userModel.getLedgerAllowed(appCtx, partnerId)) {
    return omniModel.getWallet(appCtx, { contactId, walletId });
  }
  throw newErrWithCode("Wallet not found.", 404);
}

const listWalletsValidationRules = {
  contactId: `required|${uuidValidation}`,
  partnerId: `required|${uuidValidation}`,
};

export const listWallets = async (ctx: AuContext) => {
  const contactId = <string>ctx.request.header.contactid;
  const partnerId = <string>ctx.request.header.partnerid;
  try {
    validate({ contactId, partnerId }, listWalletsValidationRules);
    const wallets = await walletModel.getWalletList(ctx.appCtx, contactId, partnerId);
    if (await userModel.getLedgerAllowed(ctx.appCtx, partnerId)) {
      const ledgerWallets = await omniModel.getWallets(ctx.appCtx, { contactId, partnerId });
      // add to all wallets
      ledgerWallets.forEach((w) => wallets.push(w));
    }
    ctx.response.ok({ wallets: toWalletListResponse(wallets) }, "Wallet list fetched successfully.");
  } catch (err) {
    errorHandler(ctx, err);
  }
};

/**
 * Lists wallets and updates the cache from provider
 * @deprecated use {@link listWallets} instead
 * @param ctx
 */
export const listWalletsUpdatingCache = async (ctx: AuContext) => {
  const contactId = <string>ctx.request.header.contactid;
  const partnerId = <string>ctx.request.header.partnerid;
  try {
    validate({ contactId, partnerId }, listWalletsValidationRules);
    const wallets = await walletModel.getWalletList(ctx.appCtx, contactId, partnerId);
    // TODO this update that should be removed once we update wallet balances on tx
    await sqsModel.updateWalletList(ctx.appCtx, contactId);
    if (await userModel.getLedgerAllowed(ctx.appCtx, partnerId)) {
      const ledgerWallets = await omniModel.getWallets(ctx.appCtx, { contactId, partnerId });
      // add to all wallets
      ledgerWallets.forEach((w) => wallets.push(w));
    }
    ctx.response.ok({ wallets: toWalletListResponse(wallets) }, "Wallet list fetched successfully.");
  } catch (err) {
    errorHandler(ctx, err);
  }
};

const getPartnerWalletsValidationRules = {
  contactId: `required|${uuidValidation}`,
  partnerId: `required|${uuidValidation}`,
};

export const getPartnerWallets = async (ctx: AuContext) => {
  const contactId = <string>ctx.request.header.contactid;
  const partnerId = <string>ctx.request.header.partnerid;
  try {
    validate({ contactId, partnerId }, getPartnerWalletsValidationRules);

    const contactDetails = await userModel.getContact(ctx.appCtx, contactId);
    if (contactDetails.partnerId !== partnerId) {
      throw newErrWithCode("", 400, 40031);
    }
    const allWallets = await walletModel.getWalletList(ctx.appCtx, contactId, partnerId);
    const activeWallets: { currency: string; currencyName: string }[] = [];
    allWallets.forEach((wallet) => {
      if (!wallet.disabledActions.receive) {
        activeWallets.push({
          currency: wallet.currency,
          currencyName: wallet.currencyName,
        });
      }
    });
    ctx.response.ok({ wallets: activeWallets }, "Wallets list fetched successfully.");
  } catch (err) {
    errorHandler(ctx, err);
  }
};

const updateWalletWebhooksValidationRules = {
  contactId: `required|${uuidValidation}`,
  walletId: `required|${uuidValidation}`,
};

/**
 * Internal method that sends an SQS message to update wallet webhooks
 * @param ctx The koa context
 */
export const updateWalletWebhooks = async (ctx: AuContext) => {
  const walletId = ctx.params.walletId;
  const contactId = <string>ctx.request.body.contactId;
  try {
    validate({ walletId, contactId }, updateWalletWebhooksValidationRules);
    await sqsModel.updateWalletWebhooks(ctx.appCtx, walletId, contactId);
    ctx.response.ok(null, "Webhook update submitted");
  } catch (err) {
    errorHandler(ctx, err);
  }
};

const updateContactWalletsCacheAndCRMValidationRules = {
  contactId: `required|${uuidValidation}`,
};

/**
 * Sends an SQS message to update the wallets for a contact
 * @param ctx The koa context
 */
export const updateContactWalletsCacheAndCRM = async (ctx: AuContext) => {
  const contactId = <string>ctx.request.body.contactId;
  try {
    validate({ contactId }, updateContactWalletsCacheAndCRMValidationRules);
    await sqsModel.updateWalletList(ctx.appCtx, contactId);
    ctx.response.ok(null, "Wallets update cache request sent.");
  } catch (err) {
    errorHandler(ctx, err);
  }
};

const getUnsetCurrenciesValidationRules = {
  contactId: `required|${uuidValidation}`,
  partnerId: `required|${uuidValidation}`,
};
/**
 * Gets the available currencies that have not been set as wallets for a contact
 *
 * E.g.: If the user has already an ETH wallet then ETH won't be returned by this method.
 */
export const getUnsetCurrencies = async (ctx: AuContext) => {
  const contactId = <string>ctx.request.header.contactid;
  const partnerId = <string>ctx.request.header.partnerid;
  try {
    validate({ contactId, partnerId }, getUnsetCurrenciesValidationRules);
    if (await userModel.getLedgerAllowed(ctx.appCtx, partnerId)) {
      const enabledInLedger = await omniModel.getEnabledCurrencies(ctx.appCtx, contactId, partnerId);
      const ledgerUnsetCurrencies = await omniModel.getLedgerUnsetCurrencies(
        ctx.appCtx,
        partnerId,
        contactId,
        enabledInLedger
      );
      ctx.response.ok({ unsetCurrencies: ledgerUnsetCurrencies }, "Unset currencies fetched successfully.");
    } else {
      throw newErrWithCode(`disabled standard crypto wallet`, 400);
    }
  } catch (err) {
    errorHandler(ctx, err);
  }
};

const indicativeBalanceValidationRules = {
  contactId: `required|${uuidValidation}`,
  partnerId: `required|${uuidValidation}`,
};

export const indicativeBalance = async (ctx: AuContext) => {
  const contactId = <string>ctx.request.header.contactid;
  const partnerId = <string>ctx.request.header.partnerid;

  try {
    validate({ contactId, partnerId }, indicativeBalanceValidationRules);
    const { preferredDisplayCurrency } = await userModel.getContact(ctx.appCtx, contactId);
    const ledgerAllowed = await userModel.getLedgerAllowed(ctx.appCtx, partnerId);
    const preferredCurrency = preferredDisplayCurrency || "USD";

    // get contact wallet list
    const wallets = await walletModel.getWalletList(ctx.appCtx, contactId, partnerId);
    if (ledgerAllowed) {
      const ledgerWallets = await omniModel.getWallets(ctx.appCtx, { contactId, partnerId });
      ledgerWallets.forEach((w) => wallets.push(w));
    }
    let total = Big(0);
    if (wallets.length) {
      const tickers = wallets.map((wallet) => `${wallet.currency}_USD`);
      const rates = await marketClient.getMarketRates(ctx.appCtx, contactId, tickers);

      // calculate total USD balance
      for (const wallet of wallets) {
        const balance = wallet.spendableBalance;
        const rate = rates[`${wallet.currency}_USD`];
        if (balance && rate) {
          total = total.plus(Big(balance).times(rate.buy_price));
        }
      }

      // convert if preferredCurrency is not USD and total greater than zero
      if (String(preferredCurrency).toUpperCase() !== "USD" && total.gt(0)) {
        const { destinationAmount: amountInPreferredCurrency } = await marketClient.getFiatConversionBalance(
          ctx.appCtx,
          {
            contactId,
            amount: total.toNumber(),
            fromCurrency: "USD",
            toCurrency: preferredCurrency,
          }
        );
        total = Big(amountInPreferredCurrency);
      }
    }

    ctx.response.ok(
      { totalBalance: total.toNumber(), currency: preferredCurrency },
      "Get wallets indicative balance successfully."
    );
  } catch (err) {
    errorHandler(ctx, err);
  }
};

async function validateOnchainVsLedgerCreation(appCtx: AppCtx, contactId: string, partnerId: string, currency: string) {
  if (!variables.isEthOrErc20(currency)) {
    return;
  }
  const [onchainWallets, enabledInLedger] = await Promise.all([
    walletModel.getWalletList(appCtx, contactId, partnerId),
    omniModel.getEnabledCurrencies(appCtx, contactId, partnerId),
  ]);
  const hasOnchainEthOrErc20Set = Boolean(onchainWallets.find((c) => isEthOrErc20(c.currency)));
  if (enabledInLedger.includes(currency) && !hasOnchainEthOrErc20Set) {
    throw newErrWithCode(`${currency} wallet type not supported`, 400);
  }
}
