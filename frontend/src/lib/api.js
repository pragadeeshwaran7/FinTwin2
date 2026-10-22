const BASE = import.meta.env.VITE_API_BASE || '';
const TOKEN_KEY = 'fintwin-token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: session-only login */
  }
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

export async function api(path, { method = 'GET', body, query, raw = false } = {}) {
  const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '' && v !== null))}` : '';
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}/api${path}${qs}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the FinTwin server. Is the backend running on port 5001?', 0);
  }
  if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthorized();
  if (raw) {
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
    return res;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new ApiError(data.message || `Request failed (${res.status})`, res.status);
  return data;
}

export async function downloadFile(path, query, filename) {
  const res = await api(path, { query, raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
