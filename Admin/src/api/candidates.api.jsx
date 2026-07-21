import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const searchCandidates = (params) => api.post(ENDPOINTS.CANDIDATES.SEARCH, params);
export const getCandidateById = (id)     => api.get(ENDPOINTS.CANDIDATES.BY_ID(id));
export const exportCandidates = (params) => api.post(ENDPOINTS.CANDIDATES.EXPORT, params, { responseType: "blob", timeout: 300000 });
export const exportCandidatesZip = (params) => api.post(ENDPOINTS.CANDIDATES.EXPORT_ZIP, params, { responseType: "blob", timeout: 600000 });
