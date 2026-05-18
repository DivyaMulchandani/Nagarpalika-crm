import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const getDashboardStats = async (params) => {
    return await api.get(ENDPOINTS.ANALYTICS.DASHBOARD, { params });
};

// TODO Phase 1: Add recruitment-specific report functions:
// export const getApplicationsReport  = async (params) => api.get(ENDPOINTS.ANALYTICS.REPORT_APPLICATIONS, { params });
// export const getCandidatesReport    = async (params) => api.get(ENDPOINTS.ANALYTICS.REPORT_CANDIDATES,   { params });
// export const getFeeCollectionReport = async (params) => api.get(ENDPOINTS.ANALYTICS.REPORT_FEE,          { params });
