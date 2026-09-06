import { History, Loader2 } from 'lucide-react';
import { useInfiniteResourceQuery } from '../../hooks/useInfiniteResourceQuery.js';
import { fetchFamilyAuditLogs } from '../../utils/api.js';

export function FamilyAuditLogSection({ familyId, auditLogs, showAuditLogs, onToggleShow }) {
  const {
    items: paginatedLogs,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteResourceQuery({
    queryFn: (cursor) => fetchFamilyAuditLogs(familyId, 25, cursor),
    enabled: Boolean(showAuditLogs && familyId),
    dependencyKey: familyId,
  });

  const effectiveLogs = paginatedLogs.length > 0 ? paginatedLogs : auditLogs || [];

  const renderContent = () => {
    if (isLoading && effectiveLogs.length === 0) {
      return (
        <div className="flex items-center justify-center py-4 text-slate-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Lade Aktivitäten...</span>
        </div>
      );
    }

    if (effectiveLogs.length === 0) {
      return (
        <div className="text-[11px] text-slate-500 text-center py-2">
          Noch keine Aktivitäten protokolliert.
        </div>
      );
    }

    return (
      <>
        {effectiveLogs.map((log) => (
          <div
            key={log.id}
            className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-2"
          >
            <div>
              <div className="text-xs font-semibold text-slate-200">
                {log.details || log.action}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Durchgeführt von <span className="font-bold text-slate-300">{log.userName}</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 shrink-0">
              {new Date(log.timestamp).toLocaleDateString(undefined, {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
        {hasNextPage && (
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
            >
              {isFetchingNextPage && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Ältere Einträge nachladen</span>
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xs mb-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-xs font-bold text-slate-200">
              Aktivitäten-Protokoll (Audit-Log)
            </div>
            <div className="text-[10px] text-slate-400">
              Änderungshistorie aller Familienmitglieder
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleShow}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors cursor-pointer"
        >
          {showAuditLogs ? 'Verbergen' : `Anzeigen (${effectiveLogs.length})`}
        </button>
      </div>

      {showAuditLogs && (
        <div className="pt-2 border-t border-slate-800 space-y-2 max-h-56 overflow-y-auto pr-1">
          {renderContent()}
        </div>
      )}
    </div>
  );
}
