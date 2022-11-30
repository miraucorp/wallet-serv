const Router = require("koa-router");

const healthController = require("./controllers/health");
const walletController = require("./controllers/wallet");

const routers = new Router();

routers
  .get("/health", healthController.health)
  .post("/wallets", walletController.createWallet)
  .post("/internal/wallets", walletController.createWalletOnBehalfOfMember)
  .get("/wallets", walletController.listWalletsUpdatingCache)
  .get("/private/wallets", walletController.listWallets)
  .get("/private/wallets/:walletId/isledger", walletController.isLedger)
  .get("/unset-currency", walletController.getUnsetCurrencies)
  .get("/v2/wallets/balance/indicative", walletController.indicativeBalance)
  .get("/wallets/:walletId", walletController.getWallet)
  .post("/internal/wallets/:walletId/update-webhooks", walletController.updateWalletWebhooks)
  .get("/v2/partner/wallet/list", walletController.getPartnerWallets)
  .post("/internal/wallets/update", walletController.updateContactWalletsCacheAndCRM);

module.exports = routers;
