import { Sparkles } from 'lucide-react';

export function CustomMilestoneModal({
  isOpen,
  onClose,
  customIcon,
  setCustomIcon,
  customTitle,
  setCustomTitle,
  customCategory,
  setCustomCategory,
  customDesc,
  setCustomDesc,
  onCreateCustomMilestone,
  t,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <h3 className="text-base font-bold mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>{t('milestones.createCustomTitle', 'Eigenen Meilenstein anlegen')}</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          {t(
            'milestones.createCustomSubtitle',
            'Erstelle einen individuellen Entwicklungsschritt für dein Kind.'
          )}
        </p>

        <form onSubmit={onCreateCustomMilestone} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-24">
              <label
                htmlFor="custom-icon"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                {t('milestones.customIconLabel', 'Icon')}
              </label>
              <input
                id="custom-icon"
                type="text"
                required
                value={customIcon}
                onChange={(e) => setCustomIcon(e.target.value)}
                className="w-full text-center text-lg py-1.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-1 mt-1.5 justify-center">
                {['⭐', '🎉', '🚲', '🎨', '🏊‍♂️'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setCustomIcon(emoji)}
                    className="text-xs p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <label
                htmlFor="custom-title"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                {t('milestones.customTitleLabel', 'Titel des Meilensteins *')}
              </label>
              <input
                id="custom-title"
                type="text"
                required
                placeholder="z. B. Erstes Mal Laufrad gefahren"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="custom-category"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              {t('milestones.customCategoryLabel', 'Kategorie')}
            </label>
            <select
              id="custom-category"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="custom">{t('milestones.filterCustom', 'Eigene')}</option>
              <option value="motor">{t('milestones.filterMotor', 'Motorik')}</option>
              <option value="language">{t('milestones.filterLanguage', 'Sprache')}</option>
              <option value="social">{t('milestones.filterSocial', 'Sozial')}</option>
              <option value="nutrition">{t('milestones.filterNutrition', 'Ernährung')}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="custom-desc"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              {t('milestones.customDescLabel', 'Beschreibung (optional)')}
            </label>
            <textarea
              id="custom-desc"
              rows={2}
              placeholder="z. B. Hält das Gleichgewicht..."
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
            >
              {t('common.cancel', 'Abbrechen')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-950 cursor-pointer"
            >
              {t('milestones.addCustom', 'Meilenstein erstellen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
