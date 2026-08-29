import { useState, useRef } from 'react';
import { User, Camera, Trash2, Users, ShieldCheck, LogOut } from 'lucide-react';
import { useModalDismissal } from '../../utils/useModalDismissal.js';
import { compressImage } from '../../utils/imageCompressor.js';
import { getAuthorizedMediaUrl } from '../../utils/api.js';

const getRoleEmoji = (role) => {
  if (role === 'admin') return '👑';
  if (role === 'editor') return '✏️';
  return '👁️';
};

export function UserAvatar({ user }) {
  if (user?.avatar) {
    return (
      <img
        src={getAuthorizedMediaUrl(user.avatar)}
        alt={user.name}
        className="w-5 h-5 rounded-full object-cover border border-cyan-400/50"
      />
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400">
      <User className="w-3.5 h-3.5" />
    </div>
  );
}

export default function UserMenuDropdown({
  isOpen,
  onToggle,
  user,
  activeFamily,
  userRole,
  onOpenFamilyModal,
  onOpen2FaModal,
  onLogout,
  onUpdateProfile,
  isMobile = false,
}) {
  const { dialogRef } = useModalDismissal(isOpen, onToggle);
  const [avatarError, setAvatarError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUserAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    if (!file.type.startsWith('image/')) {
      setAvatarError('Nur Bilder (PNG, JPG, WebP) erlaubt.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setAvatarError('Bild darf maximal 15 MB groß sein.');
      return;
    }

    setIsUploading(true);
    compressImage(file, 800, 0.85)
      .then(async (compressedDataUrl) => {
        const res = await onUpdateProfile({ avatar: compressedDataUrl });
        if (!res?.ok) {
          setAvatarError(res?.error || 'Fehler beim Speichern.');
        } else {
          setAvatarError(null);
        }
      })
      .catch((err) => {
        setAvatarError(err.message || 'Fehler beim Verarbeiten des Bildes.');
      })
      .finally(() => {
        setIsUploading(false);
      });
    e.target.value = '';
  };

  return (
    <div ref={dialogRef} className={`relative ${isMobile ? 'block' : 'hidden md:block'}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={isUploading}
        onChange={handleUserAvatarUpload}
      />

      {isMobile ? (
        <button
          type="button"
          onClick={onToggle}
          title={`${user.name} (${activeFamily?.name || 'Familie'})`}
          aria-label="Benutzerkonto öffnen"
          className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 active:scale-95 flex items-center justify-center transition-colors cursor-pointer"
        >
          <UserAvatar user={user} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          title="Benutzerprofil & Einstellungen"
          aria-label="Benutzerkonto öffnen"
          className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-all hover:border-slate-400 cursor-pointer"
        >
          <UserAvatar user={user} />
          <span className="text-xs font-semibold max-w-28 truncate">{user.name}</span>
          <span className="text-[10px]">{getRoleEmoji(userRole)}</span>
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-68 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn text-xs text-slate-800 dark:text-slate-100">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 mb-2 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl">
            <button
              type="button"
              className="relative group shrink-0 cursor-pointer p-0 bg-transparent border-none text-left"
              onClick={(e) => {
                e.stopPropagation();
                if (!isUploading) fileInputRef.current?.click();
              }}
              title="Profilbild hochladen / ändern"
              aria-label="Profilbild hochladen oder ändern"
            >
              {user.avatar ? (
                <img
                  src={getAuthorizedMediaUrl(user.avatar)}
                  alt={user.name}
                  className="w-11 h-11 rounded-2xl object-cover border border-cyan-500/40 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div
                className={`absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity text-cyan-300 z-10 ${
                  isUploading ? 'opacity-100' : ''
                }`}
              >
                <Camera className="w-4 h-4" />
              </div>
              <div
                className={`absolute -bottom-1 -right-1 p-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-md transition-transform active:scale-95 flex items-center justify-center z-10 ${
                  isUploading ? 'opacity-50' : ''
                }`}
              >
                <Camera className="w-2.5 h-2.5" />
              </div>
            </button>
            {user.avatar && (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const res = await onUpdateProfile({ avatar: null });
                  if (!res?.ok) setAvatarError(res?.error || 'Fehler beim Löschen.');
                }}
                title="Profilbild entfernen"
                aria-label="Profilbild entfernen"
                className="absolute -top-1 -right-1 p-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md cursor-pointer transition-transform active:scale-95 flex items-center justify-center z-20"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user.email}
              </div>
              {activeFamily && (
                <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5 truncate">
                  {activeFamily.name}
                </div>
              )}
            </div>
          </div>

          {avatarError && (
            <div className="mb-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] text-rose-600 dark:text-rose-300 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{avatarError}</span>
            </div>
          )}

          <div className="space-y-1">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
                onOpenFamilyModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer"
            >
              <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Familie &amp; Mitglieder</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
                onOpen2FaModal();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>2FA Sicherheit</span>
              </div>
              {user?.twoFactorEnabled ? (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800/60">
                  Aktiv
                </span>
              ) : (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  Aus
                </span>
              )}
            </button>

            <div className="my-1 border-t border-slate-200 dark:border-slate-800/80" />

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left font-medium cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
