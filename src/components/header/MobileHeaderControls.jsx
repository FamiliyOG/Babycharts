import { Settings, Sun, Moon, LogIn } from 'lucide-react';
import LanguageSwitcherDropdown from './LanguageSwitcherDropdown.jsx';
import UserMenuDropdown from './UserMenuDropdown.jsx';
import PdfExportDropdown from './PdfExportDropdown.jsx';

export default function MobileHeaderControls({
  user,
  activeFamily,
  userRole,
  isDark,
  setTheme,
  isUserMenuOpen,
  onToggleUserMenu,
  onOpenFamilyModal,
  onOpenAuthModal,
  onOpen2FaModal,
  onLogout,
  onUpdateProfile,
  isPdfMenuOpen,
  onTogglePdfMenu,
  onManualPdfExport,
  onExportCalendar,
  onExportCsv,
  onOpenExportModal,
}) {
  return (
    <div className="flex items-center gap-1.5 md:hidden">
      {/* Language Switcher (Mobile) */}
      <LanguageSwitcherDropdown isMobile={true} />

      {/* Theme Toggle Button (Mobile) */}
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
        aria-label="Theme wechseln"
        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-amber-500 hover:text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-800 active:scale-95 flex items-center justify-center transition-colors cursor-pointer"
      >
        {isDark ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
        )}
      </button>

      {/* User / Profile button mobile */}
      {user ? (
        <UserMenuDropdown
          user={user}
          activeFamily={activeFamily}
          userRole={userRole}
          isOpen={isUserMenuOpen}
          onToggle={onToggleUserMenu}
          onOpenFamilyModal={onOpenFamilyModal}
          onOpen2FaModal={onOpen2FaModal}
          onLogout={onLogout}
          onUpdateProfile={onUpdateProfile}
          isMobile={true}
        />
      ) : (
        <button
          type="button"
          onClick={onOpenAuthModal}
          title="Anmelden"
          className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white active:scale-95 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
        </button>
      )}

      {/* Mobile Export Dropdown & Settings Menu (Only for authenticated users) */}
      {user && (
        <>
          <PdfExportDropdown
            isOpen={isPdfMenuOpen}
            onToggle={onTogglePdfMenu}
            onManualPdfExport={onManualPdfExport}
            onExportCalendar={onExportCalendar}
            onExportCsv={onExportCsv}
            isMobile={true}
          />

          <button
            type="button"
            onClick={onOpenExportModal}
            title="Einstellungen & Datensicherung"
            aria-label="Einstellungen und Datensicherung öffnen"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
