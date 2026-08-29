import { KeyRound, Copy, Check, Clock, UserPlus, Trash2 } from 'lucide-react';

export default function InviteCodeManager({
  isAdmin,
  familyData,
  inviteRole,
  setInviteRole,
  inviteExpiresIn,
  setInviteExpiresIn,
  inviteMaxUses,
  setInviteMaxUses,
  handleGenerateInvite,
  handleDeleteInvite,
  generatedInvite,
  copied,
  setCopied,
}) {
  return (
    <div>
      {/* Invite Code Generator (Admin only) */}
      {isAdmin && (
        <div className="mb-6 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-900/40">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4" />
            <span>Neuen Einladungscode erstellen</span>
          </h3>

          <form onSubmit={handleGenerateInvite} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="invite-role-select"
                  className="block text-[11px] font-medium text-slate-400 mb-1"
                >
                  Rolle des Eingeladenen
                </label>
                <select
                  id="invite-role-select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="editor">Elternteil (Schreibrechte)</option>
                  <option value="viewer">Besucher (Nur Leserechte)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="invite-expires-select"
                  className="block text-[11px] font-medium text-slate-400 mb-1"
                >
                  Gültigkeit
                </label>
                <select
                  id="invite-expires-select"
                  value={inviteExpiresIn}
                  onChange={(e) => setInviteExpiresIn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="24">24 Stunden (1 Tag)</option>
                  <option value="48">48 Stunden (2 Tage)</option>
                  <option value="168">7 Tage (1 Woche)</option>
                  <option value="720">30 Tage (1 Monat)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="invite-maxuses-select"
                  className="block text-[11px] font-medium text-slate-400 mb-1"
                >
                  Nutzungen
                </label>
                <select
                  id="invite-maxuses-select"
                  value={inviteMaxUses}
                  onChange={(e) => setInviteMaxUses(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="1">1 Mal (Einmalcode)</option>
                  <option value="3">3 Mal</option>
                  <option value="5">5 Mal</option>
                  <option value="0">Unbegrenzt</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-linear-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-950/80 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Einladungscode generieren</span>
            </button>
          </form>

          {/* Newly Generated Invite Code Display */}
          {generatedInvite && (
            <div className="mt-3 p-3 bg-cyan-900/40 border border-cyan-500/50 rounded-xl flex items-center justify-between animate-fadeIn">
              <div>
                <div className="text-[10px] text-cyan-300 font-semibold">Generierter Code:</div>
                <div className="text-base font-mono font-bold text-white tracking-widest">
                  {generatedInvite.code}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedInvite.code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
              </button>
            </div>
          )}

          {/* Active Invites List */}
          {familyData?.invites && familyData.invites.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 mb-2">
                Aktive Einladungscodes ({familyData.invites.length})
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {familyData.invites.map((inv) => (
                  <div
                    key={inv.code}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-cyan-300 mr-2">{inv.code}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {inv.role === 'editor' ? 'Elternteil' : 'Besucher'}
                      </span>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Läuft ab: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                        <span>
                          • Noch{' '}
                          {inv.maxUses ? `${inv.maxUses - inv.usesCount} übrig` : 'unbegrenzt'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inv.code);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        title="Code kopieren"
                        aria-label="Code kopieren"
                        className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteInvite(inv.code)}
                        title="Code löschen"
                        aria-label="Code löschen"
                        className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
