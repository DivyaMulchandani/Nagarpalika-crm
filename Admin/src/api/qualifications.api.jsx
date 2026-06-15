import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const searchQualifications   = (params)   => api.post(ENDPOINTS.QUALIFICATIONS.SEARCH, params);
export const getAllQualifications    = (params)   => api.get(ENDPOINTS.QUALIFICATIONS.BASE, { params });
export const getQualificationById   = (id)       => api.get(ENDPOINTS.QUALIFICATIONS.BY_ID(id));
export const createQualification    = (data)     => api.post(ENDPOINTS.QUALIFICATIONS.BASE, data);
export const updateQualification    = (id, data) => api.put(ENDPOINTS.QUALIFICATIONS.BY_ID(id), data);
export const deleteQualification    = (id)       => api.delete(ENDPOINTS.QUALIFICATIONS.BY_ID(id));
