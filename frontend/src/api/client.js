// Storage keys. Persisted across reloads.
const TOKEN_KEY = 'hone_token';
const USER_KEY = 'hone_user';

// API base. Supports both env var names (VITE_API_BASE_URL preferred, legacy
// VITE_API_BASE accepted) and falls back to '/api' which works with the
// Vercel rewrite to Railway and with Vite's dev proxy.
const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  '/api';
const BASE = String(RAW_BASE).replace(/\/$/, '');

// ---------------------------------------------------------------------------
// Persisted auth — the source of truth is the server, but we cache the user
// in localStorage so we don't render "logged out" on every hard refresh
// while /auth/me is in flight.
// ---------------------------------------------------------------------------

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Back-compat: any caller still using setToken(null) will now also wipe
// the cached user, which is the desired behaviour.
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else clearAuth();
}

// ---------------------------------------------------------------------------
// Global 401 handler. AuthContext registers a callback here on mount; we
// fire it on every 401 response so stale auth gets cleared, the user is
// told, and the app bounces to /login. Implemented as a module-level hook
// (not a React context method) because api/client.js is imported by code
// paths that aren't inside the React tree.
// ---------------------------------------------------------------------------

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === 'function' ? fn : null;
}

// ---------------------------------------------------------------------------
// Request core
// ---------------------------------------------------------------------------

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

    // A 401 means the bearer token is invalid, expired, or refers to a
    // user that no longer exists (e.g. after a DB reseed). Fire the
    // registered handler so stale auth state can be cleared and the user
    // routed to /login. We still throw the error so the caller knows the
    // request failed; the caller can check err.status === 401 and skip
    // its own error toast to avoid a duplicate.
    if (res.status === 401 && unauthorizedHandler) {
      try {
        unauthorizedHandler(err);
      } catch (_e) {
        /* never let the handler break the request flow */
      }
    }

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
