/**
 * Helpers for downloading Axios `responseType: "blob"` responses.
 *
 * When a blob endpoint fails, the server still replies with a JSON body — but
 * because we asked for a blob, Axios hands us that JSON as a Blob. These helpers
 * detect that case and surface the real error message.
 */

/**
 * Save a successful blob response as a file download.
 * Throws with the server's message when the blob is actually a JSON error.
 * @returns {Promise<string>} the filename used.
 */
export const saveBlobResponse = async (res, fallbackName) => {
  const blob = res.data;
  if (blob?.type?.includes("application/json")) {
    const json = JSON.parse(await blob.text());
    throw new Error(json?.message || "Download failed");
  }

  const disposition = res.headers?.["content-disposition"] || "";
  const matched = disposition.match(/filename="?([^";]+)"?/i);
  const filename = matched?.[1] || fallbackName;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return filename;
};

/** Extract a human-readable message from a failed blob request. */
export const parseBlobError = async (err, fallback = "Download failed") => {
  const errBlob = err?.response?.data;
  if (errBlob instanceof Blob && errBlob.type?.includes("application/json")) {
    try {
      const json = JSON.parse(await errBlob.text());
      return json?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return err?.message || fallback;
};
