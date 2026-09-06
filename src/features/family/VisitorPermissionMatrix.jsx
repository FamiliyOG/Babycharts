import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Check, X, Loader2 } from 'lucide-react';
import { fetchVisitorGrants, updateVisitorGrants } from '../../utils/api.js';

const CATEGORIES = [
  { id: 'growth', labelKey: 'visitorGrants.growth', fallback: 'Wachstum & Kurven' },
  { id: 'vaccinations', labelKey: 'visitorGrants.vaccinations', fallback: 'Impfungen' },
  { id: 'uCheckups', labelKey: 'visitorGrants.uCheckups', fallback: 'U-Untersuchungen' },
  { id: 'teeth', labelKey: 'visitorGrants.teeth', fallback: 'Zähne' },
  { id: 'milestones', labelKey: 'visitorGrants.milestones', fallback: 'Meilensteine' },
  { id: 'health', labelKey: 'visitorGrants.health', fallback: 'Gesundheit & Temperatur' },
  { id: 'photos', labelKey: 'visitorGrants.photos', fallback: 'Fotos & Avatar' },
  { id: 'notes', labelKey: 'visitorGrants.notes', fallback: 'Private Notizen' },
];

export default function VisitorPermissionMatrix({
  familyId,
  visitorMember,
  profiles = [],
  onClose,
}) {
  const { t } = useTranslation();
  const [grants, setGrants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchVisitorGrants(familyId, visitorMember.userId).then((res) => {
      if (isMounted) {
        if (res.ok) {
          setGrants(res.data?.grants || []);
        }
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [familyId, visitorMember.userId]);

  const isGranted = (profileId, category) => {
    return grants.some((g) => g.profileId === profileId && g.category === category);
  };

  const handleToggle = (profileId, category) => {
    setGrants((prev) => {
      const exists = prev.some((g) => g.profileId === profileId && g.category === category);
      if (exists) {
        return prev.filter((g) => !(g.profileId === profileId && g.category === category));
      }
      return [...prev, { profileId, category }];
    });
  };

  const handleToggleAllForChild = (profileId, grantAll) => {
    setGrants((prev) => {
      const withoutChild = prev.filter((g) => g.profileId !== profileId);
      if (!grantAll) return withoutChild;
      const allForChild = CATEGORIES.map((c) => ({ profileId, category: c.id }));
      return [...withoutChild, ...allForChild];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    const res = await updateVisitorGrants(familyId, visitorMember.userId, grants);
    setIsSaving(false);
    if (res.ok) {
      setStatusMsg(t('visitorGrants.saveSuccess', 'Freigaben erfolgreich gespeichert.'));
      setTimeout(() => {
        if (onClose) onClose();
      }, 1000);
    } else {
      setStatusMsg(res.error || t('visitorGrants.saveError', 'Fehler beim Speichern.'));
    }
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100">
            {t('visitorGrants.title', 'Besucher-Freigaben für')}:{' '}
            <span className="text-cyan-400">{visitorMember.name}</span>
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-400">
        {t(
          'visitorGrants.description',
          'Legen Sie genau fest, welche Daten dieses Mitglied pro Kind einsehen darf (Default-Deny).'
        )}
      </p>

      {(() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center p-6 text-slate-400 gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>{t('visitorGrants.loading', 'Lade Berechtigungen...')}</span>
            </div>
          );
        }

        if (profiles.length === 0) {
          return (
            <div className="text-xs text-slate-500 italic p-4 text-center">
              {t('visitorGrants.noProfiles', 'Keine Kinder in dieser Familie vorhanden.')}
            </div>
          );
        }

        return (
          <div className="space-y-4 max-h-85 overflow-y-auto pr-1">
            {profiles.map((profile) => {
              const grantedCount = CATEGORIES.filter((c) => isGranted(profile.id, c.id)).length;
              const allGranted = grantedCount === CATEGORIES.length;

              return (
                <div
                  key={profile.id}
                  className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{profile.name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAllForChild(profile.id, !allGranted)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                    >
                      {allGranted
                        ? t('visitorGrants.revokeAll', 'Alle entziehen')
                        : t('visitorGrants.grantAll', 'Alle gewähren')}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => {
                      const checked = isGranted(profile.id, cat.id);
                      return (
                        <label
                          key={cat.id}
                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                            checked
                              ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200'
                              : 'bg-slate-900/40 border-slate-800/50 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggle(profile.id, cat.id)}
                            className="w-3.5 h-3.5 rounded border-slate-700 text-cyan-600 focus:ring-0 focus:ring-offset-0 bg-slate-900 cursor-pointer"
                          />
                          <span className="truncate">{t(cat.labelKey, cat.fallback)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {statusMsg && (
        <div className="text-xs p-2 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 text-center">
          {statusMsg}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 cursor-pointer"
        >
          {t('common.cancel', 'Abbrechen')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-1.5 bg-linear-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>{t('common.save', 'Speichern')}</span>
        </button>
      </div>
    </div>
  );
}
