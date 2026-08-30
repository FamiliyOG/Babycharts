import { useTranslation } from 'react-i18next';

export default function NoChildWelcome({ canEdit, isDev, onOpenCreateModal, onLoadDemoData }) {
  const { t } = useTranslation();

  return (
    <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-xl mx-auto my-12">
      <h2 className="text-2xl font-bold text-white mb-2">{t('app.welcomeTitle')}</h2>
      <p className="text-slate-400 text-sm mb-6">{t('app.welcomeSubtitle')}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {canEdit && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm shadow-lg shadow-cyan-950 transition-all cursor-pointer"
          >
            {t('app.createFirstChild')}
          </button>
        )}
        {isDev && (
          <button
            type="button"
            onClick={onLoadDemoData}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all cursor-pointer"
          >
            {t('app.loadDemoData')}
          </button>
        )}
      </div>
    </div>
  );
}
