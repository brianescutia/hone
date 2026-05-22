// Resolve the API base URL from env, supporting both the original name
// (VITE_API_BASE) and the name used in the latest deploy spec
// (VITE_API_BASE_URL). Falls back to '/api' which works with the Vercel
// rewrite to Railway, and locally with the Vite dev proxy.
const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  '/api';

// Strip a trailing slash so paths like `${BASE}/auth/login` don't end up
// with `//auth/login`.
const BASE = String(RAW_BASE).replace(/\/$/, '');

function getToken() {
  return localStorage.getItem('hone_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('hone_token', token);
  else localStorage.removeItem('hone_token');
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
};
