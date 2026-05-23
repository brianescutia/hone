import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  getToken,
  getStoredUser,
  saveAuth,
  clearAuth,
  setUnauthorizedHandler,
} from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: hydrate auth state from localStorage, then validate against
  // the server.
  //
  //   - Reads hone_token. If absent, we're done; user stays null.
  //   - Reads hone_user. If present, we set it optimistically so the UI
  //     doesn't flash "logged out" while /auth/me is in flight.
  //   - Calls GET /auth/me. On 200, refresh both state and cache. On 401
  //     (stale token, e.g. signed with an old JWT_SECRET, or referring to
  //     a user that's been deleted by a DB reseed), clear everything; the
  //     global unauthorizedHandler will also fire and route to /login.
  //   - On network or 5xx errors, keep the optimistic cached state so the
  //     user can retry without being kicked out.
  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    const cachedUser = getStoredUser();

    if (!token) {
      setLoading(false);
      return;
    }

    if (cachedUser) setUser(cachedUser);

    (async () => {
      try {
        const { user: fresh } = await api.get('/auth/me');
        if (cancelled) return;
        setUser(fresh);
        saveAuth(token, fresh);
      } catch (err) {
        if (cancelled) return;
        if (err.status === 401) {
          // Defensive — global handler will also do this, but make sure
          // local state matches even if the handler is unregistered.
          clearAuth();
          setUser(null);
        }
        // For non-401 errors, leave the optimistic cached user in place.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register a global handler that fires on EVERY 401 response from the
  // API client. Clears storage, drops user state, toasts, and bounces to
  // /login — except when we're already on an auth page (to avoid a toast
  // loop during /auth/me on a fresh /login load with a stale token).
  useEffect(() => {
    const handler = () => {
      clearAuth();
      setUser(null);
      const path = window.location.pathname;
      const onAuthPage =
        path === '/login' ||
        path === '/signup' ||
        path === '/manager-login' ||
        path === '/verify-email';
      if (!onAuthPage) {
        toast.error('Please sign in again.');
        navigate('/login', { replace: true });
      }
    };
    setUnauthorizedHandler(handler);
    return () => setUnauthorizedHandler(null);
  }, [navigate, toast]);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.post('/auth/login', { email, password });
    saveAuth(token, user);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.post('/auth/register', payload);
    if (data.token && data.user) {
      saveAuth(data.token, data.user);
      setUser(data.user);
    }
    return data;
  }, []);

  // Exchange a Google ID token for our app JWT + user, and persist both.
  const loginWithGoogle = useCallback(async (credential) => {
    const data = await api.post('/auth/google', { credential });
    saveAuth(data.token, data.user);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user: fresh } = await api.get('/auth/me');
      const token = getToken();
      if (token) saveAuth(token, fresh);
      setUser(fresh);
      return fresh;
    } catch (err) {
      if (err.status === 401) {
        clearAuth();
        setUser(null);
      }
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        refresh,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
