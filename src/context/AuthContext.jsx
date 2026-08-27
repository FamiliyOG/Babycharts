import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import i18n from '../i18n/index.js';
import {
  getMe,
  updateMe,
  loginUser,
  registerUser,
  logoutUser,
  joinFamilyWithCode,
} from '../utils/api.js';
import { clearFamilyStoredData } from '../utils/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeFamily, setActiveFamily] = useState(null);
  const [families, setFamilies] = useState([]);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('babycharts_token'));
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false);

  const syncUserLanguage = useCallback((loadedUser) => {
    if (loadedUser?.language && ['de', 'en', 'th'].includes(loadedUser.language)) {
      if (i18n.language !== loadedUser.language) {
        i18n.changeLanguage(loadedUser.language);
      }
    }
  }, []);

  const refreshUser = useCallback(
    async (targetFamilyId = null) => {
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
        syncUserLanguage(res.data.user);
        setActiveFamily(res.data.family);
        setFamilies(res.data.families || []);
      } else {
        logoutUser();
        setUser(null);
        setActiveFamily(null);
        setFamilies([]);
      }
      setIsLoading(false);
    },
    [syncUserLanguage]
  );

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('babycharts_token');
    if (!token) return;

    getMe().then((res) => {
      if (!isMounted) return;
      if (res.ok && res.data?.user) {
        setUser(res.data.user);
        syncUserLanguage(res.data.user);
        setActiveFamily(res.data.family);
        setFamilies(res.data.families || []);
      } else {
        logoutUser();
        setUser(null);
        setActiveFamily(null);
        setFamilies([]);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [syncUserLanguage]);

  const login = useCallback(async (email, password, totpCode = '') => {
    const res = await loginUser(email, password, totpCode);
    if (res.data?.requires2FA) {
      return { ok: false, requires2FA: true, message: res.data.message };
    }
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      setActiveFamily(res.data.family);
      setFamilies(res.data.families || []);
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
      setIsAuthModalOpen(false);
      return { ok: true };
    }
    return { ok: false, error: res.error || 'Registrierung fehlgeschlagen.' };
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    clearFamilyStoredData();
    setUser(null);
    setActiveFamily(null);
    setFamilies([]);
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

  const updateUserProfile = useCallback(async (updates) => {
    // Optimistic UI update so the avatar changes instantly in the frontend
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
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
      updateUserProfile,
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
      updateUserProfile,
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
