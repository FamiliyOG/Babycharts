import { Edit2, Trash2, Plus } from 'lucide-react';
import { getAuthorizedMediaUrl } from '../../utils/api.js';

const getProfileButtonClass = (isActive, childIsGirl) => {
  if (!isActive) {
    return 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/60';
  }
  if (childIsGirl) {
    return 'bg-linear-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-950/40 font-medium';
  }
  return 'bg-linear-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-950/40 font-medium';
};

export function ChildProfileAvatar({ child, isGirl }) {
  if (child.avatar) {
    return (
      <img
        src={getAuthorizedMediaUrl(child.avatar)}
        alt=""
        aria-hidden="true"
        className="w-4 h-4 rounded-full object-cover border border-white/40"
      />
    );
  }

  if (isGirl) {
    return (
      <svg
        className="w-3.5 h-3.5 text-pink-200 fill-none stroke-current stroke-2 shrink-0"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="5" />
        <line x1="12" y1="13" x2="12" y2="21" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    );
  }

  return (
    <svg
      className="w-3.5 h-3.5 text-cyan-200 fill-none stroke-current stroke-2 shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="10" cy="14" r="5" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <polyline points="15 3 21 3 21 9" />
    </svg>
  );
}

export function ProfilePillList({
  profiles,
  activeChild,
  canEdit,
  onSelectChild,
  onOpenEditProfile,
  onDeleteProfile,
  onOpenAddProfile,
}) {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900/90 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-inner">
      {profiles.map((child) => {
        const isActive = child.id === activeChild?.id;
        const childIsGirl = child.gender === 'girl';
        return (
          <div
            key={child.id}
            className={`flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-xl transition-all ${getProfileButtonClass(isActive, childIsGirl)}`}
          >
            <button
              type="button"
              onClick={() => onSelectChild(child.id)}
              className="flex items-center gap-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <ChildProfileAvatar child={child} isGirl={childIsGirl} />
              <span className="font-semibold">{child.name}</span>
            </button>

            {isActive && canEdit && (
              <div className="flex items-center gap-1 ml-1.5 pl-1.5 border-l border-white/25">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenEditProfile) onOpenEditProfile(child);
                  }}
                  title={`${child.name} bearbeiten`}
                  aria-label={`${child.name} bearbeiten`}
                  className="p-2 min-w-7 min-h-7 flex items-center justify-center rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors active:scale-95 touch-manipulation cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Möchten Sie "${child.name}" wirklich löschen?`)) {
                      if (onDeleteProfile) onDeleteProfile(child.id);
                    }
                  }}
                  title={`${child.name} löschen`}
                  aria-label={`${child.name} löschen`}
                  className="p-2 min-w-7 min-h-7 flex items-center justify-center rounded-lg hover:bg-rose-950/80 text-rose-200 hover:text-rose-100 transition-colors active:scale-95 touch-manipulation cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {canEdit && (
        <button
          type="button"
          onClick={onOpenAddProfile}
          title="Neues Kind hinzufügen"
          aria-label="Neues Kind hinzufügen"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
