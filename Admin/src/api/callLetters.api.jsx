import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const searchCallLetters       = (params)        => api.post(ENDPOINTS.CALL_LETTERS.SEARCH, params);
export const patchCallLetter         = (advtNo, data)  => api.patch(ENDPOINTS.CALL_LETTERS.BY_ADVT(advtNo), data);
export const uploadRollNumbers       = (advtNo, fd)    => api.post(ENDPOINTS.CALL_LETTERS.ROLL_NUMBERS(advtNo), fd, { headers: { "Content-Type": "multipart/form-data" } });
export const getCallLetterPreviewUrl = (advtNo)        => ENDPOINTS.CALL_LETTERS.PREVIEW(advtNo);
