import React from 'react';

/**
 * Reusable Empty State Component (BC-129).
 * Displays a friendly icon, title, description, and optional action button.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`text-center py-12 px-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 max-w-md mx-auto my-6 ${className}`}
      role="region"
      aria-label={title}
    >
      {Icon && (
        <div className="w-14 h-14 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20 shadow-inner">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-100 mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 leading-relaxed mb-5 max-w-xs mx-auto">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950 transition-all cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
