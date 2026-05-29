import api from "./index";
import { ENDPOINTS } from "./endpoints";

// Configuration
export const getWhatsAppConfig = async () => {
    return await api.get(ENDPOINTS.WHATSAPP.CONFIG);
};

export const updateWhatsAppConfig = async (data) => {
    return await api.put(ENDPOINTS.WHATSAPP.CONFIG, data);
};

export const testWhatsAppConnection = async () => {
    return await api.post(ENDPOINTS.WHATSAPP.CONFIG_TEST);
};

// Messages
export const searchWhatsAppMessages = async (params) => {
    return await api.post(ENDPOINTS.WHATSAPP.MESSAGES_SEARCH, params);
};

export const getWhatsAppStats = async (params) => {
    return await api.get(ENDPOINTS.WHATSAPP.MESSAGES_STATS, { params });
};

export const sendCustomWhatsApp = async (data) => {
    return await api.post(ENDPOINTS.WHATSAPP.SEND, data);
};

export const sendWhatsAppBroadcast = async (data) => {
    return await api.post(ENDPOINTS.WHATSAPP.BROADCAST, data);
};

export const retryFailedWhatsApp = async () => {
    return await api.post(ENDPOINTS.WHATSAPP.RETRY);
};
