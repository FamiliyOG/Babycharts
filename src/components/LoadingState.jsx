import React from 'react';

/**
 * Reusable Skeleton & Loading Loader Component (BC-128).
 */
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-800/60 rounded-xl ${className}`} />;
}

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full border-cyan-500 border-t-transparent animate-spin`}
        role="status"
        aria-label="Wird geladen..."
      />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    </div>
  );
}
