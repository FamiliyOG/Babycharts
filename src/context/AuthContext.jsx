import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMe,
  updateMe,
  loginUser,
  registerUser,
  logoutUser,
  joinFamilyWithCode,
} from '../utils/api.js';

const AuthContext = createContext(null);

const CACHED_USER_KEY = 'babycharts_cached_user';
const CACHED_FAMILY_KEY = 'babycharts_cached_family';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('babycharts_token');
    if (!token) return null;
    try {
      const cached = localStorage.getItem(CACHED_USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [activeFamily, setActiveFamily] = useState(() => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('babycharts_token');
    if (!token) return null;
    try {
      const cached = localStorage.getItem(CACHED_FAMILY_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [families, setFamilies] = useState([]);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('babycharts_token');
    if (!token) return false;
    // If cached user exists, we can render immediately with zero shift while revalidating in background
    return !localStorage.getItem(CACHED_USER_KEY);
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false);

  const refreshUser = useCallback(async (targetFamilyId = null) => {
    const token = localStorage.getItem('babycharts_token');
    if (!token) {
      setUser(null);
      setActiveFamily(null);
      setFamilies([]);
      setIsLoading(false);
      return;
    }

    const res = await getMe(targetFamilyId);
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      setActiveFamily(res.data.family);
      setFamilies(res.data.families || []);
      try {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.data.user));
        localStorage.setItem(CACHED_FAMILY_KEY, JSON.stringify(res.data.family));
      } catch {
        // ignore quota errors
      }
    } else {
      logoutUser();
      setUser(null);
      setActiveFamily(null);
      setFamilies([]);
      localStorage.removeItem(CACHED_USER_KEY);
      localStorage.removeItem(CACHED_FAMILY_KEY);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('babycharts_token');
    if (!token) return;

    getMe().then((res) => {
      if (!isMounted) return;
      if (res.ok && res.data?.user) {
        setUser(res.data.user);
        setActiveFamily(res.data.family);
        setFamilies(res.data.families || []);
        try {
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.data.user));
          localStorage.setItem(CACHED_FAMILY_KEY, JSON.stringify(res.data.family));
        } catch {
          // ignore quota errors
        }
      } else {
        logoutUser();
        localStorage.removeItem(CACHED_USER_KEY);
        localStorage.removeItem(CACHED_FAMILY_KEY);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password, totpCode = '') => {
    const res = await loginUser(email, password, totpCode);
    if (res.data?.requires2FA) {
      return { ok: false, requires2FA: true, message: res.data.message };
    }
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      setActiveFamily(res.data.family);
      setFamilies(res.data.families || []);
      try {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.data.user));
        localStorage.setItem(CACHED_FAMILY_KEY, JSON.stringify(res.data.family));
      } catch {
        // ignore quota errors
      }
      setIsAuthModalOpen(false);
      return { ok: true };
    }
    return { ok: false, error: res.error || 'Anmeldung fehlgeschlagen.' };
  }, []);

  const register = useCallback(async ({ name, email, password, familyName, inviteCode }) => {
    const res = await registerUser({ name, email, password, familyName, inviteCode });
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      setActiveFamily(res.data.family);
      setFamilies(res.data.families || []);
      try {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.data.user));
        localStorage.setItem(CACHED_FAMILY_KEY, JSON.stringify(res.data.family));
      } catch {
        // ignore quota errors
      }
      setIsAuthModalOpen(false);
      return { ok: true };
    }
    return { ok: false, error: res.error || 'Registrierung fehlgeschlagen.' };
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
    setActiveFamily(null);
    setFamilies([]);
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(CACHED_FAMILY_KEY);
  }, []);

  const switchFamily = useCallback(
    async (familyId) => {
      await refreshUser(familyId);
    },
    [refreshUser]
  );

  const joinFamily = useCallback(
    async (code) => {
      const res = await joinFamilyWithCode(code);
      if (res.ok) {
        await refreshUser(res.data?.family?.id);
        return { ok: true, message: res.data?.message };
      }
      return { ok: false, error: res.error || 'Beitritt fehlgeschlagen.' };
    },
    [refreshUser]
  );

  const updateProfile = useCallback(async (updates) => {
    const res = await updateMe(updates);
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      return { ok: true, message: res.data.message };
    }
    return { ok: false, error: res.error || 'Fehler beim Aktualisieren des Profils.' };
  }, []);

  // Role helpers: 'admin' | 'editor' | 'viewer'
  const userRole = activeFamily?.role || 'admin';
  const canEdit = !user || userRole === 'admin' || userRole === 'editor';
  const isAdmin = !user || userRole === 'admin';
  const isDev = Boolean(user?.isDev || user?.role === 'superadmin');

  const contextValue = useMemo(
    () => ({
      user,
      activeFamily,
      families,
      userRole,
      canEdit,
      isAdmin,
      isDev,
      isLoading,
      isAuthModalOpen,
      setIsAuthModalOpen,
      isFamilyModalOpen,
      setIsFamilyModalOpen,
      is2FaModalOpen,
      setIs2FaModalOpen,
      login,
      register,
      logout,
      switchFamily,
      joinFamily,
      refreshUser,
      updateProfile,
    }),
    [
      user,
      activeFamily,
      families,
      userRole,
      canEdit,
      isAdmin,
      isDev,
      isLoading,
      isAuthModalOpen,
      isFamilyModalOpen,
      is2FaModalOpen,
      login,
      register,
      logout,
      switchFamily,
      joinFamily,
      refreshUser,
      updateProfile,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
