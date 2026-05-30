/**
 * API Endpoint Constants
 * All API endpoints defined in one place for easy maintenance.
 */

const V1 = "/api/v1";

export const ENDPOINTS = {
    AUTH: {
        COMPANY_LOGIN:   `${V1}/auth/company/login`,
        EMPLOYEE_LOGIN:  `${V1}/auth/employee/login`,
        ME:              `${V1}/auth/me`,
        LOGOUT:          `${V1}/auth/logout`,
        OTP_SEND:        `${V1}/auth/otp/send`,
        OTP_VERIFY:      `${V1}/auth/otp/verify`,
        PASSWORD_RESET:  `${V1}/auth/password/reset`,
        VERIFY_SESSION:  `${V1}/auth/verify-session`,
    },

    COMPANIES: {
        BASE:  `${V1}/companies`,
        ME:    `${V1}/companies/getCompanyDetails`,
        BY_ID: (id) => `${V1}/companies/${id}`,
    },

    DEPARTMENTS: {
        BASE:   `${V1}/departments`,
        BY_ID:  (id) => `${V1}/departments/${id}`,
        SEARCH: `${V1}/departments/search`,
    },

    EMPLOYEES: {
        BASE:           `${V1}/employees`,
        BY_ID:          (id) => `${V1}/employees/${id}`,
        SEARCH:         `${V1}/employees/search`,
        RESET_PASSWORD: (id) => `${V1}/employees/${id}/reset-password`,
    },

    COUNTRIES: {
        BASE:   `${V1}/countries`,
        BY_ID:  (id) => `${V1}/countries/${id}`,
        SEARCH: `${V1}/countries/search`,
        STATES: (countryId) => `${V1}/countries/${countryId}/states`,
    },

    STATES: {
        BASE:   `${V1}/states`,
        BY_ID:  (id) => `${V1}/states/${id}`,
        SEARCH: `${V1}/states/search`,
        CITIES: (stateId) => `${V1}/states/${stateId}/cities`,
    },

    CITIES: {
        BASE:   `${V1}/cities`,
        BY_ID:  (id) => `${V1}/cities/${id}`,
        SEARCH: `${V1}/cities/search`,
    },

    LOCATIONS: {
        BASE: `${V1}/locations`,
    },

    MENU_GROUPS: {
        BASE:   `${V1}/menu-groups`,
        BY_ID:  (id) => `${V1}/menu-groups/${id}`,
        SEARCH: `${V1}/menu-groups/search`,
    },

    MENUS: {
        BASE:      `${V1}/menus`,
        BY_ID:     (id) => `${V1}/menus/${id}`,
        SEARCH:    `${V1}/menus/search`,
        BY_GROUPS: `${V1}/menus/by-groups`,
    },

    ROLES: {
        BASE:   `${V1}/roles`,
        BY_ID:  (id) => `${V1}/roles/${id}`,
        SEARCH: `${V1}/roles/search`,
    },

    EMAIL_SETUPS: {
        BASE:   `${V1}/email-setups`,
        BY_ID:  (id) => `${V1}/email-setups/${id}`,
        SEARCH: `${V1}/email-setups/search`,
    },

    EMAIL_FOR: {
        BASE:   `${V1}/email-for`,
        BY_ID:  (id) => `${V1}/email-for/${id}`,
        SEARCH: `${V1}/email-for/search`,
    },

    EMAIL_TEMPLATES: {
        BASE:             `${V1}/email-templates`,
        BY_ID:            (id) => `${V1}/email-templates/${id}`,
        SEARCH:           `${V1}/email-templates/search`,
        UPLOAD_SIGNATURE: `${V1}/email-templates/upload-signature`,
    },

    EMPLOYEE_ROLES: {
        BASE:  `${V1}/employee-roles`,
        BY_ID: (id) => `${V1}/employee-roles/${id}`,
    },

    MASTER_DATA: {
        BASE:    `${V1}/master-data`,
        BY_ID:   (id) => `${V1}/master-data/${id}`,
        GROUPED: `${V1}/master-data/grouped`,
        REORDER: `${V1}/master-data/reorder`,
    },

    ANALYTICS: {
        DASHBOARD:                  `${V1}/analytics/dashboard`,
        REPORT_FEE_COLLECTION:      `${V1}/analytics/reports/fee-collection`,
        REPORT_APPOINTMENTS:        `${V1}/analytics/reports/appointments`,
        REPORT_REVENUE:             `${V1}/analytics/reports/revenue`,
        REPORT_PATIENTS:            `${V1}/analytics/reports/patients`,
        REPORT_FOLLOW_UPS:          `${V1}/analytics/reports/follow-ups`,
        REPORT_DOCTOR_UTILIZATION:  `${V1}/analytics/reports/doctor-utilization`,
    },

    WHATSAPP: {
        CONFIG:          `${V1}/whatsapp/config`,
        CONFIG_TEST:     `${V1}/whatsapp/config/test`,
        MESSAGES_SEARCH: `${V1}/whatsapp/messages/search`,
        MESSAGES_STATS:  `${V1}/whatsapp/messages/stats`,
        SEND:            `${V1}/whatsapp/send`,
        BROADCAST:       `${V1}/whatsapp/broadcast`,
        RETRY:           `${V1}/whatsapp/retry`,
    },

    // ── Recruitment Portal ────────────────────────────────────────────────────
    ADVERTISEMENTS: {
        BASE:    `${V1}/advertisements`,
        BY_ID:   (id) => `${V1}/advertisements/${id}`,
        STATUS:  (id) => `${V1}/advertisements/${id}/status`,
        PDF:     (id) => `${V1}/advertisements/${id}/pdf`,
        SEARCH:  `${V1}/advertisements/search`,
        STATS:   (id) => `${V1}/advertisements/${id}/stats`,
    },

    CANDIDATES: {
        BASE:    `${V1}/candidates`,
        BY_ID:   (id) => `${V1}/candidates/${id}`,
        SEARCH:  `${V1}/candidates/search`,
        EXPORT:  `${V1}/candidates/export`,
    },

    APPLICATIONS: {
        BASE:    `${V1}/applications`,
        BY_REF:  (ref) => `${V1}/applications/admin/${ref}`,
        LIST:    `${V1}/applications/list`,
        SEARCH:  `${V1}/applications/search`,
        EXPORT:  `${V1}/applications/export`,
        STATUS:  (id) => `${V1}/applications/${id}/status`,
    },

    FEE_PAYMENTS: {
        BASE:           `${V1}/fee-payments`,
        BY_ID:          (id) => `${V1}/fee-payments/${id}`,
        RECONCILIATION: `${V1}/fee-payments/reconciliation`,
        MANUAL_VERIFY:  (id) => `${V1}/fee-payments/${id}/manual-verify`,
        SEARCH:         `${V1}/fee-payments/search`,
    },

    CALL_LETTERS: {
        BASE:         `${V1}/call-letters`,
        BY_ADVT:      (advtNo) => `${V1}/call-letters/${encodeURIComponent(advtNo)}`,
        ROLL_NUMBERS: (advtNo) => `${V1}/call-letters/${encodeURIComponent(advtNo)}/roll-numbers`,
        PREVIEW:      (advtNo) => `${V1}/call-letters/${encodeURIComponent(advtNo)}/preview`,
        SEARCH:       `${V1}/call-letters/search`,
    },

    NOTICES: {
        BASE:    `${V1}/notices`,
        BY_ID:   (id) => `${V1}/notices/${id}`,
        STATUS:  (id) => `${V1}/notices/${id}/status`,
        PDF:     (id) => `${V1}/notices/${id}/pdf`,
        SEARCH:  `${V1}/notices/search`,
    },

    HELP_QUERIES: {
        BASE:   `${V1}/help/queries`,
        STATUS: (id) => `${V1}/help/queries/${id}/status`,
    },
};

export default ENDPOINTS;
