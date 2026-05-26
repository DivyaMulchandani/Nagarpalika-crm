import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const searchNotices      = (params)       => api.post(ENDPOINTS.NOTICES.SEARCH, params);
export const getNoticeById      = (id)           => api.get(ENDPOINTS.NOTICES.BY_ID(id));
export const createNotice       = (data)         => api.post(ENDPOINTS.NOTICES.BASE, data);
export const updateNotice       = (id, data)     => api.patch(ENDPOINTS.NOTICES.BY_ID(id), data);
export const updateNoticeStatus = (id, status)   => api.patch(ENDPOINTS.NOTICES.STATUS(id), { status });
export const uploadNoticePdf    = (id, fd)       => api.post(ENDPOINTS.NOTICES.PDF(id), fd, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteNotice       = (id)           => api.delete(ENDPOINTS.NOTICES.BY_ID(id));
