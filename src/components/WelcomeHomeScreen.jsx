import { Activity, ShieldCheck, Users, Sparkles, ArrowRight, Award, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function WelcomeHomeScreen() {
  const { setIsAuthModalOpen } = useAuth();

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 sm:py-16 px-4 animate-fadeIn">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-950/70 border border-cyan-300 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300 text-xs font-bold mb-6 shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span>WHO-Standard Wachstumskurven &amp; Familien-Tracking</span>
      </div>

      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:bg-linear-to-r dark:from-white dark:via-slate-100 dark:to-slate-400 dark:bg-clip-text dark:text-transparent leading-tight mb-4">
          Die Entwicklung Ihres Babys im perfekten Blick.
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto font-medium">
          Präzise Perzentilen-Analysen (Gewicht, Größe, Kopfumfang &amp; BMI), deutsches U-Heft
          Vorsorge-Tracking und geteiltes Erfassen für die ganze Familie.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-900/30 active:scale-95 transition-all"
          >
            <span>Jetzt kostenlos anmelden</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm border border-slate-300 dark:border-slate-800 shadow-sm transition-all active:scale-95"
          >
            <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Konto erstellen / Einladung einlösen</span>
          </button>
        </div>
      </div>

      {/* 3 Feature Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full mx-auto mt-4">
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-md relative overflow-hidden group hover:border-cyan-400 dark:hover:border-slate-700 transition-all">
          <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800/50 text-cyan-600 dark:text-cyan-400 w-fit mb-3.5 group-hover:scale-110 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
            WHO Perzentilen
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Offizielle WHO-Standards für Jungen und Mädchen von 0 bis 5 Jahren mit interaktiver
            Kurvenanalyse.
          </p>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-md relative overflow-hidden group hover:border-emerald-400 dark:hover:border-slate-700 transition-all">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 w-fit mb-3.5 group-hover:scale-110 transition-transform">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
            U1 – U9 Vorsorgeplan
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Vollständige deutsche U-Untersuchungen mit empfohlenen Zeiträumen und
            Fortschrittsübersicht.
          </p>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-md relative overflow-hidden group hover:border-indigo-400 dark:hover:border-slate-700 transition-all">
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 w-fit mb-3.5 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
            Gemeinsam für Familien
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Laden Sie Ihren Partner mit Schreibrechten oder Großeltern als Besucher (nur Lesen) per
            Code ein.
          </p>
        </div>
      </div>

      {/* Security Banner */}
      <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Vollständig privat &amp; sicher auf Ihrem eigenen Server gehostet</span>
      </div>
    </div>
  );
}
