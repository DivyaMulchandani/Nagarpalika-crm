import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createDoctor = async (data) => {
    return api.post(ENDPOINTS.DOCTORS.BASE, data);
};

export const getAllDoctors = async () => {
    return api.get(ENDPOINTS.DOCTORS.BASE);
};

export const getDoctorById = async (id) => {
    return api.get(ENDPOINTS.DOCTORS.BY_ID(id));
};

export const updateDoctor = async (id, data) => {
    return api.put(ENDPOINTS.DOCTORS.BY_ID(id), data);
};

export const deleteDoctor = async (id) => {
    return api.delete(ENDPOINTS.DOCTORS.BY_ID(id));
};

export const searchDoctors = async (params) => {
    return api.post(ENDPOINTS.DOCTORS.SEARCH, params);
};

export const resetDoctorPassword = async (id, data) => {
    return api.patch(ENDPOINTS.DOCTORS.RESET_PASSWORD(id), data);
};
