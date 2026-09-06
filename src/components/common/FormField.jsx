import React from 'react';

/**
 * Standardized FormField component (#281)
 * Wraps form controls with accessible label, required asterisk, description, inline error message and dirty state.
 */
export function FormField({
  id,
  label,
  required = false,
  description,
  error,
  dirty = false,
  children,
  className = '',
}) {
  const errorId = error && id ? `${id}-error` : undefined;
  const descId = description && id ? `${id}-desc` : undefined;

  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="text-xs font-semibold text-slate-300 flex items-center gap-1"
          >
            <span>{label}</span>
            {required && (
              <span className="text-rose-400 font-bold" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {dirty && <span className="text-[10px] text-amber-400/80 font-medium">Geändert</span>}
        </div>
      )}

      {description && (
        <p id={descId} className="text-[11px] text-slate-400">
          {description}
        </p>
      )}

      <div>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          return React.cloneElement(child, {
            id: child.props.id || id,
            'aria-invalid': Boolean(error) || undefined,
            'aria-describedby': [descId, errorId].filter(Boolean).join(' ') || undefined,
            required: required || child.props.required,
          });
        })}
      </div>

      {error && (
        <p
          id={errorId}
          className="text-xs text-rose-400 flex items-center gap-1 animate-in fade-in duration-200"
          role="alert"
        >
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Standardized FormInput component (#281)
 * Accessible styled input with built-in states (normal, focus, error, valid).
 */
export function FormInput({ id, type = 'text', error, icon: Icon, className = '', ...props }) {
  const baseInputStyle =
    'w-full py-2.5 bg-slate-950/90 border rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all';
  const stateStyle = error
    ? 'border-rose-500/80 focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30 text-rose-100'
    : 'border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30';
  const paddingStyle = Icon ? 'pl-9 pr-3' : 'px-3';

  return (
    <div className="relative">
      {Icon && (
        <Icon className="w-4 h-4 absolute left-3 top-3.5 text-slate-500 pointer-events-none" />
      )}
      <input
        id={id}
        type={type}
        className={`${baseInputStyle} ${stateStyle} ${paddingStyle} ${className}`}
        {...props}
      />
    </div>
  );
}
