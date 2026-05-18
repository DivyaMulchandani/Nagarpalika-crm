/**
 * Companies API Service
 * Handles all company-related API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Create a new company
 * @param {FormData} data - Company data with logo/favicon files
 * @returns {Promise}
 */
export const createCompany = async (data) => {
    return api.post(ENDPOINTS.COMPANIES.BASE, data, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
};

/**
 * Get current user details using session
 * No ID needed - uses session cookie for authentication
 * @returns {Promise}
 */
export const getCurrentUserDetails = async () => {
    return api.get(ENDPOINTS.COMPANIES.ME);
};

/**
 * Get company by ID (for admin use cases)
 * @param {string} id - Company ID
 * @returns {Promise}
 */
export const getCompanyById = async (id) => {
    return api.get(ENDPOINTS.COMPANIES.BY_ID(id));
};

/**
 * Update company
 * @param {string} id - Company ID
 * @param {FormData} data - Updated company data
 * @returns {Promise}
 */
export const updateCompany = async (id, data) => {
    return api.put(ENDPOINTS.COMPANIES.BY_ID(id), data, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
};

export default {
    createCompany,
    getCurrentUserDetails,
    getCompanyById,
    updateCompany,
};

