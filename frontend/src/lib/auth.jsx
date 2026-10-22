import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';

const AuthContext = createContext(null);

/** Per-user browser storage key, so two people sharing a browser never see each other's data. */
export const userKey = (user, name) => `fintwin:${user?.id || 'anon'}:${name}`;

function clearSessionData() {
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith('fintwin:')) sessionStorage.removeItem(k);
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const dropSession = useCallback(() => {
    setToken(null);
    clearSessionData();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(dropSession);
    if (!getToken()) return;
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(dropSession)
      .finally(() => setLoading(false));
  }, [dropSession]);

  const value = useMemo(() => {
    const finish = (d) => {
      if (d.twoFactorRequired) return d; // caller shows the code step
      clearSessionData();
      setToken(d.token);
      setUser(d.user);
      return d;
    };
    return {
      user,
      loading,
      login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }).then(finish),
      verify2fa: (challenge, code) => api('/auth/login/2fa', { method: 'POST', body: { challenge, code } }).then(finish),
      googleLogin: (credential) => api('/auth/google', { method: 'POST', body: { credential } }).then(finish),
      register: (name, email, password) => api('/auth/register', { method: 'POST', body: { name, email, password } }).then(finish),
      updateProfile: (patch) => api('/auth/me', { method: 'PATCH', body: patch }).then((d) => setUser(d.user)),
      refreshUser: () => api('/auth/me').then((d) => setUser(d.user)),
      logout: async () => {
        try {
          await api('/auth/logout', { method: 'POST' });
        } catch {
          /* session may already be gone */
        }
        dropSession();
      },
      dropSession,
    };
  }, [user, loading, dropSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
