# App
LOGGER_NAME=tst-bc-wallet-service
APP_PORT=8080
LOG_LEVEL=info
SERVICE_DOMAIN=bc
SERVICE_NAME=bc-wallet-service
IS_TEST_NET=true

# Service
BC_CRM_ADAPTER_URL=ssm:///tst-bc/bc-crm-adapter/URL
BC_BITGO_ADAPTER_URL=ssm:///tst-bc/bc-bitgo-adapter/URL
BC_WALLET_TABLE=ssm:///tst-bc/bc-wallet-service-worker/WALLET_TABLE
BC_WALLET_SERVICE_WORKER_SQS=ssm:///tst-bc/bc-wallet-service-worker/WORKER_SQS
BC_CRYPTO_SERVICE=ssm:///tst-bc/bc-crypto-service/URL
BC_OMNIWALLET_SERVICE=ssm:///tst-bc/bc-omniwallet-service/URL

FS_FX_SERVICE=ssm:///tst-bc/vpc-endpoint/fs-fx-service/URL

#Table
PARTNERS_TABLE=ssm:///tst-bc/platform/PARTNERS_TABLE

# Comma separated list of temporary disabled currencies for each action
# TEMP_DISABLED_BUY_CURRENCIES=TETH,TERC
# TEMP_DISABLED_SELL_CURRENCIES=TETH,TERC
# TEMP_DISABLED_SEND_CURRENCIES=TETH,TERC
# TEMP_DISABLED_RECEIVE_CURRENCIES=TETH,TERC
# TEMP_DISABLED_CREATE_WALLET_CURRENCIES=

CX_API_GW=ssm:///tst-bc/cx-private-api/APIGW_URL

BC_BITGO_WEBHOOK_CALLBACK=https://callback.tst.auws.cloud/v1/bitgo/wallets/transactions/callback