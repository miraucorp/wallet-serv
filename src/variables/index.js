const { CoinChain } = require("../types/types");

const { toBoolean } = require("au-helpers").stringHelpers;
const loggerName = process.env.LOGGER_NAME;
const env = process.env.APP_ENV || "local";
const appPort = process.env.APP_PORT;
const logLevel = process.env.LOG_LEVEL;
const serviceDomain = process.env.SERVICE_DOMAIN;
const serviceName = process.env.SERVICE_NAME;
const awsRegion = process.env.AWS_REGION;
const host = process.env.HOST || "localhost";
const bcCRMAdapter = process.env.BC_CRM_ADAPTER_URL;
const walletsTable = process.env.BC_WALLET_TABLE;
const bcBitgoAdapter = process.env.BC_BITGO_ADAPTER_URL;
const bcWalletServiceWorkerSQS = process.env.BC_WALLET_SERVICE_WORKER_SQS;
const bcCryptoService = process.env.BC_CRYPTO_SERVICE;
const bcOmniWalletService = process.env.BC_OMNIWALLET_SERVICE;
const fsFxService = process.env.FS_FX_SERVICE;
const isTestNet = toBoolean(process.env.IS_TEST_NET);
const ddbPartnersTable =  process.env.PARTNERS_TABLE;
const walletSharesProd = [
  { email: "samantha@nvayo.com", permissions: "view" },
  { email: "chris@aucorp.com", permissions: "view" },
  { email: "pgbitgouser@pmamediagroup.com", permissions: "view" },
];
const walletSharesTest = [{ email: "pauliusg@pmamediagroup.com", permissions: "admin" }];

const ercTokens = isTestNet ? ["TERC"] : ["PAX", "BAT", "USDT", "USDC", "TUSD", "PAXG"];
const trcTokens = ["USDT_TRX"];

const isEthOrErc20 = (currency) => {
  const eth = isTestNet ? "TETH" : "ETH";
  return currency === eth || ercTokens.includes(currency);
};

/**
 * Splits a string value into an array by "," otherwise returns an empty arrray
 * @param {*} val The string value to split by ","
 * @returns {string[]}
 */
function toList(val) {
  return val ? val.split(",") : [];
}

const tempDisabledBuyCurrencies = toList(process.env.TEMP_DISABLED_BUY_CURRENCIES);
const tempDisabledSellCurrencies = toList(process.env.TEMP_DISABLED_SELL_CURRENCIES);
const tempDisabledSendCurrencies = toList(process.env.TEMP_DISABLED_SEND_CURRENCIES);
const tempDisabledReceiveCurrencies = toList(process.env.TEMP_DISABLED_RECEIVE_CURRENCIES);
const tempDisabledCreateWalletCurrencies = toList(process.env.TEMP_DISABLED_CREATE_WALLET_CURRENCIES);

const tempDisabledLedgerBuyCurrencies = toList(process.env.TEMP_DISABLED_LEDGER_BUY_CURRENCIES);
const tempDisabledLedgerSellCurrencies = toList(process.env.TEMP_DISABLED_LEDGER_SELL_CURRENCIES);
const tempDisabledLedgerSendCurrencies = toList(process.env.TEMP_DISABLED_LEDGER_SEND_CURRENCIES);
const tempDisabledLedgerReceiveCurrencies = toList(process.env.TEMP_DISABLED_LEDGER_RECEIVE_CURRENCIES);
const tempDisabledLedgerCreateWalletCurrencies = toList(process.env.TEMP_DISABLED_LEDGER_CREATE_WALLET_CURRENCIES);

// Contacts with access to skip disabled actions
const whiteListedContacts = [
  "d9fca36d-1884-43bb-9340-ecabce81d9e6", // Pablo
  "a4eeffd7-e1a5-4488-b456-c3cadd80384c", // Andrew
  // "33caf873-1288-4e3b-9409-e0a8f893d95f", // AP
  // "5f91987a-e996-4538-a62d-aedd899e7d43", // Rob
  // "2812210a-47f6-476f-aac4-6850b70d82e8", // CS AuraeLifestyle
  // "37ae9e1b-7539-4ecc-af3d-26fed464186c", // CB swan test
];

const cxApiGw = process.env.CX_API_GW;

/**
 * @type {Record<string, string>}
 */
const currencyNames = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BCH: "Bitcoin Cash",
  LTC: "Litecoin",
  PAX: "Paxos Standard",
  USDT: "Tether USD",
  // Testnet
  TBTC: "Testnet Bitcoin",
  TETH: "Testnet Ethereum",
  TBCH: "Testnet Bitcoin Cash",
  TLTC: "Testnet Litecoin",
};

const getCurrencyName = (currency) => currencyNames[currency] || currency;

const getCoinChain = (currency = "") => {
  if (ercTokens.includes(currency.toUpperCase())) {
    return CoinChain.ERC20;
  }
  if (trcTokens.includes(currency.toUpperCase())) {
    return CoinChain.TRC20;
  }
  return undefined;
};

const variables = {
  appPort,
  env,
  loggerName,
  logLevel,
  serviceDomain,
  serviceName,
  awsRegion,
  host,
  bcCRMAdapter,
  walletsTable,
  bcBitgoAdapter,
  bcWalletServiceWorkerSQS,
  bcCryptoService,
  bcOmniWalletService,
  fsFxService,
  isTestNet,
  walletShares: isTestNet ? walletSharesTest : walletSharesProd,
  ercTokens: ercTokens,
  trcTokens,
  eth: isTestNet ? "TETH" : "ETH",
  ddbPartnersTable,
  getCoinChain,
  tempDisabledBuyCurrencies,
  tempDisabledSellCurrencies,
  tempDisabledSendCurrencies,
  tempDisabledReceiveCurrencies,
  tempDisabledCreateWalletCurrencies,
  tempDisabledLedgerBuyCurrencies,
  tempDisabledLedgerSellCurrencies,
  tempDisabledLedgerSendCurrencies,
  tempDisabledLedgerReceiveCurrencies,
  tempDisabledLedgerCreateWalletCurrencies,
  whiteListedContacts,
  cxApiGw,
  getCurrencyName,
  isEthOrErc20,
};

module.exports = variables;
