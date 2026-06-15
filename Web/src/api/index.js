export const BASE = import.meta.env.VITE_API_URL || "";

// Paths that may legitimately receive a 401 without meaning "session expired"
const PUBLIC_PATH_PREFIXES = [
  "/api/v1/otp/",
  "/api/v1/candidates/register/",
  "/api/v1/call-letters/",
];

async function request(path, options = {}) {
  const { silent401, ...fetchOptions } = options;
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(fetchOptions.headers || {}) },
    ...fetchOptions,
  });
  if (res.status === 401) {
    // Let the auth context drop the cached user immediately
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    const isPublicPath = PUBLIC_PATH_PREFIXES.some((p) => path.startsWith(p));
    if (!isPublicPath && !silent401) {
      const redirect = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/registration/find?redirect=${redirect}`;
    }
    throw new Error("Session expired. Please log in.");
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || res.statusText);
  return json;
}

export const get = (path, params, opts = {}) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`${path}${qs}`, opts);
};

export const post = (path, body, opts = {}) =>
  request(path, { method: "POST", body: JSON.stringify(body), ...opts });

export const patch = (path, body, opts = {}) =>
  request(path, { method: "PATCH", body: JSON.stringify(body), ...opts });
