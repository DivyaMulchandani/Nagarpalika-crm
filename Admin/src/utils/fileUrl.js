import api from "../api/index";

const cache = new Map();
const CACHE_MS = 14 * 60 * 1000;

export const normalizeStorageKey = (filePath) => {
  if (!filePath) return null;
  return String(filePath).replace(/\\/g, "/").replace(/^uploads\//, "");
};

export const getSignedFileUrl = async (filePath) => {
  const key = normalizeStorageKey(filePath);
  if (!key) return null;

  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;

  const res = await api.get("/documents/signed-url", { params: { key } });
  const url = res.data?.data?.url;
  if (url) cache.set(key, { url, exp: Date.now() + CACHE_MS });
  return url || null;
};

export const resolveDisplayUrl = async ({ url, path }) => {
  if (url) return url;
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return getSignedFileUrl(path);
};
