import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { TrendingUp, Syringe, Sparkles, HeartPulse, ClipboardList } from 'lucide-react';
import Header from './components/Header.jsx';
import PercentileCard from './components/PercentileCard.jsx';
import GrowthChart from './components/GrowthChart.jsx';
import UCheckupTracker from './components/UCheckupTracker.jsx';
import VaccinationTracker from './components/VaccinationTracker.jsx';
import TeethTracker from './components/TeethTracker.jsx';
import MilestoneTracker from './components/MilestoneTracker.jsx';
import HealthTracker from './components/HealthTracker.jsx';
import MeasurementTable from './components/MeasurementTable.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import MeasurementForm from './components/MeasurementForm.jsx';
import ExportImportModal from './components/ExportImportModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import TwoFactorModal from './components/TwoFactorModal.jsx';
import FamilyManagementModal from './components/FamilyManagementModal.jsx';
import WelcomeHomeScreen from './components/WelcomeHomeScreen.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import QuickAddModal from './components/QuickAddModal.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
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
  const { t } = useTranslation();
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

  // Synchronize profiles for active family when user or family changes, or when app regains focus/visibility (PWA)
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

  const [activeTab, setActiveTab] = useState('growth'); // 'growth' | 'vaccinations' | 'teeth' | 'milestones' | 'health'
  const [settings] = useState(() => getAppSettings());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isMeasurementFormOpen, setIsMeasurementFormOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Prevent background scrolling on iOS/mobile when any modal is open
  const isAnyModalOpen =
    isProfileModalOpen ||
    isMeasurementFormOpen ||
    isExportModalOpen ||
    isAuthModalOpen ||
    isFamilyModalOpen ||
    isQuickAddOpen;

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isAnyModalOpen]);

  // Active child and measurements (strictly scoped to authenticated user)
  const effectiveProfiles = user ? profiles : [];
  const activeChild =
    effectiveProfiles.find((p) => p.id === activeChildId) || effectiveProfiles[0] || null;
  const activeChildMeasurements = useMemo(
    () => activeChild?.measurements || [],
    [activeChild?.measurements]
  );

  // Age info computed at the date of the most recent measurement (newest by date)
  const latestMeasurementByDate =
    activeChildMeasurements.length > 0
      ? [...activeChildMeasurements].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      : null;
  const ageInfo = activeChild
    ? calculateAge(activeChild.birthdate, latestMeasurementByDate?.date)
    : { text: '—', monthsDecimal: 0 };

  // Toast notification helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Save settings on change
  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  // Load Demo Data Handler (Dev Account only)
  const handleLoadDemoData = () => {
    if (!isDev) return;
    setProfiles(DEMO_PROFILES);
    setActiveChildId(DEMO_PROFILES[0].id);
    importProfiles(DEMO_PROFILES, activeFamily?.id).catch(() => {});
    showToast('Demo-Daten für Noah (♂) und Mia (♀) erfolgreich geladen!');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  // Profile Management Handlers
  const handleSaveProfile = async (profileData) => {
    if (!canEdit) {
      showToast('Keine Schreibrechte für diese Familie.');
      return;
    }

    const isNew = !profileData.id || !profiles.some((p) => p.id === profileData.id);
    let updatedProfiles;

    const profileId =
      profileData.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? `child-${crypto.randomUUID()}`
        : `child-${Date.now()}`);

    const existingProfile = profiles.find((p) => p.id === profileId) || {};

    const fullProfile = {
      ...existingProfile,
      ...profileData,
      id: profileId,
      familyId: activeFamily?.id || null,
    };

    if (isNew) {
      updatedProfiles = [...profiles, fullProfile];
      setActiveChildId(fullProfile.id);
      showToast(`Profil für "${fullProfile.name}" angelegt!`);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.5 } });
      try {
        const res = await createProfile(fullProfile);
        if (!res) {
          showToast('Hinweis: Profil offline gespeichert, Server nicht erreicht.');
        }
      } catch (err) {
        console.error('Error creating profile:', err);
      }
    } else {
      updatedProfiles = profiles.map((p) => (p.id === fullProfile.id ? fullProfile : p));
      showToast(`Profil "${fullProfile.name}" aktualisiert.`);
      try {
        const res = await updateProfile(fullProfile.id, fullProfile);
        if (!res) {
          showToast('Hinweis: Änderung offline gespeichert, Server nicht erreicht.');
        }
      } catch (err) {
        console.error('Error updating profile:', err);
      }
    }

    setProfiles(updatedProfiles);
    setIsProfileModalOpen(false);
    setEditingProfile(null);
  };

  const handleDeleteProfile = async (profileId) => {
    if (!canEdit) {
      showToast('Keine Berechtigung zum Löschen.');
      return;
    }

    const updatedProfiles = profiles.filter((p) => p.id !== profileId);
    setProfiles(updatedProfiles);
    deleteProfile(profileId).catch(() => {});

    if (activeChildId === profileId) {
      setActiveChildId(updatedProfiles[0]?.id || null);
    }
    showToast('Profil gelöscht.');
  };

  // Measurement Management Handlers
  const handleSaveMeasurement = async (measurementData) => {
    if (!canEdit) {
      showToast('Besucher haben nur Lesezugriff.');
      return;
    }
    if (!activeChild) return;

    const isExisting = Boolean(measurementData.id);
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `m-${crypto.randomUUID()}`
        : `m-${Date.now()}`;
    const resolvedMeasurement = {
      ...measurementData,
      id: measurementData.id || uniqueId,
    };

    let updatedMeasurements;
    if (isExisting) {
      updatedMeasurements = (activeChild.measurements || []).map((m) =>
        m.id === resolvedMeasurement.id ? resolvedMeasurement : m
      );
      showToast('Messwert aktualisiert.');
    } else {
      updatedMeasurements = [...(activeChild.measurements || []), resolvedMeasurement];
      showToast('Neuer Messwert eingetragen!');
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.7 } });
    }

    const updatedChild = { ...activeChild, measurements: updatedMeasurements };
    const updatedProfiles = profiles.map((p) => (p.id === activeChild.id ? updatedChild : p));

    setProfiles(updatedProfiles);
    updateProfile(updatedChild.id, updatedChild).catch(() => {});

    setIsMeasurementFormOpen(false);
    setEditingMeasurement(null);
  };

  const handleDeleteMeasurement = async (measurementId) => {
    if (!canEdit) {
      showToast('Besucher haben nur Lesezugriff.');
      return;
    }
    if (!activeChild) return;
    if (!window.confirm('Möchten Sie diesen Messwert wirklich löschen?')) return;

    const updatedMeasurements = (activeChild.measurements || []).filter(
      (m) => m.id !== measurementId
    );
    const updatedChild = { ...activeChild, measurements: updatedMeasurements };
    const updatedProfiles = profiles.map((p) => (p.id === activeChild.id ? updatedChild : p));

    setProfiles(updatedProfiles);
    updateProfile(updatedChild.id, updatedChild).catch(() => {});
    showToast('Messwert gelöscht.');
  };

  const handleEditMeasurement = (measurement) => {
    if (!canEdit) {
      showToast('Besucher haben nur Lesezugriff.');
      return;
    }
    setEditingMeasurement(measurement);
    setIsMeasurementFormOpen(true);
  };

  const handleOpenAddMeasurement = () => {
    if (!canEdit) {
      showToast('Besucher haben nur Lesezugriff.');
      return;
    }
    setEditingMeasurement(null);
    setIsMeasurementFormOpen(true);
  };

  // Manual PDF Export trigger (format: 'a4' | 'a5')
  const handleManualPdfExport = async (format = 'a4') => {
    if (!activeChild) return;
    showToast(
      format === 'a5'
        ? 'Generiere DIN A5 U-Heft Einleger...'
        : 'Generiere DIN A4 Entwicklungsbericht...'
    );
    try {
      if (format === 'a5') {
        const { generateUHeftA5Pdf } = await import('./utils/pdfGenerator.js');
        const fileName = generateUHeftA5Pdf(activeChild, activeChildMeasurements);
        if (fileName) {
          showToast(`U-Heft Einleger "${fileName}" heruntergeladen!`);
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.4 } });
        }
      } else {
        const { exportReportToPdf } = await import('./utils/pdfGenerator.js');
        const fileName = await exportReportToPdf(
          'pdf-report-template',
          activeChild.name,
          activeChild.gender,
          activeChild,
          activeChildMeasurements,
          false
        );
        if (fileName) {
          showToast(`PDF-Bericht "${fileName}" heruntergeladen!`);
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.4 } });
        }
      }
    } catch (err) {
      console.error(err);
      logClientError('PDF-Export Fehler', err);
      showToast('Fehler beim Erstellen des PDF-Berichts.');
    }
  };

  // Calendar (.ics) Export trigger
  const handleExportCalendar = () => {
    if (!activeChild) return;
    try {
      generateChildICalendar(activeChild);
      showToast(`Kalenderdatei (.ics) für ${activeChild.name} heruntergeladen!`);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.4 } });
    } catch (err) {
      console.error(err);
      logClientError('Kalender-Export Fehler', err);
      showToast('Fehler beim Erstellen der Kalenderdatei.');
    }
  };

  // CSV / Excel Export trigger
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

  // Main Content Renderer (Welcome screen if unauthenticated, active dashboard, or empty onboarding state)
  const renderMainContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      );
    }

    if (!user) {
      return <WelcomeHomeScreen />;
    }

    if (activeChild) {
      return (
        <div className="space-y-6">
          {/* Top Stat Cards Grid */}
          <PercentileCard activeChild={activeChild} ageInfo={ageInfo} />

          {/* Module Navigation Tabs (Desktop / Tablet only) */}
          <div className="hidden md:flex items-center justify-center gap-2.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('growth')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeTab === 'growth'
                  ? 'bg-cyan-700 hover:bg-cyan-600 text-white shadow-md shadow-cyan-950/80 ring-2 ring-cyan-400'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-cyan-200" />
              <span>{t('nav.growth')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ucheckups')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeTab === 'ucheckups'
                  ? 'bg-blue-700 hover:bg-blue-600 text-white shadow-md shadow-blue-950/80 ring-2 ring-blue-400'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-blue-200" />
              <span>{t('nav.uCheckups')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vaccines')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeTab === 'vaccines'
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-md shadow-emerald-950/80 ring-2 ring-emerald-400'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Syringe className="w-4 h-4 text-emerald-200" />
              <span>{t('nav.vaccinations')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('teeth')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeTab === 'teeth'
                  ? 'bg-pink-700 hover:bg-pink-600 text-white shadow-md shadow-pink-950/80 ring-2 ring-pink-400'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <span className="text-base leading-none">🦷</span>
              <span>{t('nav.teeth')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('milestones')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeTab === 'milestones'
                  ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-md shadow-amber-950/80 ring-2 ring-amber-400'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{t('nav.milestones')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-rose-700 hover:bg-rose-600 text-white shadow-md shadow-rose-950/80 ring-2 ring-rose-400'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <HeartPulse className="w-4 h-4 text-rose-200" />
              <span>{t('nav.health')}</span>
            </button>
          </div>

          {/* Tab 1: Growth Chart & Measurement History */}
          {activeTab === 'growth' && (
            <>
              {/* Growth Chart Section */}
              <GrowthChart activeChild={activeChild} measurements={activeChildMeasurements} />

              {/* Measurement History Table */}
              <MeasurementTable
                activeChild={activeChild}
                measurements={activeChildMeasurements}
                onEditMeasurement={handleEditMeasurement}
                onDeleteMeasurement={handleDeleteMeasurement}
              />
            </>
          )}

          {/* Tab: U-Heft Vorsorge-Roadmap */}
          {activeTab === 'ucheckups' && (
            <UCheckupTracker
              activeChild={activeChild}
              measurements={activeChildMeasurements}
              onAddCheckupClick={handleOpenAddMeasurement}
            />
          )}

          {/* Tab 2: STIKO Vaccination Tracker */}
          {activeTab === 'vaccines' && (
            <VaccinationTracker
              activeChild={activeChild}
              onUpdateChild={handleSaveProfile}
              canEdit={canEdit}
            />
          )}

          {/* Tab 3: Primary Teeth Eruption Tracker */}
          {activeTab === 'teeth' && (
            <TeethTracker
              activeChild={activeChild}
              onUpdateChild={handleSaveProfile}
              canEdit={canEdit}
            />
          )}

          {/* Tab 4: Milestones Timeline */}
          {activeTab === 'milestones' && (
            <MilestoneTracker
              activeChild={activeChild}
              onUpdateChild={handleSaveProfile}
              canEdit={canEdit}
            />
          )}

          {/* Tab 5: Health & Fever Diary */}
          {activeTab === 'health' && (
            <HealthTracker
              activeChild={activeChild}
              onUpdateChild={handleSaveProfile}
              canEdit={canEdit}
            />
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-xl mx-auto my-12">
        <h2 className="text-2xl font-bold text-white mb-2">{t('app.welcomeTitle')}</h2>
        <p className="text-slate-400 text-sm mb-6">{t('app.welcomeSubtitle')}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm shadow-lg shadow-cyan-950 transition-all cursor-pointer"
            >
              {t('app.createFirstChild')}
            </button>
          )}
          {isDev && (
            <button
              type="button"
              onClick={handleLoadDemoData}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all cursor-pointer"
            >
              {t('app.loadDemoData')}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white pb-16 md:pb-0 transition-colors duration-200 overflow-x-hidden w-full max-w-full">
      {/* Offline PWA Status Banner */}
      <OfflineBanner />

      {/* Header with Child Selector, Family Name & Actions */}
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

      {/* Role Banner for Visitors (View-Only notice) */}
      {userRole === 'viewer' && (
        <div className="bg-slate-900/90 border-b border-slate-800 py-2 px-4 text-center text-xs text-slate-300 flex items-center justify-center gap-2">
          <span>
            👁️ Sie betrachten diese Familiendaten als <strong>Besucher (Nur Lesen)</strong>.
          </span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col safe-area-x pb-28 md:pb-8">
        {renderMainContent()}
      </main>

      {/* Footer (Desktop) */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-400 mb-16 md:mb-0 safe-area-inset-bottom">
        <p>BabyCharts &copy; {new Date().getFullYear()} — WHO Child Growth Standards (0–5 Jahre)</p>
      </footer>

      {/* Mobile Bottom Navigation Bar (Phone only) */}
      {activeChild && (
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onQuickAdd={() => setIsQuickAddOpen(true)}
        />
      )}

      {/* Quick Add Modal */}
      {isQuickAddOpen && activeChild && (
        <QuickAddModal
          isOpen={isQuickAddOpen}
          activeChild={activeChild}
          onClose={() => setIsQuickAddOpen(false)}
          onOpenMeasurement={handleOpenAddMeasurement}
          onOpenHealth={() => {
            setActiveTab('health');
          }}
          onOpenVaccines={() => {
            setActiveTab('vaccines');
          }}
          onOpenMilestones={() => {
            setActiveTab('milestones');
          }}
          onOpenTeeth={() => {
            setActiveTab('teeth');
          }}
          onOpenUCheckups={() => {
            setActiveTab('ucheckups');
          }}
        />
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          initialData={editingProfile}
          onSaveProfile={handleSaveProfile}
          onDeleteProfile={handleDeleteProfile}
          onClose={() => {
            setIsProfileModalOpen(false);
            setEditingProfile(null);
          }}
        />
      )}

      {/* Measurement Entry Modal */}
      {isMeasurementFormOpen && activeChild && (
        <MeasurementForm
          isOpen={isMeasurementFormOpen}
          activeChild={activeChild}
          initialData={editingMeasurement}
          onSaveMeasurement={handleSaveMeasurement}
          onClose={() => {
            setIsMeasurementFormOpen(false);
            setEditingMeasurement(null);
          }}
        />
      )}

      {/* Export / Import & Settings Modal */}
      {isExportModalOpen && (
        <ExportImportModal
          isOpen={isExportModalOpen}
          profiles={profiles}
          onLoadDemoData={handleLoadDemoData}
          onImportProfiles={(imported) => {
            setProfiles(imported);
            importProfiles(imported, activeFamily?.id).catch(() => {});
          }}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* Auth Login / Register Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* 2FA Security Modal */}
      <TwoFactorModal isOpen={is2FaModalOpen} onClose={() => setIs2FaModalOpen(false)} />

      {/* Family Management & Invites Modal */}
      <FamilyManagementModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl animate-slideUp flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
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
