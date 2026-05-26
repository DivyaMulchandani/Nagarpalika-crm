import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const searchApplications      = (params)         => api.post(ENDPOINTS.APPLICATIONS.SEARCH, params);
export const listApplications        = (params)         => api.get(ENDPOINTS.APPLICATIONS.BASE, { params });
export const getApplicationByRef     = (ref)            => api.get(ENDPOINTS.APPLICATIONS.BY_REF(ref));
export const exportApplications      = (data)           => api.post(ENDPOINTS.APPLICATIONS.EXPORT, data);
export const updateApplicationStatus = (id, status)     => api.patch(ENDPOINTS.APPLICATIONS.STATUS(id), { status });
