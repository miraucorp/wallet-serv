import { AppCtx } from "../types/types";
import { getCachedSync } from "../utils/cache-provider";
import * as variables from "../variables/index";

/**
 * Debits the fee
 */
export const debitCreationFee = async (appCtx: AppCtx, contactid: string, feeDebitRequest: DebitFeeReq) => {
  const config = { headers: { contactid } };
  return appCtx.API.post(`${variables.fsFxService}/payment/crypto-fee`, feeDebitRequest, config).then(
    (response) => response.data.data
  );
};

/**
 * Calculates the ETH wallet creation fee on the spot
 * since it depends on the current gas and ETH price.
 *
 * <pre>
 *   (Gas Used * Gas Price * USD/ETH)
 * </pre>
 */
export const calculateEthSetupFee = async (appCtx: AppCtx, contactId: string): Promise<EthSetupFeeResponse> => {
  const { ethWalletCreationEstimate } = await getCachedSync("gas-estimate", () => getGasEstimate(appCtx), 30);
  const rate = await getRate(appCtx, contactId, {
    ticker: `${variables.eth}_USD`,
    currency: `${variables.eth}`,
    amount: Number(ethWalletCreationEstimate),
  });
  return {
    setupFee: rate.paymentFiatAmount,
    setupFeeCurrency: rate.paymentFiatCurrency,
  };
};

/**
 * Returns the gas estimates
 */
async function getGasEstimate(appCtx: AppCtx): Promise<GasEstimateResponse> {
  return appCtx.API.get(`${variables.bcBitgoAdapter}/gas-estimate`).then((res) => res.data.data);
}

/**
 * Get rate
 */
async function getRate(appCtx: AppCtx, contactid: string, body: GetRateRequest): Promise<GetRateResponse> {
  const config = { headers: { contactid } };
  const result = await appCtx.API.post(`${variables.fsFxService}/public/crypto/membership/rate`, body, config);
  return result.data.data;
}

interface DebitFeeReq {
  accountId: string;
  amount: number;
  currencyCode: string;
  reference: string;
  deduplicationId: string;
}

interface GasEstimateResponse {
  /** The estimate amount of ether to create a wallet (decimal value encoded as string) */
  ethWalletCreationEstimate: string;
}

interface GetRateRequest {
  ticker: string;
  currency: string;
  amount: number;
}

interface GetRateResponse {
  paymentFiatAmount: number;
  paymentFiatCurrency: string;
}

interface EthSetupFeeResponse {
  setupFee: number;
  setupFeeCurrency: string;
}
