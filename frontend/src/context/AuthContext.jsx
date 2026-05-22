import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!localStorage.getItem('hone_token')) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await api.get('/auth/me');
        if (!cancelled) setUser(user);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.post('/auth/login', { email, password });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.post('/auth/register', payload);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // Exchange a Google ID token for our app JWT + user.
  const loginWithGoogle = useCallback(async (credential) => {
    const data = await api.post('/auth/google', { credential });
    setToken(data.token);
    setUser(data.user);
    return data; // { token, user, googleVerification, hostedDomain }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.get('/auth/me');
      setUser(user);
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout, refresh, setUser }}
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
