import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createInvoice = async (data) => {
    return api.post(ENDPOINTS.INVOICES.BASE, data);
};

export const getInvoiceById = async (id) => {
    return api.get(ENDPOINTS.INVOICES.BY_ID(id));
};

export const updateInvoice = async (id, data) => {
    return api.put(ENDPOINTS.INVOICES.BY_ID(id), data);
};

export const deleteInvoice = async (id) => {
    return api.delete(ENDPOINTS.INVOICES.BY_ID(id));
};

export const searchInvoices = async (params) => {
    return api.post(ENDPOINTS.INVOICES.SEARCH, params);
};

export const getOutstandingInvoices = async () => {
    return api.get(ENDPOINTS.INVOICES.OUTSTANDING);
};

export const recordPayment = async (data) => {
    return api.post(ENDPOINTS.PAYMENTS.BASE, data);
};

export const getPatientPayments = async (patientId) => {
    return api.get(ENDPOINTS.PAYMENTS.BY_PATIENT(patientId));
};

export default {
    createInvoice,
    getInvoiceById,
    updateInvoice,
    deleteInvoice,
    searchInvoices,
    getOutstandingInvoices,
    recordPayment,
    getPatientPayments,
};
