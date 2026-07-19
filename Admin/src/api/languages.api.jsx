import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const searchLanguages   = (params)   => api.post(ENDPOINTS.LANGUAGES.SEARCH, params);
export const getAllLanguages    = (params)   => api.get(ENDPOINTS.LANGUAGES.BASE, { params });
export const getLanguageById   = (id)       => api.get(ENDPOINTS.LANGUAGES.BY_ID(id));
export const createLanguage    = (data)     => api.post(ENDPOINTS.LANGUAGES.BASE, data);
export const updateLanguage    = (id, data) => api.put(ENDPOINTS.LANGUAGES.BY_ID(id), data);
export const deleteLanguage    = (id)       => api.delete(ENDPOINTS.LANGUAGES.BY_ID(id));
