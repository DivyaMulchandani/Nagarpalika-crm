import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createPrescription = async (data) => {
    return api.post(ENDPOINTS.PRESCRIPTIONS.BASE, data);
};

export const getPrescriptionById = async (id) => {
    return api.get(ENDPOINTS.PRESCRIPTIONS.BY_ID(id));
};

export const getPrescriptionsByAppointment = async (appointmentId) => {
    return api.get(ENDPOINTS.PRESCRIPTIONS.BY_APPOINTMENT(appointmentId));
};

export const getPrescriptionsByPatient = async (patientId) => {
    return api.get(ENDPOINTS.PRESCRIPTIONS.BY_PATIENT(patientId));
};

export const updatePrescription = async (id, data) => {
    return api.put(ENDPOINTS.PRESCRIPTIONS.BY_ID(id), data);
};

export const deletePrescription = async (id) => {
    return api.delete(ENDPOINTS.PRESCRIPTIONS.BY_ID(id));
};

export default {
    createPrescription,
    getPrescriptionById,
    getPrescriptionsByAppointment,
    getPrescriptionsByPatient,
    updatePrescription,
    deletePrescription,
};
