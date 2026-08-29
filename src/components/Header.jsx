import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Baby, Plus, Settings, Users, Sun, Moon, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import LanguageSwitcherDropdown from './header/LanguageSwitcherDropdown.jsx';
import { ProfilePillList } from './header/ProfilePillList.jsx';
import PdfExportDropdown from './header/PdfExportDropdown.jsx';
import UserMenuDropdown from './header/UserMenuDropdown.jsx';
import MobileHeaderControls from './header/MobileHeaderControls.jsx';

export default function Header({
  profiles,
  activeChild,
  onSelectChild,
  onOpenAddProfile,
  onOpenEditProfile,
  onDeleteProfile,
  onOpenAddMeasurement,
  onOpenExportModal,
  onManualPdfExport,
  onExportCalendar,
  onExportCsv,
}) {
  const {
    user,
    activeFamily,
    canEdit,
    userRole,
    setIsAuthModalOpen,
    setIsFamilyModalOpen,
    setIs2FaModalOpen,
    logout,
    updateUserProfile,
  } = useAuth();
  const { t } = useTranslation();
  const { isDark, setTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPdfMenuOpen, setIsPdfMenuOpen] = useState(false);
  const isGirl = activeChild?.gender === 'girl';

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md border-b safe-area-inset-top safe-area-inset-left safe-area-inset-right transition-colors duration-300 ${
        isGirl
          ? 'bg-rose-50/90 dark:bg-rose-950/85 border-rose-200 dark:border-rose-800/40 text-rose-950 dark:text-rose-100 shadow-xs'
          : 'bg-white/90 dark:bg-slate-950/85 border-slate-200 dark:border-slate-800/40 text-slate-900 dark:text-slate-100 shadow-xs'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 safe-area-x">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          {/* Logo & App Title + Mobile Quick Action Icons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl shadow-lg transition-transform ${
                  isGirl
                    ? 'bg-linear-to-tr from-rose-600 to-pink-500 text-white shadow-rose-900/50'
                    : 'bg-linear-to-tr from-cyan-600 to-indigo-600 text-white shadow-cyan-900/50'
                }`}
              >
                <Baby className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                    BabyCharts
                  </h1>
                  {activeFamily && (
                    <span
                      className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/40 whitespace-nowrap max-w-52 shrink-0 select-none shadow-xs"
                      title={`Aktive Familie: ${activeFamily.name}`}
                    >
                      <Users className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span className="truncate">{activeFamily.name}</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  {t('app.subtitle') || 'Wachstum & Vergleichskurven'}
                </p>
              </div>
            </div>

            <MobileHeaderControls
              user={user}
              activeFamily={activeFamily}
              userRole={userRole}
              isDark={isDark}
              setTheme={setTheme}
              isUserMenuOpen={isUserMenuOpen}
              onToggleUserMenu={() => setIsUserMenuOpen(!isUserMenuOpen)}
              onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpen2FaModal={() => setIs2FaModalOpen(true)}
              onLogout={logout}
              onUpdateProfile={updateUserProfile}
              isPdfMenuOpen={isPdfMenuOpen}
              onTogglePdfMenu={() => setIsPdfMenuOpen(!isPdfMenuOpen)}
              onManualPdfExport={onManualPdfExport}
              onExportCalendar={onExportCalendar}
              onExportCsv={onExportCsv}
              onOpenExportModal={onOpenExportModal}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 w-full md:w-auto">
            {user ? (
              <>
                {/* Profiles Pill List */}
                <ProfilePillList
                  profiles={profiles}
                  activeChild={activeChild}
                  canEdit={canEdit}
                  onSelectChild={onSelectChild}
                  onOpenEditProfile={onOpenEditProfile}
                  onDeleteProfile={onDeleteProfile}
                  onOpenAddProfile={onOpenAddProfile}
                />

                {/* Desktop Action Buttons */}
                <div className="hidden md:flex items-center gap-2 w-full sm:w-auto justify-end">
                  {activeChild && canEdit && (
                    <button
                      type="button"
                      onClick={onOpenAddMeasurement}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 cursor-pointer ${
                        isGirl
                          ? 'bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-rose-950/60'
                          : 'bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-950/60'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('measurements.addTitle') || 'Messwert eintragen'}</span>
                    </button>
                  )}

                  {/* Export Dropdown Menu (Desktop) */}
                  <PdfExportDropdown
                    isOpen={isPdfMenuOpen}
                    onToggle={() => setIsPdfMenuOpen(!isPdfMenuOpen)}
                    onManualPdfExport={onManualPdfExport}
                    onExportCalendar={onExportCalendar}
                    onExportCsv={onExportCsv}
                  />

                  {/* Family / User Account Button (Desktop) */}
                  <UserMenuDropdown
                    user={user}
                    activeFamily={activeFamily}
                    userRole={userRole}
                    isOpen={isUserMenuOpen}
                    onToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
                    onOpen2FaModal={() => setIs2FaModalOpen(true)}
                    onLogout={logout}
                    onUpdateProfile={updateUserProfile}
                  />

                  {/* Language Switcher (Desktop) */}
                  <div className="hidden md:block">
                    <LanguageSwitcherDropdown isMobile={false} />
                  </div>

                  {/* Theme Switcher (Desktop) */}
                  <button
                    type="button"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
                    aria-label="Theme wechseln"
                    className="hidden md:flex p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700/60 transition-colors items-center justify-center cursor-pointer"
                  >
                    {isDark ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    )}
                  </button>

                  {/* Settings / Export Import (Desktop) */}
                  <button
                    type="button"
                    onClick={onOpenExportModal}
                    title="Einstellungen & Datensicherung"
                    aria-label="Einstellungen und Datensicherung öffnen"
                    className="hidden md:block p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                {/* Language Switcher (Desktop) */}
                <LanguageSwitcherDropdown isMobile={false} />

                {/* Theme Switcher (Desktop) */}
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
                  aria-label="Theme wechseln"
                  className="flex p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700/60 transition-colors items-center justify-center cursor-pointer"
                >
                  {isDark ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-950/60 transition-all active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Anmelden / Registrieren</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
