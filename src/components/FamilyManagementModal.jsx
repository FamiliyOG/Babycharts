import { useState, useEffect } from 'react';
import { X, Users, Copy, Check, UserPlus, Trash2, KeyRound, Edit2, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useModalDismissal } from '../utils/useModalDismissal.js';
import {
  fetchFamilyDetails,
  updateFamily,
  createFamilyInvite,
  deleteFamilyInvite,
  removeFamilyMember,
  deleteFamily,
} from '../utils/api.js';

export default function FamilyManagementModal({ isOpen, onClose }) {
  const { user, activeFamily, families, switchFamily, joinFamily, userRole, isAdmin, refreshUser } =
    useAuth();
  const { dialogRef } = useModalDismissal(isOpen, onClose);

  const [familyData, setFamilyData] = useState(null);
  const [inviteRole, setInviteRole] = useState('editor'); // 'editor' | 'viewer'
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(() => activeFamily?.name || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!isOpen || !activeFamily?.id) return;

    let isMounted = true;
    fetchFamilyDetails(activeFamily.id).then((res) => {
      if (isMounted && res.ok) {
        setFamilyData(res.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeFamily?.id]);

  const loadFamily = async () => {
    if (!activeFamily?.id) return;
    const res = await fetchFamilyDetails(activeFamily.id);
    if (res.ok) {
      setFamilyData(res.data);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage('Bitte wählen Sie eine gültige Bilddatei aus (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage('Das Bild ist zu groß. Bitte max. 10 MB auswählen.');
      return;
    }

    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Data = ev.target?.result;
      if (!base64Data || !activeFamily?.id) {
        setIsUploadingAvatar(false);
        return;
      }

      const res = await updateFamily(activeFamily.id, { avatar: base64Data });
      setIsUploadingAvatar(false);
      if (res.ok) {
        setStatusMessage('Familien-Icon erfolgreich aktualisiert.');
        await refreshUser(activeFamily.id);
        loadFamily();
      } else {
        setStatusMessage(res.error || 'Fehler beim Hochladen des Bildes.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    if (!activeFamily?.id) return;
    const res = await updateFamily(activeFamily.id, { avatar: null });
    if (res.ok) {
      setStatusMessage('Familien-Icon zurückgesetzt.');
      await refreshUser(activeFamily.id);
      loadFamily();
    }
  };

  if (!isOpen) return null;

  const handleCreateInvite = async () => {
    if (!activeFamily?.id) return;
    const res = await createFamilyInvite(activeFamily.id, inviteRole);
    if (res.ok) {
      setGeneratedInvite(res.data);
      loadFamily();
    }
  };

  const handleDeleteInvite = async (code) => {
    if (!activeFamily?.id) return;
    const res = await deleteFamilyInvite(activeFamily.id, code);
    if (res.ok) {
      if (generatedInvite?.code === code) {
        setGeneratedInvite(null);
      }
      loadFamily();
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleJoinFamily = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    const res = await joinFamily(joinCodeInput.trim());
    if (res.ok) {
      setJoinCodeInput('');
      setStatusMessage(res.message || 'Erfolgreich beigetreten!');
      await refreshUser();
    } else {
      setStatusMessage(res.error || 'Fehler beim Beitritt.');
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Möchten Sie ${memberName} wirklich aus der Familie entfernen?`)) return;
    const res = await removeFamilyMember(activeFamily.id, userId);
    if (res.ok) {
      loadFamily();
    }
  };

  const handleDeleteCurrentFamily = async () => {
    if (!activeFamily?.id) return;
    const confirmed = window.confirm(
      `Sind Sie sicher, dass Sie die Familie "${activeFamily.name}" UNWIDERRUFLICH LÖSCHEN möchten?\n\nAlle zugeordneten Kinderprofile, Messwerte und Daten dieser Familie werden dabei gelöscht.`
    );
    if (!confirmed) return;

    const res = await deleteFamily(activeFamily.id);
    if (res.ok) {
      await refreshUser();
      onClose();
    } else {
      setStatusMessage(res.error || 'Fehler beim Löschen der Familie.');
    }
  };

  const handleSaveFamilyName = async (e) => {
    e.preventDefault();
    if (!activeFamily?.id || !editedName.trim()) return;
    const res = await updateFamily(activeFamily.id, { name: editedName.trim() });
    if (res.ok) {
      setIsEditingName(false);
      setStatusMessage('Familienname erfolgreich geändert.');
      await refreshUser(activeFamily.id);
      loadFamily();
    } else {
      setStatusMessage(res.error || 'Fehler beim Ändern des Namens.');
    }
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'admin') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (role === 'editor') return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    return 'bg-slate-700/60 text-slate-300 border-slate-600/40';
  };

  const getRoleLabel = (role) => {
    if (role === 'admin') return 'Administrator';
    if (role === 'editor') return 'Elternteil';
    return 'Besucher';
  };

  const getFullRoleLabel = (role) => {
    if (role === 'admin') return '👑 Administrator';
    if (role === 'editor') return '✏️ Elternteil';
    return '👁️ Besucher';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Avatar */}
        <div className="flex items-start sm:items-center gap-3.5 mb-6 pr-8">
          {/* Family Avatar / Icon with Upload Trigger */}
          <div className="relative group shrink-0">
            {activeFamily?.avatar ? (
              <img
                src={activeFamily.avatar}
                alt={activeFamily?.name || 'Familie'}
                className="w-12 h-12 rounded-2xl object-cover border border-cyan-500/40 shadow-lg shadow-cyan-950/60"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/60">
                <Users className="w-6 h-6" />
              </div>
            )}

            {isAdmin && (
              <>
                <label
                  htmlFor="family-avatar-upload"
                  title="Familien-Icon / Bild ändern"
                  className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center cursor-pointer transition-opacity text-cyan-300"
                >
                  <Camera className="w-5 h-5" />
                </label>
                <input
                  id="family-avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
                {activeFamily?.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    title="Icon entfernen und Standard wiederherstellen"
                    aria-label="Icon entfernen"
                    className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md transition-all active:scale-95"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <form
                onSubmit={handleSaveFamilyName}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2"
              >
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="px-2.5 py-1.5 text-sm bg-slate-950 border border-cyan-500 rounded-lg text-white focus:outline-none flex-1 min-w-35"
                  placeholder="Familienname..."
                  autoFocus
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-md"
                  >
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedName(activeFamily?.name || '');
                      setIsEditingName(false);
                    }}
                    className="px-2.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold truncate">
                  {activeFamily?.name || 'Familienverwaltung'}
                </h2>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedName(activeFamily?.name || '');
                      setIsEditingName(true);
                    }}
                    title="Familiennamen bearbeiten"
                    aria-label="Familiennamen bearbeiten"
                    className="p-1 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeClass(userRole)}`}
              >
                Ihre Rolle: {getFullRoleLabel(userRole)}
              </span>
            </div>
          </div>
        </div>

        {/* Status / Error Toast */}
        {statusMessage && (
          <div className="mb-4 p-3 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-200 text-xs flex items-center justify-between animate-fadeIn">
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-cyan-400 hover:text-cyan-200 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Switch active family if user has multiple families */}
        {families.length > 1 && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-2">Familie wechseln:</div>
            <div className="flex flex-wrap gap-2">
              {families.map((fam) => {
                const isActive = fam.id === activeFamily?.id;
                return (
                  <button
                    key={fam.id}
                    type="button"
                    onClick={() => switchFamily(fam.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/80 ring-2 ring-cyan-400'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {fam.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Mitglieder ({familyData?.members?.length || 1})
          </h3>
          <div className="space-y-2">
            {familyData?.members ? (
              familyData.members.map((member) => {
                const isCurrentUser = member.userId === user?.id;
                const canRemove = isAdmin && !isCurrentUser && member.userId !== familyData.ownerId;

                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-8 h-8 rounded-full object-cover border border-cyan-500/40"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200 uppercase">
                          {member.name ? member.name.charAt(0) : 'U'}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{member.name || 'Benutzer'}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] text-cyan-400 font-normal">(Sie)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{member.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeClass(member.role)}`}
                      >
                        {getRoleLabel(member.role)}
                      </span>

                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.userId, member.name)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Mitglied entfernen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-500 p-2">Lade Mitglieder...</div>
            )}
          </div>
        </div>

        {/* Invite Generator (Admins & Editors) */}
        {userRole !== 'viewer' && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Mitglied oder Besucher einladen</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Erstellen Sie einen Einladungscode für Ihren Partner oder für Besucher (z. B.
              Großeltern):
            </p>

            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <select
                id="invite-role-select"
                aria-label="Rolle für Einladung auswählen"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 shadow-xs"
              >
                <option value="editor">✏️ Elternteil (Vollzugriff / Bearbeiten)</option>
                <option value="viewer">👁️ Besucher (Nur Lesezugriff)</option>
              </select>

              <button
                type="button"
                onClick={handleCreateInvite}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
              >
                Code generieren
              </button>
            </div>

            {generatedInvite && (
              <div className="p-3 bg-slate-950 border border-cyan-600/40 rounded-xl flex items-center justify-between gap-2 animate-fadeIn mb-3">
                <div>
                  <div className="text-[10px] text-slate-400">
                    Neuer Einladungscode (
                    {generatedInvite.role === 'editor' ? 'Elternteil' : 'Besucher'}):
                  </div>
                  <div className="font-mono text-base font-bold text-cyan-300 tracking-wider">
                    {generatedInvite.code}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(generatedInvite.code)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
                </button>
              </div>
            )}

            {/* List of currently active invites for this family */}
            {familyData?.invites && familyData.invites.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-400 mb-2">
                  Aktive Einladungscodes ({familyData.invites.length}):
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {familyData.invites.map((inv) => (
                    <div
                      key={inv.code}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-300 tracking-wider">
                          {inv.code}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({inv.role === 'editor' ? 'Elternteil' : 'Besucher'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(inv.code)}
                          title="Code kopieren"
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInvite(inv.code)}
                          title="Code widerrufen"
                          className="p-1 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Join another family with code */}
        <div className="pt-4 border-t border-slate-800/80 mb-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-slate-400" />
            <span>Weiterer Familie beitreten</span>
          </h3>
          <form onSubmit={handleJoinFamily} className="flex gap-2">
            <input
              id="join-code-input"
              aria-label="Einladungscode eingeben"
              type="text"
              maxLength={10}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="Code eingeben (z. B. BABY99)"
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 uppercase tracking-wider focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
            >
              Beitreten
            </button>
          </form>
        </div>

        {/* Danger Zone: Delete Family (Owner or Admin only) */}
        {(isAdmin || activeFamily?.isOwner) && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Familie löschen</span>
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-400/90 font-medium mt-0.5">
                Löscht diese Familie und alle zugehörigen Profile &amp; Daten unwiderruflich
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeleteCurrentFamily}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all active:scale-95 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Familie löschen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
