import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const searchAdvertisements      = (params)       => api.post(ENDPOINTS.ADVERTISEMENTS.SEARCH, params);
export const getAllAdvertisements       = (params)       => api.get(ENDPOINTS.ADVERTISEMENTS.BASE, { params });
export const getAdvertisement          = (id)           => api.get(ENDPOINTS.ADVERTISEMENTS.BY_ID(id));
export const createAdvertisement       = (data)         => api.post(ENDPOINTS.ADVERTISEMENTS.BASE, data);
export const updateAdvertisement       = (id, data)     => api.patch(ENDPOINTS.ADVERTISEMENTS.BY_ID(id), data);
export const updateAdvertisementStatus = (id, status)   => api.patch(ENDPOINTS.ADVERTISEMENTS.STATUS(id), { status });
export const uploadAdvertisementPdf    = (id, formData) => api.post(ENDPOINTS.ADVERTISEMENTS.PDF(id), formData, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteAdvertisement       = (id)           => api.delete(ENDPOINTS.ADVERTISEMENTS.BY_ID(id));
export const getAdvertisementStats     = (id)           => api.get(ENDPOINTS.ADVERTISEMENTS.STATS(id));
