import { Laptop } from 'lucide-react';
import { fetchSessions, revokeSessionApi, revokeAllOtherSessionsApi } from '../../utils/api.js';

export function ActiveSessionsCard({ sessions, setSessions }) {
  const handleRevokeAllOther = async () => {
    if (window.confirm('Möchten Sie wirklich alle anderen Sitzungen abmelden?')) {
      await revokeAllOtherSessionsApi();
      const updated = await fetchSessions();
      setSessions(updated || []);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    await revokeSessionApi(sessionId);
    const updated = await fetchSessions();
    setSessions(updated || []);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Angemeldete Geräte & Sitzungen</span>
        </div>
        {sessions.some((s) => !s.isCurrent) && (
          <button
            type="button"
            onClick={handleRevokeAllOther}
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900 transition-colors cursor-pointer"
          >
            Alle anderen abmelden
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sessions.length === 0 ? (
          <div className="text-[11px] text-slate-500">Keine Sitzungen geladen.</div>
        ) : (
          sessions.map((sess) => (
            <div
              key={sess.id}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
            >
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>{sess.device || 'Unbekanntes Gerät'}</span>
                  {sess.isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                      Aktuelles Gerät
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  IP: {sess.ip} • Aktiv:{' '}
                  {new Date(sess.lastActiveAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {!sess.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRevokeSession(sess.id)}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  Abmelden
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
