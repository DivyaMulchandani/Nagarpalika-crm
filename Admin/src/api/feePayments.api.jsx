import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const listFeePayments     = (params)   => api.get(ENDPOINTS.FEE_PAYMENTS.BASE, { params });
export const searchFeePayments   = (params)   => api.post(ENDPOINTS.FEE_PAYMENTS.SEARCH, params);
export const getFeePaymentById   = (id)       => api.get(ENDPOINTS.FEE_PAYMENTS.BY_ID(id));
export const getReconciliation   = (params)   => api.get(ENDPOINTS.FEE_PAYMENTS.RECONCILIATION, { params });
export const manualVerifyPayment = (id, data) => api.patch(ENDPOINTS.FEE_PAYMENTS.MANUAL_VERIFY(id), data);
// Through the API client, not a plain link: the API may live on another origin
// and the session cookie has to travel with the request.
export const downloadFeeReceipt  = (paymentId) => api.get(ENDPOINTS.FEE_PAYMENTS.RECEIPT(paymentId), { responseType: "blob" });
