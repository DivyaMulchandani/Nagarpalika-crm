import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createAppointment = async (data) => {
    return api.post(ENDPOINTS.APPOINTMENTS.BASE, data);
};

export const getAppointmentById = async (id) => {
    return api.get(ENDPOINTS.APPOINTMENTS.BY_ID(id));
};

export const updateAppointment = async (id, data) => {
    return api.put(ENDPOINTS.APPOINTMENTS.BY_ID(id), data);
};

export const updateAppointmentStatus = async (id, data) => {
    return api.patch(ENDPOINTS.APPOINTMENTS.STATUS(id), data);
};

export const deleteAppointment = async (id) => {
    return api.delete(ENDPOINTS.APPOINTMENTS.BY_ID(id));
};

export const searchAppointments = async (params) => {
    return api.post(ENDPOINTS.APPOINTMENTS.SEARCH, params);
};

export const getTodaysAppointments = async (params) => {
    return api.get(ENDPOINTS.APPOINTMENTS.TODAY, { params });
};

export const getFollowUpQueue = async () => {
    return api.get(ENDPOINTS.APPOINTMENTS.FOLLOW_UP_QUEUE);
};

export const getDoctorSlots = async (params) => {
    return api.get(ENDPOINTS.APPOINTMENTS.DOCTOR_SLOTS, { params });
};

export const getPatientAppointments = async (patientId) => {
    return api.get(ENDPOINTS.APPOINTMENTS.BY_PATIENT(patientId));
};

export const transferAppointment = async (appointmentId, data) => {
    return api.post(ENDPOINTS.APPOINTMENTS.TRANSFER(appointmentId), data);
};

export default {
    createAppointment,
    getAppointmentById,
    updateAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    searchAppointments,
    getTodaysAppointments,
    getFollowUpQueue,
    getDoctorSlots,
    getPatientAppointments,
    transferAppointment,
};
