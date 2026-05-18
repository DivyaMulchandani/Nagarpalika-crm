import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const getDashboardStats = async (params) => {
    return await api.get(ENDPOINTS.ANALYTICS.DASHBOARD, { params });
};

export const getDoctorDashboardStats = async () => {
    return await api.get(ENDPOINTS.ANALYTICS.DOCTOR_DASHBOARD);
};

export const getAppointmentSummaryReport = async (params) => {
    return await api.get(ENDPOINTS.ANALYTICS.REPORT_APPOINTMENTS, { params });
};

export const getRevenueReport = async (params) => {
    return await api.get(ENDPOINTS.ANALYTICS.REPORT_REVENUE, { params });
};

export const getPatientReport = async (params) => {
    return await api.get(ENDPOINTS.ANALYTICS.REPORT_PATIENTS, { params });
};

export const getFollowUpReport = async (params) => {
    return await api.get(ENDPOINTS.ANALYTICS.REPORT_FOLLOW_UPS, { params });
};

export const getDoctorUtilizationReport = async (params) => {
    return await api.get(ENDPOINTS.ANALYTICS.REPORT_DOCTOR_UTILIZATION, { params });
};
