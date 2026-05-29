const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = "/login";
    return null;
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || res.statusText);
  return json;
}

export const get = (path, params) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`${path}${qs}`);
};

export const post = (path, body) =>
  request(path, { method: "POST", body: JSON.stringify(body) });

export const patch = (path, body) =>
  request(path, { method: "PATCH", body: JSON.stringify(body) });
