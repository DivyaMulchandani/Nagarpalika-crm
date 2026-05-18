import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createTreatmentPlan = async (data) => {
    return api.post(ENDPOINTS.TREATMENT_PLANS.BASE, data);
};

export const getTreatmentPlanById = async (id) => {
    return api.get(ENDPOINTS.TREATMENT_PLANS.BY_ID(id));
};

export const updateTreatmentPlan = async (id, data) => {
    return api.put(ENDPOINTS.TREATMENT_PLANS.BY_ID(id), data);
};

export const acceptTreatmentPlan = async (id) => {
    return api.patch(ENDPOINTS.TREATMENT_PLANS.ACCEPT(id));
};

export const deleteTreatmentPlan = async (id) => {
    return api.delete(ENDPOINTS.TREATMENT_PLANS.BY_ID(id));
};

export const searchTreatmentPlans = async (params) => {
    return api.post(ENDPOINTS.TREATMENT_PLANS.SEARCH, params);
};

export const getPatientTreatmentPlans = async (patientId) => {
    return api.get(ENDPOINTS.TREATMENT_PLANS.BY_PATIENT(patientId));
};

export default {
    createTreatmentPlan,
    getTreatmentPlanById,
    updateTreatmentPlan,
    acceptTreatmentPlan,
    deleteTreatmentPlan,
    searchTreatmentPlans,
    getPatientTreatmentPlans,
};
