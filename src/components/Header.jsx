import { useState } from 'react';
import {
  Baby,
  Plus,
  Settings,
  Download,
  Edit2,
  Trash2,
  Users,
  User,
  Camera,
  FileText,
  Calendar,
  Table,
  ShieldCheck,
  Sun,
  Moon,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const getRoleEmoji = (role) => {
  if (role === 'admin') return '👑';
  if (role === 'editor') return '✏️';
  return '👁️';
};

const getProfileButtonClass = (isActive, childIsGirl) => {
  if (!isActive) {
    return 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/60';
  }
  if (childIsGirl) {
    return 'bg-linear-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-950/40 font-medium';
  }
  return 'bg-linear-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-950/40 font-medium';
};

function UserAvatar({ user, activeFamily }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className="w-5 h-5 rounded-full object-cover border border-cyan-400/50"
      />
    );
  }
  if (activeFamily?.avatar) {
    return (
      <img
        src={activeFamily.avatar}
        alt={activeFamily.name}
        className="w-5 h-5 rounded-full object-cover border border-cyan-500/30"
      />
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400">
      <User className="w-3.5 h-3.5" />
    </div>
  );
}

function ProfilePillList({
  profiles,
  activeChild,
  canEdit,
  onSelectChild,
  onOpenEditProfile,
  onDeleteProfile,
  onOpenAddProfile,
}) {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900/90 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-inner">
      {profiles.map((child) => {
        const isActive = child.id === activeChild?.id;
        const childIsGirl = child.gender === 'girl';
        return (
          <div
            key={child.id}
            className={`flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-xl transition-all ${getProfileButtonClass(isActive, childIsGirl)}`}
          >
            <button
              type="button"
              onClick={() => onSelectChild(child.id)}
              className="flex items-center gap-1.5 text-xs font-semibold focus:outline-none"
            >
              {child.avatar ? (
                <img
                  src={child.avatar}
                  alt={child.name}
                  className="w-4 h-4 rounded-full object-cover border border-white/40"
                />
              ) : (
                <span
                  className="inline-flex items-center justify-center text-xs font-bold leading-none -translate-y-px select-none opacity-90"
                  aria-hidden="true"
                >
                  {childIsGirl ? '♀' : '♂'}
                </span>
              )}
              <span className="leading-none">{child.name}</span>
            </button>

            {/* Integrated Action Buttons on Active Child */}
            {isActive && canEdit && (
              <div className="flex items-center gap-0.5 ml-1.5 pl-1.5 border-l border-white/25">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenEditProfile) onOpenEditProfile(child);
                  }}
                  title={`${child.name} bearbeiten`}
                  aria-label={`${child.name} bearbeiten`}
                  className="p-1 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors active:scale-95"
                >
                  <Edit2 className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Möchten Sie "${child.name}" wirklich löschen?`)) {
                      if (onDeleteProfile) onDeleteProfile(child.id);
                    }
                  }}
                  title={`${child.name} löschen`}
                  aria-label={`${child.name} löschen`}
                  className="p-1 rounded-lg hover:bg-rose-950/80 text-rose-200 hover:text-rose-100 transition-colors active:scale-95"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {canEdit && (
        <button
          type="button"
          onClick={onOpenAddProfile}
          title="Neues Kind hinzufügen"
          aria-label="Neues Kind hinzufügen"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

import { useModalDismissal } from '../utils/useModalDismissal.js';

function PdfExportDropdown({ isOpen, onToggle, onManualPdfExport, onExportCalendar, onExportCsv }) {
  const { dialogRef } = useModalDismissal(isOpen, onToggle);

  return (
    <div ref={dialogRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={onToggle}
        title="Berichte, Termine & Daten exportieren"
        aria-label="Export Format auswählen"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-all hover:border-slate-400"
      >
        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Exportieren</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn text-xs text-slate-800 dark:text-slate-100">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            PDF-Dokumente
          </div>

          <button
            type="button"
            onClick={() => {
              onToggle();
              onManualPdfExport('a4');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">DIN A4 Bericht</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Kurven, Tabellen &amp; Perzentilen
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggle();
              onManualPdfExport('a5');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left mt-0.5"
          >
            <span className="text-base leading-none shrink-0">📒</span>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                DIN A5 U-Heft Einleger
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Passend für gelbes U-Heft
              </div>
            </div>
          </button>

          <div className="my-1.5 border-t border-slate-200 dark:border-slate-800/80" />

          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Kalender &amp; Tabellen
          </div>

          {onExportCalendar && (
            <button
              type="button"
              onClick={() => {
                onToggle();
                onExportCalendar();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Kalender-Export (.ics)
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Für Apple, Google &amp; Outlook
                </div>
              </div>
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              onClick={() => {
                onToggle();
                onExportCsv();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left mt-0.5"
            >
              <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Excel / CSV Export
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Rohdaten für Tabellenkalkulation
                </div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenuDropdown({
  isOpen,
  onToggle,
  user,
  activeFamily,
  userRole,
  onOpenFamilyModal,
  onOpen2FaModal,
  onLogout,
  onUpdateProfile,
}) {
  const { dialogRef } = useModalDismissal(isOpen, onToggle);
  const [avatarError, setAvatarError] = useState(null);

  const handleUserAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    if (!file.type.startsWith('image/')) {
      setAvatarError('Nur Bilder (PNG, JPG, WebP) erlaubt.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Foto zu groß (max. 2 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        onUpdateProfile({ avatar: ev.target.result });
        setAvatarError(null);
      }
    };
    reader.onerror = () => {
      setAvatarError('Fehler beim Einlesen des Fotos.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div ref={dialogRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={onToggle}
        title="Benutzerprofil & Einstellungen"
        aria-label="Benutzerkonto öffnen"
        className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-all hover:border-slate-400"
      >
        <UserAvatar user={user} activeFamily={activeFamily} />
        <span className="text-xs font-semibold max-w-28 truncate">{user.name}</span>
        <span className="text-[10px]">{getRoleEmoji(userRole)}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn text-xs text-slate-800 dark:text-slate-100">
          <div className="p-3 border-b border-slate-800/80 mb-1.5 flex items-center gap-3">
            <div className="relative group shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400 font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <label
                htmlFor="user-avatar-upload"
                title="Profilbild ändern"
                className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center cursor-pointer transition-opacity text-cyan-300"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="user-avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUserAvatarUpload}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-100 truncate">{user.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
              <div className="text-[10px] text-cyan-400 mt-0.5 truncate">{activeFamily?.name}</div>
            </div>
          </div>

          {avatarError && (
            <div className="mb-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] text-rose-300 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{avatarError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onToggle();
              onOpenFamilyModal();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition-colors text-left"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Familie &amp; Mitglieder</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggle();
              onOpen2FaModal();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>2FA Sicherheit</span>
            </div>
            {user?.twoFactorEnabled ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800/60">
                Aktiv
              </span>
            ) : (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                Aus
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onToggle();
              onLogout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Abmelden</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MobileHeaderControls({
  user,
  activeFamily,
  isDark,
  setTheme,
  onOpenFamilyModal,
  onOpenAuthModal,
  onManualPdfExport,
  onOpenExportModal,
}) {
  return (
    <div className="flex items-center gap-1.5 md:hidden">
      {/* Theme Toggle Button (Mobile) */}
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
        aria-label="Theme wechseln"
        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-amber-500 hover:text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-800 active:scale-95 flex items-center justify-center transition-colors"
      >
        {isDark ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
        )}
      </button>

      {/* Family / User button mobile */}
      {user ? (
        <button
          type="button"
          onClick={onOpenFamilyModal}
          title={`${user.name} (${activeFamily?.name || 'Familie'})`}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-800 active:scale-95 flex items-center justify-center"
        >
          {activeFamily?.avatar ? (
            <img
              src={activeFamily.avatar}
              alt={activeFamily.name}
              className="w-5 h-5 rounded-lg object-cover"
            />
          ) : (
            <Users className="w-4 h-4" />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenAuthModal}
          title="Anmelden"
          className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white active:scale-95"
        >
          <LogIn className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        onClick={onManualPdfExport}
        title="PDF Bericht exportieren"
        aria-label="PDF Bericht exportieren"
        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 active:scale-95"
      >
        <Download className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onOpenExportModal}
        title="Einstellungen & Datensicherung"
        aria-label="Einstellungen und Datensicherung öffnen"
        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
}

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
    updateProfile,
  } = useAuth();
  const { isDark, setTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPdfMenuOpen, setIsPdfMenuOpen] = useState(false);
  const isGirl = activeChild?.gender === 'girl';

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md border-b safe-area-inset-top transition-colors duration-300 ${
        isGirl
          ? 'bg-rose-50/90 dark:bg-rose-950/85 border-rose-200 dark:border-rose-800/40 text-rose-950 dark:text-rose-100 shadow-xs'
          : 'bg-white/90 dark:bg-slate-950/85 border-slate-200 dark:border-slate-800/40 text-slate-900 dark:text-slate-100 shadow-xs'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
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
                    <button
                      type="button"
                      onClick={() => setIsFamilyModalOpen(true)}
                      className="hidden sm:inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900/90 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 transition-colors"
                      title="Familie verwalten"
                    >
                      <Users className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                      <span>{activeFamily.name}</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Wachstum &amp; Vergleichskurven
                </p>
              </div>
            </div>

            <MobileHeaderControls
              user={user}
              activeFamily={activeFamily}
              isDark={isDark}
              setTheme={setTheme}
              onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onManualPdfExport={onManualPdfExport}
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
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {activeChild && canEdit && (
                    <button
                      type="button"
                      onClick={onOpenAddMeasurement}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 ${
                        isGirl
                          ? 'bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-rose-950/60'
                          : 'bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-950/60'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Messwert eintragen</span>
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
                    onUpdateProfile={updateProfile}
                  />

                  {/* Theme Switcher (Desktop) */}
                  <button
                    type="button"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
                    aria-label="Theme wechseln"
                    className="hidden md:flex p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700/60 transition-colors items-center justify-center"
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
                    className="hidden md:block p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {/* Theme Switcher (Always visible on Landing Page) */}
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
                  aria-label="Theme wechseln"
                  className="flex p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700/60 transition-colors items-center justify-center"
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
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-950/60 transition-all active:scale-95"
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
