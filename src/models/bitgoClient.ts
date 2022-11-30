import { AppCtx, BitGoWallet } from "../types/types";
import * as variables from "../variables";

const config = {
  headers: {
    "Content-Type": "application/json",
  },
};

export const createWallet = async (
  appCtx: AppCtx,
  name: string,
  currency: string,
  contactId: string,
  walletVersion: string | number
): Promise<BitGoWallet> => {
  return appCtx.API.post(
    `${variables.bcBitgoAdapter}/wallet`,
    { name, currency, contactId, walletVersion },
    config
  ).then((response) => response.data.data);
};

/**
 * Creates one wallet webhook
 */
export const addWalletWebhook = async (
  appCtx: AppCtx,
  coin: string,
  externalWalletId: string,
  data: AddWebhookRequest
) => {
  return appCtx.API.post(`${variables.bcBitgoAdapter}/webhooks/wallet/${coin}/${externalWalletId}`, data, config).then(
    (response) => response.data.data
  );
};

export const getWalletByAddress = async (appCtx: AppCtx, currency: string, address: string) => {
  return appCtx.API.get(`${variables.bcBitgoAdapter}/wallet/address/${currency}/${address}`, config).then(
    (response) => response.data.data
  );
};

export const getWalletById = async (appCtx: AppCtx, currency: string, id: string): Promise<BitGoWallet> => {
  return appCtx.API.get(`${variables.bcBitgoAdapter}/wallet/${currency}/${id}`, config).then(
    (response) => response.data.data
  );
};

interface AddWebhookRequest {
  url: string;
  numConfirmations: number;
  label: string;
  allToken: boolean;
}
