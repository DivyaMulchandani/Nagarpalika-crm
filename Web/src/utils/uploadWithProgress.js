import { BASE } from "../api/index";

/**
 * POST a FormData with upload progress (fetch cannot report upload progress).
 * Resolves with the parsed JSON body; rejects with an Error carrying the
 * server's message. `onProgress(percent)` is called as bytes go out.
 */
export function uploadWithProgress(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}${path}`);
    xhr.withCredentials = true;
    xhr.timeout = 5 * 60 * 1000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      let json = {};
      try { json = JSON.parse(xhr.responseText || "{}"); } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300 && json?.isOk !== false) {
        onProgress?.(100);
        resolve(json);
      } else if (xhr.status === 413) {
        reject(new Error("File is too large."));
      } else {
        reject(new Error(json?.message || "Upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Network problem — upload failed. Please try again."));
    xhr.ontimeout = () => reject(new Error("Upload took too long. Please check your connection and try again."));
    xhr.send(formData);
  });
}
