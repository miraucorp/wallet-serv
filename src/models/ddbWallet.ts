import * as variables from "../variables";
import { ddbDocClient } from "../variables/awsConfig";
import { tracing } from "au-helpers";
import { newErrWithCode, isNumeric } from "../utils/errs";
import { AppCtx, Wallet, Provider } from "../types/types";
import { QueryInput, UpdateItemInput } from "aws-sdk/clients/dynamodb";

const { TracedService } = tracing;

export const insertWallet = async (appCtx: AppCtx, wallet: WalletCreation) => {
  await appCtx.traced(TracedService.DDB, `insertWallet`, () =>
    ddbDocClient
      .put({
        TableName: variables.walletsTable,
        ConditionExpression: "attribute_not_exists(walletId)", // insert only
        Item: wallet,
      })
      .promise()
  );
};

export const getWalletById = async (appCtx: AppCtx, walletId: string): Promise<Wallet> => {
  const res = await appCtx.traced(TracedService.DDB, `getWalletById`, () =>
    ddbDocClient
      .get({
        TableName: variables.walletsTable,
        Key: {
          walletId: walletId,
        },
        ConsistentRead: true,
      })
      .promise()
  );
  return res.Item;
};

export const deleteWallet = async (appCtx: AppCtx, walletId: string) => {
  await appCtx.traced(TracedService.DDB, `deleteWallet`, () =>
    ddbDocClient
      .delete({
        TableName: variables.walletsTable,
        Key: {
          walletId,
        },
        ConditionExpression: "attribute_not_exists(externalWalletId)", // only delete if not ext id set
      })
      .promise()
  );
};

export const getWallet = async (appCtx: AppCtx, contactId: string, walletId: string) => {
  const wallet = await appCtx.traced(TracedService.DDB, `get-wallet-by-walletId`, async () =>
    ddbDocClient
      .get({
        TableName: variables.walletsTable,
        Key: { walletId },
      })
      .promise()
  );
  if (!wallet.Item || wallet.Item.contactId !== contactId) {
    return null;
  }
  return wallet.Item;
};

export const hasCurrencyWallet = async (appCtx: AppCtx, contactId: string, currency: string): Promise<boolean> => {
  return appCtx.traced(TracedService.DDB, `walletExists`, async () => {
    const res = await ddbDocClient
      .query({
        TableName: variables.walletsTable,
        IndexName: "contactId-index",
        KeyConditionExpression: "contactId = :contactId",
        FilterExpression: "currency = :currency",
        ExpressionAttributeValues: {
          ":contactId": contactId,
          ":currency": currency,
        },
      })
      .promise();
    if (res.Items && res.Items.length) {
      return true;
    }
    return false;
  });
};

export const getWalletByContactIdAndCurrency = async (
  appCtx: AppCtx,
  contactId: string,
  currency: string
): Promise<Wallet> => {
  return appCtx.traced(TracedService.DDB, `getWalletByContactIdAndCurrency`, async () => {
    const res = await ddbDocClient
      .query({
        TableName: variables.walletsTable,
        IndexName: "contactId-index",
        KeyConditionExpression: "contactId = :contactId",
        FilterExpression: "currency = :currency",
        ExpressionAttributeValues: {
          ":contactId": contactId,
          ":currency": currency,
        },
      })
      .promise();
    if (!res.Items || !res.Items.length) {
      throw newErrWithCode("wallet not found", 404);
    }
    if (res.Items.length > 1) {
      throw newErrWithCode("multiple wallets for currency", 404);
    }
    return res.Items[0];
  });
};

export const getWalletsByContactId = async (appCtx: AppCtx, contactId: string): Promise<Wallet[]> => {
  const wallets: Wallet[] = [];
  let result;
  do {
    const params = {
      TableName: variables.walletsTable,
      IndexName: "contactId-index",
      KeyConditionExpression: "contactId = :contactId",
      ExpressionAttributeValues: { ":contactId": contactId },
    } as QueryInput;
    if (result?.LastEvaluatedKey) {
      params.ExclusiveStartKey = result.LastEvaluatedKey;
    }
    result = await appCtx.traced(TracedService.DDB, `get-wallets-by-contactId`, async () =>
      ddbDocClient.query(params).promise()
    );
    wallets.push(...result.Items);
  } while (result.LastEvaluatedKey);
  return wallets;
};

export const updateWallet = (appCtx: AppCtx, wallet: Wallet) => {
  const params = {
    TableName: variables.walletsTable,
    Key: {
      walletId: wallet.walletId,
    },
    UpdateExpression: `SET
        externalWalletId = :externalWalletId,
        #name = :name,
        balance = :balance,
        spendableBalance = :spendableBalance,
        confirmedBalance = :confirmedBalance,
        currency = :currency,
        isCold = :isCold,
        contactId = :contactId,
        #updatedAt = :updatedAt`,
    ExpressionAttributeNames: {
      "#name": "name",
      "#updatedAt": "updatedAt",
    },
    ExpressionAttributeValues: {
      ":externalWalletId": wallet.externalWalletId,
      ":name": wallet.name,
      ":balance": isNumeric(wallet.balance) ? wallet.balance : 0,
      ":spendableBalance": isNumeric(wallet.spendableBalance) ? wallet.spendableBalance : 0,
      ":confirmedBalance": isNumeric(wallet.confirmedBalance) ? wallet.confirmedBalance : 0,
      ":currency": wallet.currency.toUpperCase(),
      ":isCold": wallet.isCold,
      ":contactId": wallet.contactId,
      ":updatedAt": Date.now(),
    },
  } as UpdateItemInput;
  if (wallet.receivingAddress) {
    params.UpdateExpression += ", receivingAddress = :receivingAddress";
    // @ts-ignore
    params.ExpressionAttributeValues[":receivingAddress"] = wallet.receivingAddress;
  }
  if (wallet.walletVersion) {
    params.UpdateExpression += ", contractVersion = :contractVersion";
    // @ts-ignore
    params.ExpressionAttributeValues[":contractVersion"] = wallet.walletVersion;
  }
  return appCtx.traced(TracedService.DDB, `updateWallet`, () => ddbDocClient.update(params).promise());
};

export const getPartnerDetails = async (appCtx: AppCtx, partnerId: string) => {
  const params = {
    TableName: variables.ddbPartnersTable,
    Key: {
      partnerId
    }
  };

  const response = await appCtx.traced(
    TracedService.DDB,
    `partners::get:byPartnerId`,
    async () => {
      return ddbDocClient.get(params).promise();
    }
  );

  return response.Item;
};

interface WalletCreation {
  walletId: string;
  name: string;
  contactId: string;
  updatedAt: number;
  createdDate: string;
  currency: string;
  provider: Provider;
  currencyName: string;
  balance: number;
  confirmedBalance: number;
  spendableBalance: number;
}
