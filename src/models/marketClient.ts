import { AppCtx, AvailableCurrencies } from "../types/types";
import * as variables from "../variables";

/**
 * Gets the available currencies with properties
 */
export const getAvailableCurrencies = async (appCtx: AppCtx, partnerId: string): Promise<AvailableCurrencies> => {
  return appCtx.API.get(`${variables.bcCryptoService}/available-currencies/wallet`, {
    headers: {
      "Content-Type": "application/json",
      partnerId,
    },
  }).then((response) => response.data.data);
};

/**
 * Get indicative market rates for the provided tickers
 */
export const getMarketRates = async (
  appCtx: AppCtx,
  contactId: string,
  tickers: string[]
): Promise<Record<string, Ticker>> => {
  return appCtx.API.get(`${variables.bcCryptoService}/v2/market/rates`, {
    headers: {
      "Content-Type": "application/json",
      contactId,
    },
    params: {
      tickers: tickers.join(),
    },
  }).then((response) => response.data.data);
};

export const getFiatConversionBalance = async (
  appCtx: AppCtx,
  { contactId, fromCurrency, toCurrency, amount }: FiatConversionRequest
) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
      contactId,
    },
  };

  return appCtx.API.get(`${variables.fsFxService}/converts/${fromCurrency}/${toCurrency}/${amount}`, config).then(
    (response) => response.data.data
  );
};

interface FiatConversionRequest {
  contactId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
}

interface Ticker {
  buy_price: string;
  sell_price: string;
}
