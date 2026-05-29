import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const getDashboardStats             = async (params) => api.get(ENDPOINTS.ANALYTICS.DASHBOARD,                { params });
export const getAppointmentSummaryReport  = async (params) => api.get(ENDPOINTS.ANALYTICS.REPORT_APPOINTMENTS,       { params });
export const getRevenueReport             = async (params) => api.get(ENDPOINTS.ANALYTICS.REPORT_REVENUE,            { params });
export const getPatientReport             = async (params) => api.get(ENDPOINTS.ANALYTICS.REPORT_PATIENTS,           { params });
export const getFollowUpReport            = async (params) => api.get(ENDPOINTS.ANALYTICS.REPORT_FOLLOW_UPS,         { params });
export const getDoctorUtilizationReport   = async (params) => api.get(ENDPOINTS.ANALYTICS.REPORT_DOCTOR_UTILIZATION, { params });
