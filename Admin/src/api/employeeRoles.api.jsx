/**
 * Employee Roles API Service
 * Handles all employee role permissions API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Create employee roles (permissions for a role)
 * @param {Object} data - Employee roles data
 * @returns {Promise}
 */
export const createEmployeeRoles = async (data) => {
    return api.post(ENDPOINTS.EMPLOYEE_ROLES.BASE, data);
};

/**
 * Get employee roles by role ID
 * @param {string|Object} roleId - Role ID
 * @returns {Promise}
 */
export const getEmployeeRolesByRoleId = async (roleId) => {
    const cleanRoleId = typeof roleId === 'object' && roleId !== null
        ? (roleId._id || roleId.id || roleId.roleId)
        : roleId;
    if (!cleanRoleId || cleanRoleId === '[object Object]') {
        return { data: { isOk: true, data: [] } };
    }
    return api.get(ENDPOINTS.EMPLOYEE_ROLES.BY_ID(cleanRoleId));
};

/**
 * Update employee roles
 * @param {string|Object} roleId - Role ID
 * @param {Object} data - Updated employee roles data
 * @returns {Promise}
 */
export const updateEmployeeRoles = async (roleId, data) => {
    const cleanRoleId = typeof roleId === 'object' && roleId !== null
        ? (roleId._id || roleId.id || roleId.roleId)
        : roleId;
    return api.put(ENDPOINTS.EMPLOYEE_ROLES.BY_ID(cleanRoleId), data);
};

export default {
    createEmployeeRoles,
    getEmployeeRolesByRoleId,
    updateEmployeeRoles,
};
