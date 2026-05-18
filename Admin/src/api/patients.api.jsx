/**
 * Patients API Service
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createPatient = async (data) => {
    return api.post(ENDPOINTS.PATIENTS.BASE, data);
};

export const quickCreatePatient = async (data) => {
    return api.post(ENDPOINTS.PATIENTS.QUICK_CREATE, data);
};

export const getAllPatients = async () => {
    return api.get(ENDPOINTS.PATIENTS.BASE);
};

export const getPatientById = async (id) => {
    return api.get(ENDPOINTS.PATIENTS.BY_ID(id));
};

export const updatePatient = async (id, data) => {
    return api.put(ENDPOINTS.PATIENTS.BY_ID(id), data);
};

export const deletePatient = async (id) => {
    return api.delete(ENDPOINTS.PATIENTS.BY_ID(id));
};

export const restorePatient = async (id) => {
    return api.post(ENDPOINTS.PATIENTS.RESTORE(id));
};

export const searchPatients = async (params) => {
    return api.post(ENDPOINTS.PATIENTS.SEARCH, params);
};

export const duplicateCheck = async (params) => {
    return api.get(ENDPOINTS.PATIENTS.DUPLICATE_CHECK, { params });
};

export const listDocuments = async (patientId) => {
    return api.get(ENDPOINTS.PATIENTS.DOCUMENTS_BY_PATIENT(patientId));
};

export const uploadDocument = async (patientId, formData) => {
    return api.post(
        ENDPOINTS.PATIENTS.DOCUMENTS_BY_PATIENT(patientId),
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
};

export const deleteDocument = async (documentId) => {
    return api.delete(ENDPOINTS.PATIENTS.DOCUMENT_BY_ID(documentId));
};

export default {
    createPatient,
    quickCreatePatient,
    getAllPatients,
    getPatientById,
    updatePatient,
    deletePatient,
    restorePatient,
    searchPatients,
    duplicateCheck,
    listDocuments,
    uploadDocument,
    deleteDocument,
};
