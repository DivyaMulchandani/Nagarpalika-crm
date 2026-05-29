import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const listFeePayments     = (params)   => api.get(ENDPOINTS.FEE_PAYMENTS.BASE, { params });
export const searchFeePayments   = (params)   => api.post(ENDPOINTS.FEE_PAYMENTS.SEARCH, params);
export const getFeePaymentById   = (id)       => api.get(ENDPOINTS.FEE_PAYMENTS.BY_ID(id));
export const getReconciliation   = (params)   => api.get(ENDPOINTS.FEE_PAYMENTS.RECONCILIATION, { params });
export const manualVerifyPayment = (id, data) => api.post(ENDPOINTS.FEE_PAYMENTS.MANUAL_VERIFY(id), data);
