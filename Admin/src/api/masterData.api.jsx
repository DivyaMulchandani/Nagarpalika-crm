/**
 * Master Data API Service
 * Handles all master data-related API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Get all master data (with optional filters)
 * @param {Object} params - Search parameters (category, isActive, search)
 * @returns {Promise}
 */
export const getMasterData = async (params) => {
    return api.get(ENDPOINTS.MASTER_DATA.BASE, { params });
};

/**
 * Get all active master data grouped by category
 * @returns {Promise}
 */
export const getGroupedMasterData = async () => {
    return api.get(ENDPOINTS.MASTER_DATA.GROUPED);
};

/**
 * Get master data by ID
 * @param {string} id - Master Data ID
 * @returns {Promise}
 */
export const getMasterDataById = async (id) => {
    return api.get(ENDPOINTS.MASTER_DATA.BY_ID(id));
};

/**
 * Create a new master data entry
 * @param {Object} data - Master data object
 * @returns {Promise}
 */
export const createMasterData = async (data) => {
    return api.post(ENDPOINTS.MASTER_DATA.BASE, data);
};

/**
 * Update master data
 * @param {string} id - Master Data ID
 * @param {Object} data - Updated data
 * @returns {Promise}
 */
export const updateMasterData = async (id, data) => {
    return api.put(ENDPOINTS.MASTER_DATA.BY_ID(id), data);
};

/**
 * Delete master data
 * @param {string} id - Master Data ID
 * @returns {Promise}
 */
export const deleteMasterData = async (id) => {
    return api.delete(ENDPOINTS.MASTER_DATA.BY_ID(id));
};

/**
 * Bulk reorder master data
 * @param {Array} items - Array of objects with _id and order
 * @returns {Promise}
 */
export const reorderMasterData = async (items) => {
    return api.put(ENDPOINTS.MASTER_DATA.REORDER, { items });
};

export default {
    getMasterData,
    getGroupedMasterData,
    getMasterDataById,
    createMasterData,
    updateMasterData,
    deleteMasterData,
    reorderMasterData,
};
