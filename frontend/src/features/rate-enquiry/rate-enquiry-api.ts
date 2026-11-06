// Where the Rate enquiry screen reads from (backend/src/pricing/rate-enquiry.controller.ts).
export const RATE_ENQUIRY_PATH = "/rate-enquiry";

/** No customer = a walk-in buyer: price-list rates only. */
export const rateEnquiryPath = (partyId: string | undefined) =>
  partyId ? `${RATE_ENQUIRY_PATH}?partyId=${encodeURIComponent(partyId)}` : RATE_ENQUIRY_PATH;
