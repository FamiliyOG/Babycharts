import { useTranslation } from 'react-i18next';
import { Trash2, Crown } from 'lucide-react';
import { getAuthorizedMediaUrl } from '../../utils/api.js';

export function getRoleBadgeClass(role) {
  if (role === 'admin') {
    return 'bg-amber-950/60 text-amber-300 border-amber-800/60';
  }
  if (role === 'editor') {
    return 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60';
  }
  return 'bg-slate-900 text-slate-400 border-slate-700';
}

export function getRoleLabel(role, t = null) {
  if (role === 'admin') return `👑 ${t ? t('family.roleBadgeAdmin', 'Admin') : 'Admin'}`;
  if (role === 'editor')
    return `✏️ ${t ? t('family.roleBadgeEditor', 'Elternteil') : 'Elternteil'}`;
  return `👁️ ${t ? t('family.roleBadgeViewer', 'Besucher') : 'Besucher'}`;
}

export function getFullRoleLabel(role, t = null) {
  if (role === 'admin')
    return t
      ? t('family.roleFullAdmin', 'Administrator (Volle Rechte)')
      : 'Administrator (Volle Rechte)';
  if (role === 'editor')
    return t
      ? t('family.roleFullEditor', 'Elternteil (Schreibrechte)')
      : 'Elternteil (Schreibrechte)';
  return t ? t('family.roleFullViewer', 'Besucher (Nur Leserechte)') : 'Besucher (Nur Leserechte)';
}

export default function MemberList({
  familyData,
  user,
  isAdmin,
  activeFamily,
  handleTransferOwnership,
  handleRoleChange,
  handleRemoveMember,
}) {
  const { t } = useTranslation();
  return (
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
                      src={getAuthorizedMediaUrl(member.avatar)}
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
                      <span>{member.name || t('common.profile', 'Benutzer')}</span>
                      {isCurrentUser && (
                        <span className="text-[10px] text-cyan-400 font-normal">
                          {t('family.youBadge', '(Sie)')}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">{member.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Owner Transfer Button (Visible only to the current owner on other members, BC-044) */}
                  {activeFamily?.isOwner && !isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => handleTransferOwnership(member.userId, member.name)}
                      className="p-1 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-950/40 transition-colors cursor-pointer"
                      title={t('family.transferOwnership', 'Eigentümer übertragen')}
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isAdmin && !isCurrentUser && member.userId !== familyData.ownerId ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                      aria-label={`Rolle für ${member.name} ändern`}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="admin">👑 {t('roles.admin', 'Administrator')}</option>
                      <option value="editor">✏️ {t('roles.editor', 'Elternteil')}</option>
                      <option value="viewer">👁️ {t('roles.viewer', 'Besucher')}</option>
                    </select>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeClass(member.role)}`}
                    >
                      {getRoleLabel(member.role, t)}
                    </span>
                  )}

                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.userId, member.name)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title={t('family.removeMember', 'Mitglied entfernen')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-slate-500 p-2">
            {t('family.loadingMembers', 'Lade Mitglieder...')}
          </div>
        )}
      </div>
    </div>
  );
}
