import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users, Trash2, KeyRound, Edit2, Camera, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useModalDismissal } from '../utils/useModalDismissal.js';
import {
  fetchFamilyDetails,
  updateFamily,
  createFamilyInvite,
  deleteFamilyInvite,
  updateFamilyMemberRole,
  transferFamilyOwnership,
  removeFamilyMember,
  leaveFamily,
  deleteFamily,
  getAuthorizedMediaUrl,
} from '../utils/api.js';
import InviteCodeManager from './family/InviteCodeManager.jsx';
import MemberList, { getRoleBadgeClass, getFullRoleLabel } from './family/MemberList.jsx';

export default function FamilyManagementModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const {
    user,
    activeFamily,
    families,
    switchFamily,
    joinFamily,
    userRole,
    isAdmin,
    canEdit,
    refreshUser,
  } = useAuth();
  const { dialogRef } = useModalDismissal(isOpen, onClose);

  const [familyData, setFamilyData] = useState(null);
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteExpiresIn, setInviteExpiresIn] = useState('48');
  const [inviteMaxUses, setInviteMaxUses] = useState('1');
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
      if (base64Data && activeFamily?.id) {
        const res = await updateFamily(activeFamily.id, { avatar: base64Data });
        if (res.ok) {
          await loadFamily();
          if (refreshUser) await refreshUser();
          setStatusMessage('Familien-Icon erfolgreich aktualisiert.');
        } else {
          setStatusMessage(res.error || 'Fehler beim Hochladen.');
        }
      }
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    if (!activeFamily?.id) return;
    const res = await updateFamily(activeFamily.id, { avatar: null });
    if (res.ok) {
      await loadFamily();
      if (refreshUser) await refreshUser();
      setStatusMessage('Familien-Icon entfernt.');
    }
  };

  const handleSaveFamilyName = async (e) => {
    e.preventDefault();
    if (!editedName.trim() || !activeFamily?.id) return;
    const res = await updateFamily(activeFamily.id, { name: editedName.trim() });
    if (res.ok) {
      setIsEditingName(false);
      await loadFamily();
      if (refreshUser) await refreshUser();
      setStatusMessage('Familienname gespeichert.');
    } else {
      setStatusMessage(res.error || 'Fehler beim Speichern.');
    }
  };

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    if (!activeFamily?.id) return;
    const res = await createFamilyInvite(
      activeFamily.id,
      inviteRole,
      Number.parseInt(inviteExpiresIn, 10),
      Number.parseInt(inviteMaxUses, 10)
    );
    if (res.ok) {
      setGeneratedInvite(res.data);
      await loadFamily();
      setStatusMessage('Einladungscode erfolgreich generiert.');
    } else {
      setStatusMessage(res.error || 'Fehler beim Erstellen des Codes.');
    }
  };

  const handleDeleteInvite = async (code) => {
    if (!activeFamily?.id) return;
    const res = await deleteFamilyInvite(activeFamily.id, code);
    if (res.ok) {
      await loadFamily();
      if (generatedInvite?.code === code) setGeneratedInvite(null);
      setStatusMessage('Code erfolgreich widerrufen.');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!activeFamily?.id) return;
    const res = await updateFamilyMemberRole(activeFamily.id, userId, newRole);
    if (res.ok) {
      await loadFamily();
      setStatusMessage('Rolle erfolgreich aktualisiert.');
    } else {
      setStatusMessage(res.error || 'Fehler beim Ändern der Rolle.');
    }
  };

  const handleTransferOwnership = async (userId, memberName) => {
    if (
      !activeFamily?.id ||
      !window.confirm(
        `Möchten Sie die Eigentümerschaft an "${memberName}" übertragen? Sie verlieren dadurch Ihre Eigentümerrechte.`
      )
    )
      return;
    const res = await transferFamilyOwnership(activeFamily.id, userId);
    if (res.ok) {
      await loadFamily();
      if (refreshUser) await refreshUser();
      setStatusMessage(`Inhaberschaft an ${memberName} übertragen.`);
    } else {
      setStatusMessage(res.error || 'Fehler bei der Übertragung.');
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (
      !activeFamily?.id ||
      !window.confirm(`Möchten Sie "${memberName}" wirklich aus der Familie entfernen?`)
    )
      return;
    const res = await removeFamilyMember(activeFamily.id, userId);
    if (res.ok) {
      await loadFamily();
      setStatusMessage(`${memberName} wurde entfernt.`);
    } else {
      setStatusMessage(res.error || 'Fehler beim Entfernen.');
    }
  };

  const handleJoinFamily = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    const res = await joinFamily(joinCodeInput.trim());
    if (res.ok) {
      setJoinCodeInput('');
      setStatusMessage('Familie erfolgreich beigetreten!');
      if (refreshUser) await refreshUser();
      await loadFamily();
    } else {
      setStatusMessage(res.error || 'Ungültiger oder abgelaufener Code.');
    }
  };

  const handleLeaveFamily = async () => {
    if (!activeFamily?.id || !window.confirm('Möchten Sie diese Familie wirklich verlassen?'))
      return;
    const res = await leaveFamily(activeFamily.id);
    if (res.ok) {
      if (refreshUser) await refreshUser();
      onClose();
    } else {
      setStatusMessage(res.error || 'Fehler beim Verlassen der Familie.');
    }
  };

  const handleDeleteCurrentFamily = async () => {
    if (
      !activeFamily?.id ||
      !window.confirm(
        'Möchten Sie diese Familie wirklich unwiderruflich löschen? Alle zugehörigen Daten gehen verloren.'
      )
    )
      return;
    const res = await deleteFamily(activeFamily.id);
    if (res.ok) {
      if (refreshUser) await refreshUser();
      onClose();
    } else {
      setStatusMessage(res.error || 'Fehler beim Löschen der Familie.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      aria-labelledby="family-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
    >
      <div
        ref={dialogRef}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 id="family-modal-title" className="text-base font-bold">
                {t('family.title')}
              </h2>
              <p className="text-xs text-slate-400">{t('family.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Family Avatar & Header Details */}
        <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="relative group shrink-0">
            {activeFamily?.avatar ? (
              <img
                src={getAuthorizedMediaUrl(activeFamily.avatar)}
                alt={activeFamily?.name || 'Familie'}
                className="w-12 h-12 rounded-2xl object-cover border border-cyan-500/40 shadow-lg shadow-cyan-950/60"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/60">
                <Users className="w-6 h-6" />
              </div>
            )}

            {canEdit && (
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
                    className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md z-10 transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
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
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-md cursor-pointer"
                  >
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedName(activeFamily?.name || '');
                      setIsEditingName(false);
                    }}
                    className="px-2.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs rounded-lg transition-colors cursor-pointer"
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
                    className="p-1 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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
              className="text-cyan-400 hover:text-cyan-200 ml-2 cursor-pointer"
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

        {/* Members List Subcomponent */}
        <MemberList
          familyData={familyData}
          user={user}
          isAdmin={isAdmin}
          activeFamily={activeFamily}
          handleTransferOwnership={handleTransferOwnership}
          handleRoleChange={handleRoleChange}
          handleRemoveMember={handleRemoveMember}
        />

        {/* Invite Generator Subcomponent */}
        <InviteCodeManager
          isAdmin={isAdmin}
          familyData={familyData}
          inviteRole={inviteRole}
          setInviteRole={setInviteRole}
          inviteExpiresIn={inviteExpiresIn}
          setInviteExpiresIn={setInviteExpiresIn}
          inviteMaxUses={inviteMaxUses}
          setInviteMaxUses={setInviteMaxUses}
          handleGenerateInvite={handleGenerateInvite}
          handleDeleteInvite={handleDeleteInvite}
          generatedInvite={generatedInvite}
          copied={copied}
          setCopied={setCopied}
        />

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
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              {t('family.joinBtn')}
            </button>
          </form>
        </div>

        {/* Leave Family */}
        {!activeFamily?.isOwner && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs mb-3">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('family.leaveFamily')}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                {t('family.leaveConfirm')}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLeaveFamily}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('family.leaveFamily')}</span>
            </button>
          </div>
        )}

        {/* Delete Family */}
        {(isAdmin || activeFamily?.isOwner) && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{t('family.deleteFamily')}</span>
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-400/90 font-medium mt-0.5">
                {t('family.deleteConfirm')}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeleteCurrentFamily}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('family.deleteFamily')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
