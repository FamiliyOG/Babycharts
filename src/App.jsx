import { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import Header from './components/Header.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import AppModals from './components/AppModals.jsx';
import AppContent from './components/AppContent.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import {
  importProfiles,
  fetchProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  logClientError,
} from './utils/api.js';
import { getAppSettings, saveAppSettings } from './utils/storage.js';
import { DEMO_PROFILES } from './data/demoProfiles.js';
import { calculateAge } from './utils/percentileCalc.js';
import { generateChildICalendar } from './utils/calendarGenerator.js';
import { exportChildToCSV } from './utils/csvExporter.js';

function MainApp() {
  const {
    user,
    activeFamily,
    canEdit,
    isDev,
    userRole,
    isLoading,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isFamilyModalOpen,
    setIsFamilyModalOpen,
    is2FaModalOpen,
    setIs2FaModalOpen,
  } = useAuth();

  const familyId = activeFamily?.id || null;
  const [profiles, setProfiles] = useState([]);
  const [activeChildId, setActiveChildId] = useState(null);

  const handleSelectChild = (childId) => {
    setActiveChildId(childId);
  };

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const applySyncedProfiles = (serverProfiles) => {
      if (!isMounted || !Array.isArray(serverProfiles)) return;
      setProfiles(serverProfiles);
      setActiveChildId((prev) => {
        const exists = serverProfiles.some((p) => p.id === prev);
        return exists ? prev : serverProfiles[0]?.id || null;
      });
    };

    const syncServerProfiles = async () => {
      try {
        const serverProfiles = await fetchProfiles(familyId);
        applySyncedProfiles(serverProfiles);
      } catch {
        // Ignore network offline sync errors
      }
    };

    syncServerProfiles();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncServerProfiles();
      }
    };

    window.addEventListener('focus', syncServerProfiles);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', syncServerProfiles);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, familyId]);

  const [activeTab, setActiveTab] = useState(() => {
    const saved = getAppSettings();
    return saved.lastTab || 'growth';
  });

  useEffect(() => {
    saveAppSettings({ lastTab: activeTab });
  }, [activeTab]);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isMeasurementFormOpen, setIsMeasurementFormOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const effectiveProfiles = user ? profiles : [];
  const activeChild =
    effectiveProfiles.find((p) => p.id === activeChildId) || effectiveProfiles[0] || null;

  const birthdate = activeChild?.birthdate;
  const ageInfo = useMemo(() => {
    if (!birthdate) return null;
    return calculateAge(birthdate);
  }, [birthdate]);

  const childMeasurements = activeChild?.measurements;
  const activeChildMeasurements = useMemo(() => {
    if (!childMeasurements) return [];
    return [...childMeasurements].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [childMeasurements]);

  const handleSaveProfile = async (profileData) => {
    if (!canEdit) {
      showToast('Besucher haben keine Berechtigung, Daten zu ändern.');
      return;
    }

    try {
      const isNew = !profileData.id || !profiles.some((p) => p.id === profileData.id);
      if (isNew) {
        const payload = {
          ...profileData,
          id: profileData.id || crypto.randomUUID(),
          familyId: activeFamily?.id,
          measurements: profileData.measurements || [],
        };
        const serverProfile = await createProfile(payload);
        setProfiles((prev) => [...prev, serverProfile]);
        setActiveChildId(serverProfile.id);
        showToast(`Profil "${serverProfile.name}" erfolgreich erstellt! 🎉`);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } else {
        const payload = { ...profileData, familyId: profileData.familyId || activeFamily?.id };
        const updated = await updateProfile(payload.id, payload);
        setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast(`Profil "${updated.name}" aktualisiert.`);
      }
    } catch (err) {
      console.error(err);
      logClientError('Profil-Speicherfehler', err);
      showToast(
        err.status === 409
          ? 'Konflikt: Profil wurde von einem anderen Benutzer geändert.'
          : 'Fehler beim Speichern des Profils.'
      );
    }
  };

  const handleDeleteProfile = async (childId) => {
    if (!canEdit) {
      showToast('Besucher dürfen keine Profile löschen.');
      return;
    }

    try {
      await deleteProfile(childId);
      setProfiles((prev) => prev.filter((p) => p.id !== childId));
      setActiveChildId((prev) => (prev === childId ? null : prev));
      showToast('Profil gelöscht.');
    } catch (err) {
      console.error(err);
      logClientError('Profil-Löschfehler', err);
      showToast('Fehler beim Löschen des Profils.');
    }
  };

  const handleSaveMeasurement = async (measData) => {
    if (!activeChild || !canEdit) return;

    try {
      const isNew = !measData.id;
      const newEntry = {
        ...measData,
        id: measData.id || crypto.randomUUID(),
      };

      let updatedList;
      if (isNew) {
        updatedList = [...(activeChild.measurements || []), newEntry];
      } else {
        updatedList = (activeChild.measurements || []).map((m) =>
          m.id === newEntry.id ? newEntry : m
        );
      }

      await handleSaveProfile({
        ...activeChild,
        measurements: updatedList,
      });

      showToast(isNew ? 'Messwert eingetragen! 📈' : 'Messwert aktualisiert.');
      if (isNew) confetti({ particleCount: 35, spread: 40, origin: { y: 0.5 } });
    } catch (err) {
      console.error(err);
      logClientError('Messwert-Speicherfehler', err);
      showToast('Fehler beim Speichern des Messwerts.');
    }
  };

  const handleDeleteMeasurement = async (measId) => {
    if (!activeChild || !canEdit) return;
    if (!window.confirm('Möchten Sie diesen Messwert wirklich löschen?')) return;

    try {
      const updatedList = (activeChild.measurements || []).filter((m) => m.id !== measId);
      await handleSaveProfile({
        ...activeChild,
        measurements: updatedList,
      });
      showToast('Messwert gelöscht.');
    } catch (err) {
      console.error(err);
      logClientError('Messwert-Löschfehler', err);
      showToast('Fehler beim Löschen.');
    }
  };

  const handleOpenAddMeasurement = () => {
    if (!canEdit) {
      showToast('Besucher haben nur Lesezugriff.');
      return;
    }
    setEditingMeasurement(null);
    setIsMeasurementFormOpen(true);
  };

  const handleEditMeasurement = (m) => {
    if (!canEdit) {
      showToast('Besucher haben nur Lesezugriff.');
      return;
    }
    setEditingMeasurement(m);
    setIsMeasurementFormOpen(true);
  };

  const handleLoadDemoData = async () => {
    try {
      for (const demo of DEMO_PROFILES) {
        const payload = {
          ...demo,
          id: crypto.randomUUID(),
          familyId: activeFamily?.id,
        };
        await createProfile(payload);
      }
      const refreshed = await fetchProfiles(familyId);
      setProfiles(refreshed);
      if (refreshed.length > 0) setActiveChildId(refreshed[0].id);
      showToast('Demo-Profile geladen! 🎉');
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
    } catch (err) {
      console.error(err);
      logClientError('Demo-Ladefehler', err);
      showToast('Fehler beim Laden der Demo-Daten.');
    }
  };

  const handleManualPdfExport = async (format = 'a4') => {
    if (!activeChild) return;
    try {
      showToast(`Generiere ${format.toUpperCase()}-Bericht... 📄`);
      const { generateGrowthPdfReport } = await import('./utils/pdfGenerator.js');
      generateGrowthPdfReport(activeChild, format);
      showToast('PDF-Bericht erfolgreich heruntergeladen! ✅');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.4 } });
    } catch (err) {
      console.error(err);
      logClientError('PDF-Export Fehler', err);
      showToast('Fehler beim Erstellen des PDF-Berichts.');
    }
  };

  const handleExportCalendar = () => {
    if (!activeChild) return;
    try {
      generateChildICalendar(activeChild);
      showToast(`U-Vorsorge-Kalender für ${activeChild.name} exportiert!`);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.4 } });
    } catch (err) {
      console.error(err);
      logClientError('Kalender-Export Fehler', err);
      showToast('Fehler beim Erstellen des Kalenders.');
    }
  };

  const handleExportCsv = () => {
    if (!activeChild) return;
    try {
      exportChildToCSV(activeChild);
      showToast(`Excel/CSV-Tabelle für ${activeChild.name} heruntergeladen!`);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.4 } });
    } catch (err) {
      console.error(err);
      logClientError('CSV-Export Fehler', err);
      showToast('Fehler beim Erstellen der CSV-Datei.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white pb-16 md:pb-0 transition-colors duration-200 overflow-x-hidden w-full max-w-full">
      <OfflineBanner />

      <Header
        profiles={effectiveProfiles}
        activeChild={activeChild}
        onSelectChild={handleSelectChild}
        onOpenAddProfile={() => {
          if (!canEdit) {
            showToast('Besucher haben keine Berechtigung, Kinder anzulegen.');
            return;
          }
          setEditingProfile(null);
          setIsProfileModalOpen(true);
        }}
        onOpenEditProfile={(child) => {
          if (!canEdit) {
            showToast('Besucher haben nur Lesezugriff.');
            return;
          }
          setEditingProfile(child);
          setIsProfileModalOpen(true);
        }}
        onDeleteProfile={handleDeleteProfile}
        onOpenAddMeasurement={handleOpenAddMeasurement}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onManualPdfExport={handleManualPdfExport}
        onExportCalendar={handleExportCalendar}
        onExportCsv={handleExportCsv}
      />

      {userRole === 'viewer' && (
        <div className="bg-slate-900/90 border-b border-slate-800 py-2 px-4 text-center text-xs text-slate-300 flex items-center justify-center gap-2">
          <span>
            👁️ Sie betrachten diese Familiendaten als <strong>Besucher (Nur Lesen)</strong>.
          </span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col safe-area-x pb-28 md:pb-8">
        <AppContent
          isLoading={isLoading}
          user={user}
          activeChild={activeChild}
          ageInfo={ageInfo}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeChildMeasurements={activeChildMeasurements}
          handleEditMeasurement={handleEditMeasurement}
          handleDeleteMeasurement={handleDeleteMeasurement}
          handleOpenAddMeasurement={handleOpenAddMeasurement}
          handleSaveProfile={handleSaveProfile}
          canEdit={canEdit}
          isDev={isDev}
          setIsProfileModalOpen={setIsProfileModalOpen}
          handleLoadDemoData={handleLoadDemoData}
        />
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-400 mb-16 md:mb-0 safe-area-inset-bottom">
        <p>BabyCharts &copy; {new Date().getFullYear()} — WHO Child Growth Standards (0–5 Jahre)</p>
      </footer>

      {activeChild && (
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onQuickAdd={() => setIsQuickAddOpen(true)}
        />
      )}

      <AppModals
        activeChild={activeChild}
        profiles={profiles}
        setProfiles={setProfiles}
        activeFamily={activeFamily}
        importProfiles={importProfiles}
        isQuickAddOpen={isQuickAddOpen}
        setIsQuickAddOpen={setIsQuickAddOpen}
        isProfileModalOpen={isProfileModalOpen}
        setIsProfileModalOpen={setIsProfileModalOpen}
        editingProfile={editingProfile}
        setEditingProfile={setEditingProfile}
        handleSaveProfile={handleSaveProfile}
        handleDeleteProfile={handleDeleteProfile}
        isMeasurementFormOpen={isMeasurementFormOpen}
        setIsMeasurementFormOpen={setIsMeasurementFormOpen}
        editingMeasurement={editingMeasurement}
        setEditingMeasurement={setEditingMeasurement}
        handleSaveMeasurement={handleSaveMeasurement}
        handleOpenAddMeasurement={handleOpenAddMeasurement}
        isExportModalOpen={isExportModalOpen}
        setIsExportModalOpen={setIsExportModalOpen}
        handleLoadDemoData={handleLoadDemoData}
        isAuthModalOpen={isAuthModalOpen}
        setIsAuthModalOpen={setIsAuthModalOpen}
        is2FaModalOpen={is2FaModalOpen}
        setIs2FaModalOpen={setIs2FaModalOpen}
        isFamilyModalOpen={isFamilyModalOpen}
        setIsFamilyModalOpen={setIsFamilyModalOpen}
        setActiveTab={setActiveTab}
        toastMessage={toastMessage}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
