import { client } from "au-helpers";
import * as variables from "../variables";
import { AppCtx } from "../types/types";
import { sqs } from "../variables/awsConfig";

const sqsClient = new client.SqsClient({
  region: variables.awsRegion,
  queueUrl: variables.bcWalletServiceWorkerSQS,
  sqs,
});

export const updateWalletList = async (appCtx: AppCtx, contactId: string) => {
  return sqsClient.sendMessage(
    appCtx,
    "UPDATE_WALLET_CACHE",
    "bc-wallet-service-update",
    JSON.stringify({ contactId })
  );
};

export const createWalletWebhooks = async (appCtx: AppCtx, walletId: string, contactId: string) => {
  return sqsClient.sendMessage(
    appCtx,
    "CREATE_WALLET_WEBHOOKS",
    "bc-wallet-service-update",
    JSON.stringify({ walletId, contactId })
  );
};

export const createWalletShare = async (
  appCtx: AppCtx,
  walletId: string,
  contactId: string,
  email: string,
  permissions: any
) => {
  return sqsClient.sendMessage(
    appCtx,
    "CREATE_WALLET_SHARE",
    "bc-wallet-service-update",
    JSON.stringify({
      walletId,
      contactId,
      email,
      permissions,
      walletPhrase: contactId,
    })
  );
};

export const updateWalletWebhooks = async (appCtx: AppCtx, walletId: string, contactId: string) => {
  // not often than 3 minutes
  // example: bfcbcf06-9fdb-4f2f-8764-09b9432a7073-161255755
  const timeInterval = Math.round(Date.now() / 180000);
  const deduplicationId = `${contactId}-${timeInterval}`;

  return sqsClient.sendMessage(
    appCtx,
    "UPDATE_WALLET_WEBHOOKS",
    "bc-wallet-service-update-webhooks",
    JSON.stringify({ walletId, contactId }),
    deduplicationId
  );
};
