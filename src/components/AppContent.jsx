import { useTranslation } from 'react-i18next';
import { TrendingUp, ClipboardList, Syringe, HeartPulse, Sparkles } from 'lucide-react';
import WelcomeHomeScreen from './WelcomeHomeScreen.jsx';
import PercentileCard from './PercentileCard.jsx';
import GrowthChart from './GrowthChart.jsx';
import MeasurementTable from './MeasurementTable.jsx';
import UCheckupTracker from './UCheckupTracker.jsx';
import VaccinationTracker from './VaccinationTracker.jsx';
import TeethTracker from './TeethTracker.jsx';
import MilestoneTracker from './MilestoneTracker.jsx';
import HealthTracker from './HealthTracker.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { LoadingSpinner } from './LoadingState.jsx';
import EmptyState from './EmptyState.jsx';

export default function AppContent({
  isLoading,
  user,
  activeChild,
  ageInfo,
  activeTab,
  setActiveTab,
  activeChildMeasurements,
  handleEditMeasurement,
  handleDeleteMeasurement,
  handleOpenAddMeasurement,
  handleSaveProfile,
  canEdit,
  isDev,
  setIsProfileModalOpen,
  handleLoadDemoData,
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <WelcomeHomeScreen />;
  }

  if (activeChild) {
    return (
      <div className="space-y-6">
        {/* Top Stat Cards Grid */}
        <PercentileCard activeChild={activeChild} ageInfo={ageInfo} />

        {/* Module Navigation Tabs (Desktop / Tablet only) */}
        <div className="hidden md:flex items-center justify-center gap-2.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('growth')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              activeTab === 'growth'
                ? 'bg-cyan-700 hover:bg-cyan-600 text-white shadow-md shadow-cyan-950/80 ring-2 ring-cyan-400'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-cyan-200" />
            <span>{t('nav.growth')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ucheckups')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              activeTab === 'ucheckups'
                ? 'bg-blue-700 hover:bg-blue-600 text-white shadow-md shadow-blue-950/80 ring-2 ring-blue-400'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-blue-200" />
            <span>{t('nav.uCheckups')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vaccines')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              activeTab === 'vaccines'
                ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-md shadow-emerald-950/80 ring-2 ring-emerald-400'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Syringe className="w-4 h-4 text-emerald-200" />
            <span>{t('nav.vaccinations')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teeth')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              activeTab === 'teeth'
                ? 'bg-pink-700 hover:bg-pink-600 text-white shadow-md shadow-pink-950/80 ring-2 ring-pink-400'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span className="text-base leading-none">🦷</span>
            <span>{t('nav.teeth')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              activeTab === 'milestones'
                ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-md shadow-amber-950/80 ring-2 ring-amber-400'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>{t('nav.milestones')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              activeTab === 'health'
                ? 'bg-rose-700 hover:bg-rose-600 text-white shadow-md shadow-rose-950/80 ring-2 ring-rose-400'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-rose-200" />
            <span>{t('nav.health')}</span>
          </button>
        </div>

        {/* Tab Content with Resilient Widget Error Boundary (BC-132) */}
        <ErrorBoundary isWidget>
          {/* Tab 1: Growth Chart & Measurement History */}
          {activeTab === 'growth' && (
            <>
              <GrowthChart activeChild={activeChild} measurements={activeChildMeasurements} />
              <MeasurementTable
                activeChild={activeChild}
                measurements={activeChildMeasurements}
                onEditMeasurement={handleEditMeasurement}
                onDeleteMeasurement={handleDeleteMeasurement}
              />
            </>
          )}

          {/* Tab: U-Heft Vorsorge-Roadmap */}
          {activeTab === 'ucheckups' && (
            <UCheckupTracker
              activeChild={activeChild}
              measurements={activeChildMeasurements}
              onAddCheckupClick={handleOpenAddMeasurement}
            />
          )}

          {/* Tab 2: STIKO Vaccination Tracker */}
          {activeTab === 'vaccines' && (
            <VaccinationTracker
              activeChild={activeChild}
              onUpdateChild={handleSaveProfile}
              canEdit={canEdit}
            />
          )}

          {/* Tab 3: Primary Teeth Eruption Tracker */}
          {activeTab === 'teeth' && (
            <TeethTracker
              activeChild={activeChild}
              onUpdateChild={handleSaveProfile}
              canEdit={canEdit}
            />
          )}

          {/* Tab 4: Milestones Timeline */}
          {activeTab === 'milestones' && (
            <MilestoneTracker
              activeChild={activeChild}
              onUpdateChild={handleSaveProfile}
              canEdit={canEdit}
            />
          )}

          {/* Tab 5: Health & Fever Diary */}
          {activeTab === 'health' && (
            <HealthTracker
              activeChild={activeChild}
              onUpdateChild={handleSaveProfile}
              canEdit={canEdit}
            />
          )}
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-xl mx-auto my-12">
      <h2 className="text-2xl font-bold text-white mb-2">{t('app.welcomeTitle')}</h2>
      <p className="text-slate-400 text-sm mb-6">{t('app.welcomeSubtitle')}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm shadow-lg shadow-cyan-950 transition-all cursor-pointer"
          >
            {t('app.createFirstChild')}
          </button>
        )}
        {isDev && (
          <button
            type="button"
            onClick={handleLoadDemoData}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all cursor-pointer"
          >
            {t('app.loadDemoData')}
          </button>
        )}
      </div>
    </div>
  );
}
