import { AppCtx, CreateWalletRequest, Wallet, Provider, BitGoWallet, CoinChain, WalletProvider } from "../types/types";
import * as bitgoClient from "./bitgoClient";
import * as ddbWalletModel from "./ddbWallet";
import * as sqsClient from "./sqs";
import variables = require("../variables");
import { newErrWithCode, isNumeric } from "../utils/errs";
import { getCurrencyName } from "../variables";

class BitGoProvider implements WalletProvider {
  /**
   * Creates a wallet in BitGo
   */
  createWallet = async (
    appCtx: AppCtx,
    contactId: string,
    walletId: string,
    data: CreateWalletRequest
  ): Promise<Wallet> => {
    if (variables.ercTokens.includes(data.currency)) {
      // ERC-20 token
      const ethWallet = await ddbWalletModel
        .getWalletByContactIdAndCurrency(appCtx, contactId, variables.eth)
        .catch(() => {
          throw newErrWithCode(`${variables.eth} wallet must be created before ${data.currency} token wallet`);
        });
      const bitgoEthWallet = await bitgoClient.getWalletById(appCtx, variables.eth, ethWallet.externalWalletId);
      return toERC20DbWallet(contactId, walletId, data.currency, bitgoEthWallet);
    } else {
      const bitgoWallet = await bitgoClient.createWallet(
        appCtx,
        data.name,
        data.currency,
        contactId,
        data.walletVersion
      );
      return toDbWallet(contactId, walletId, bitgoWallet);
    }
  };

  finishWalletCreation = async (appCtx: AppCtx, currency: string, walletId: string, contactId: string) => {
    if (variables.ercTokens.includes(currency)) {
      // do nothing for ERC-20 token
      return;
    }
    // async tasks
    await Promise.all([
      ...variables.walletShares.map((walletShare) => {
        sqsClient.createWalletShare(appCtx, walletId, contactId, walletShare.email, walletShare.permissions);
      }),
      sqsClient.createWalletWebhooks(appCtx, walletId, contactId),
    ]).catch((e) => appCtx.log.error(`could not send createWalletShare or webhooks message`, e));
  };
}

/**
 * export singleton
 */
export const bitgoProvider = new BitGoProvider();

function toDbWallet(contactId: string, walletId: string, bitgoWallet: BitGoWallet): Wallet {
  const currency = bitgoWallet.currency.toUpperCase();
  return {
    walletId,
    externalWalletId: bitgoWallet.id,
    balance: isNumeric(bitgoWallet.balance) ? bitgoWallet.balance : 0,
    spendableBalance: isNumeric(bitgoWallet.spendableBalance) ? bitgoWallet.spendableBalance : 0,
    confirmedBalance: isNumeric(bitgoWallet.confirmedBalance) ? bitgoWallet.confirmedBalance : 0,
    contactId,
    name: bitgoWallet.name,
    receivingAddress: bitgoWallet.address,
    updatedAt: Date.now(),
    currency,
    provider: Provider.BITGO,
    isCold: bitgoWallet.isCold,
    walletVersion: bitgoWallet.walletVersion,
    keys: bitgoWallet.keys,
    currencyName: getCurrencyName(currency),
  };
}

function toERC20DbWallet(contactId: string, walletId: string, currency: string, bitgoEthWallet: BitGoWallet): Wallet {
  if (!variables.ercTokens.includes(currency)) {
    throw newErrWithCode(`${currency} is not ERC-20`);
  }
  if (bitgoEthWallet.currency.toUpperCase() !== variables.eth) {
    throw newErrWithCode(`bitgo wallet is not eth`);
  }
  return {
    walletId,
    externalWalletId: bitgoEthWallet.id,
    balance: isNumeric(bitgoEthWallet.tokens[currency].balance) ? bitgoEthWallet.tokens[currency].balance : 0,
    spendableBalance: isNumeric(bitgoEthWallet.tokens[currency].spendableBalance)
      ? bitgoEthWallet.tokens[currency].spendableBalance
      : 0,
    confirmedBalance: isNumeric(bitgoEthWallet.tokens[currency].confirmedBalance)
      ? bitgoEthWallet.tokens[currency].confirmedBalance
      : 0,
    contactId,
    name: bitgoEthWallet.name,
    receivingAddress: bitgoEthWallet.address,
    updatedAt: Date.now(),
    currency: currency.toUpperCase(),
    provider: Provider.BITGO,
    isCold: bitgoEthWallet.isCold,
    walletVersion: bitgoEthWallet.walletVersion,
    coinChain: CoinChain.ERC20,
    keys: bitgoEthWallet.keys,
  };
}
