import {
  Activity,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Award,
  Syringe,
  Smile,
  FileDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';

export default function WelcomeHomeScreen() {
  const { t } = useTranslation();
  const { setIsAuthModalOpen } = useAuth();

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-12 px-4 animate-fadeIn max-w-6xl mx-auto">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-950/70 border border-cyan-300 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300 text-xs font-bold mb-4 shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span>{t('homeScreen.badge')}</span>
      </div>

      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:bg-linear-to-r dark:from-white dark:via-slate-100 dark:to-slate-400 dark:bg-clip-text dark:text-transparent leading-tight mb-4">
          {t('homeScreen.heroTitle')}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium">
          {t('homeScreen.heroSubtitle')}
        </p>

        {/* Single Clear CTA Button */}
        <div className="flex items-center justify-center gap-3.5 mt-6">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-900/30 active:scale-95 transition-all cursor-pointer"
          >
            <span>{t('homeScreen.ctaButton')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Feature Highlights Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5 w-full mt-2">
        {/* 1. WHO Percentiles */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-md relative overflow-hidden group hover:border-cyan-400 dark:hover:border-slate-700 transition-all">
          <div className="p-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800/50 text-cyan-600 dark:text-cyan-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            {t('homeScreen.card1Title')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('homeScreen.card1Desc')}
          </p>
        </div>

        {/* 2. U-Checkups */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-md relative overflow-hidden group hover:border-emerald-400 dark:hover:border-slate-700 transition-all">
          <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <Award className="w-5 h-5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            {t('homeScreen.card2Title')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('homeScreen.card2Desc')}
          </p>
        </div>

        {/* 3. Vaccinations */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-md relative overflow-hidden group hover:border-rose-400 dark:hover:border-slate-700 transition-all">
          <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <Syringe className="w-5 h-5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            {t('homeScreen.card3Title')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('homeScreen.card3Desc')}
          </p>
        </div>

        {/* 4. Teeth Tracker */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-md relative overflow-hidden group hover:border-amber-400 dark:hover:border-slate-700 transition-all">
          <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <Smile className="w-5 h-5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            {t('homeScreen.card4Title')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('homeScreen.card4Desc')}
          </p>
        </div>

        {/* 5. Milestone Diary */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-md relative overflow-hidden group hover:border-purple-400 dark:hover:border-slate-700 transition-all">
          <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            {t('homeScreen.card5Title')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('homeScreen.card5Desc')}
          </p>
        </div>

        {/* 6. Family & Doctor Export */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-md relative overflow-hidden group hover:border-indigo-400 dark:hover:border-slate-700 transition-all">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <FileDown className="w-5 h-5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            {t('homeScreen.card6Title')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('homeScreen.card6Desc')}
          </p>
        </div>
      </div>

      {/* Security & Privacy Banner */}
      <div className="mt-8 text-center text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>{t('homeScreen.privacyBanner')}</span>
      </div>
    </div>
  );
}
