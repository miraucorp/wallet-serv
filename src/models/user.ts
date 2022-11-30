import { AppCtx } from "../types/types";

import { cxApiGw } from "../variables";

import { getPartnerDetails } from "./ddbWallet";

export const getContact = async (appCtx: AppCtx, contactId: string): Promise<ContactResponse> => {
  const res = await appCtx.API.get(`${cxApiGw}/users/${contactId}`);
  return res.data.data;
};

export const getLedgerAllowed = async (appCtx: AppCtx, partnerId: string): Promise<boolean> => {
  const partnerDetails = await getPartnerDetails(appCtx, partnerId);
  return partnerDetails.isLedgerAllowed;
};

export const isKycApproved = async (appCtx: AppCtx, contactId: string, partnerId: string): Promise<boolean> => {
  try {
    const res = await appCtx.API.get(`${cxApiGw}/kyc/${contactId}`, { headers: { contactId, partnerId } });
    return res.data.data?.overallStatus === "APPROVED";
  } catch (e) {
    appCtx.log.error(`kyc error`, e);
    return false;
  }
};

interface ContactResponse {
  contactId: string;
  partnerId: string;
  firstName: string;
  lastName: string;
  latinFirstName: string;
  latinLastName: string;
  countryCode: string;
  externalId: string;
  preferredDisplayCurrency: string;
  ledgerAllowed: boolean;
}
