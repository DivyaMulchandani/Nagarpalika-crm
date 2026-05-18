/**
 * API Endpoint Constants
 * All API endpoints defined in one place for easy maintenance
 */

// API Version prefix
const V1 = "/api/v1";

export const ENDPOINTS = {
    // Auth endpoints
    AUTH: {
        COMPANY_LOGIN: `${V1}/auth/company/login`,
        EMPLOYEE_LOGIN: `${V1}/auth/employee/login`,
        ME: `${V1}/auth/me`,
        LOGOUT: `${V1}/auth/logout`,
        OTP_SEND: `${V1}/auth/otp/send`,
        OTP_VERIFY: `${V1}/auth/otp/verify`,
        PASSWORD_RESET: `${V1}/auth/password/reset`,
        VERIFY_SESSION: `${V1}/auth/verify-session`
    },

    // Company endpoints
    COMPANIES: {
        BASE: `${V1}/companies`,
        ME: `${V1}/companies/getCompanyDetails`,
        BY_ID: (id) => `${V1}/companies/${id}`,
    },

    // Department endpoints
    DEPARTMENTS: {
        BASE: `${V1}/departments`,
        BY_ID: (id) => `${V1}/departments/${id}`,
        SEARCH: `${V1}/departments/search`,
    },

    // Patient endpoints
    PATIENTS: {
        BASE: `${V1}/patients`,
        BY_ID: (id) => `${V1}/patients/${id}`,
        SEARCH: `${V1}/patients/search`,
        QUICK_CREATE: `${V1}/patients/quick`,
        RESTORE: (id) => `${V1}/patients/${id}/restore`,
        DUPLICATE_CHECK: `${V1}/patients/duplicate-check`,
        DOCUMENTS_BY_PATIENT: (id) => `${V1}/patients/${id}/documents`,
        DOCUMENT_BY_ID: (id) => `${V1}/patients/documents/${id}`,
    },

    // Employee endpoints
    EMPLOYEES: {
        BASE: `${V1}/employees`,
        BY_ID: (id) => `${V1}/employees/${id}`,
        SEARCH: `${V1}/employees/search`,
        RESET_PASSWORD: (id) => `${V1}/employees/${id}/reset-password`,
    },

    // Doctor endpoints
    DOCTORS: {
        BASE: `${V1}/doctors`,
        BY_ID: (id) => `${V1}/doctors/${id}`,
        SEARCH: `${V1}/doctors/search`,
        RESET_PASSWORD: (id) => `${V1}/doctors/${id}/reset-password`,
    },

    // Location endpoints
    COUNTRIES: {
        BASE: `${V1}/countries`,
        BY_ID: (id) => `${V1}/countries/${id}`,
        SEARCH: `${V1}/countries/search`,
        STATES: (countryId) => `${V1}/countries/${countryId}/states`,
    },

    STATES: {
        BASE: `${V1}/states`,
        BY_ID: (id) => `${V1}/states/${id}`,
        SEARCH: `${V1}/states/search`,
        CITIES: (stateId) => `${V1}/states/${stateId}/cities`,
    },

    CITIES: {
        BASE: `${V1}/cities`,
        BY_ID: (id) => `${V1}/cities/${id}`,
        SEARCH: `${V1}/cities/search`,
    },

    LOCATIONS: {
        BASE: `${V1}/locations`,
    },

    // Menu endpoints
    MENU_GROUPS: {
        BASE: `${V1}/menu-groups`,
        BY_ID: (id) => `${V1}/menu-groups/${id}`,
        SEARCH: `${V1}/menu-groups/search`,
    },

    MENUS: {
        BASE: `${V1}/menus`,
        BY_ID: (id) => `${V1}/menus/${id}`,
        SEARCH: `${V1}/menus/search`,
        BY_GROUPS: `${V1}/menus/by-groups`,
    },

    // Role endpoints
    ROLES: {
        BASE: `${V1}/roles`,
        BY_ID: (id) => `${V1}/roles/${id}`,
        SEARCH: `${V1}/roles/search`,
    },

    // Currency endpoints
    CURRENCIES: {
        BASE: `${V1}/currencies`,
        BY_ID: (id) => `${V1}/currencies/${id}`,
        SEARCH: `${V1}/currencies/search`,
    },

    // Email endpoints
    EMAIL_SETUPS: {
        BASE: `${V1}/email-setups`,
        BY_ID: (id) => `${V1}/email-setups/${id}`,
        SEARCH: `${V1}/email-setups/search`,
    },

    EMAIL_FOR: {
        BASE: `${V1}/email-for`,
        BY_ID: (id) => `${V1}/email-for/${id}`,
        SEARCH: `${V1}/email-for/search`,
    },

    EMAIL_TEMPLATES: {
        BASE: `${V1}/email-templates`,
        BY_ID: (id) => `${V1}/email-templates/${id}`,
        SEARCH: `${V1}/email-templates/search`,
        UPLOAD_SIGNATURE: `${V1}/email-templates/upload-signature`,
    },

    // Employee Roles endpoints
    EMPLOYEE_ROLES: {
        BASE: `${V1}/employee-roles`,
        BY_ID: (id) => `${V1}/employee-roles/${id}`,
    },

    // Appointment endpoints
    APPOINTMENTS: {
        BASE: `${V1}/appointments`,
        BY_ID: (id) => `${V1}/appointments/${id}`,
        SEARCH: `${V1}/appointments/search`,
        STATUS: (id) => `${V1}/appointments/${id}/status`,
        TODAY: `${V1}/appointments/today`,
        FOLLOW_UP_QUEUE: `${V1}/appointments/follow-up-queue`,
        DOCTOR_SLOTS: `${V1}/appointments/doctor-slots`,
        BY_PATIENT: (patientId) => `${V1}/appointments/patient/${patientId}`,
        TRANSFER: (id) => `${V1}/appointments/${id}/transfer`,
    },

    // Prescription endpoints
    PRESCRIPTIONS: {
        BASE: `${V1}/prescriptions`,
        BY_ID: (id) => `${V1}/prescriptions/${id}`,
        BY_APPOINTMENT: (appointmentId) => `${V1}/prescriptions/appointment/${appointmentId}`,
        BY_PATIENT: (patientId) => `${V1}/prescriptions/patient/${patientId}`,
    },

    // Invoice & Payment endpoints
    INVOICES: {
        BASE: `${V1}/invoices`,
        BY_ID: (id) => `${V1}/invoices/${id}`,
        SEARCH: `${V1}/invoices/search`,
        OUTSTANDING: `${V1}/invoices/outstanding`,
    },

    PAYMENTS: {
        BASE: `${V1}/payments`,
        BY_PATIENT: (patientId) => `${V1}/payments/patient/${patientId}`,
    },

    // Treatment Plan endpoints
    TREATMENT_PLANS: {
        BASE: `${V1}/treatment-plans`,
        BY_ID: (id) => `${V1}/treatment-plans/${id}`,
        SEARCH: `${V1}/treatment-plans/search`,
        ACCEPT: (id) => `${V1}/treatment-plans/${id}/accept`,
        BY_PATIENT: (patientId) => `${V1}/treatment-plans/patient/${patientId}`,
    },

    // Master Data endpoints
    MASTER_DATA: {
        BASE: `${V1}/master-data`,
        BY_ID: (id) => `${V1}/master-data/${id}`,
        GROUPED: `${V1}/master-data/grouped`,
        REORDER: `${V1}/master-data/reorder`,
    },

    // Analytics endpoints
    ANALYTICS: {
        DASHBOARD: `${V1}/analytics/dashboard`,
        DOCTOR_DASHBOARD: `${V1}/analytics/doctor-dashboard`,
        REPORT_APPOINTMENTS: `${V1}/analytics/reports/appointments`,
        REPORT_REVENUE: `${V1}/analytics/reports/revenue`,
        REPORT_PATIENTS: `${V1}/analytics/reports/patients`,
        REPORT_FOLLOW_UPS: `${V1}/analytics/reports/follow-ups`,
        REPORT_DOCTOR_UTILIZATION: `${V1}/analytics/reports/doctor-utilization`,
    },

    // WhatsApp endpoints
    WHATSAPP: {
        CONFIG: `${V1}/whatsapp/config`,
        CONFIG_TEST: `${V1}/whatsapp/config/test`,
        MESSAGES_SEARCH: `${V1}/whatsapp/messages/search`,
        MESSAGES_STATS: `${V1}/whatsapp/messages/stats`,
        SEND: `${V1}/whatsapp/send`,
        BROADCAST: `${V1}/whatsapp/broadcast`,
        RETRY: `${V1}/whatsapp/retry`,
    },

};

export default ENDPOINTS;
