import { useState } from 'react';
import { useProtectedMedia } from '../../hooks/useProtectedMedia.js';

/**
 * src/components/media/ResponsiveMedia.jsx
 *
 * Safe responsive media component with automated thumbnail variant selection,
 * lazy-loading, zero CLS dimensions, and lifecycle object-URL cleanup (BC-296).
 */
export default function ResponsiveMedia({
  src,
  alt = '',
  size = 'md',
  className = '',
  fallback = null,
  width = undefined,
  height = undefined,
  loading = 'lazy',
  onClick = undefined,
}) {
  const { src: objectSrc, isLoading, error } = useProtectedMedia(src, size);
  const [hasLoaded, setHasLoaded] = useState(false);

  if (!src) {
    return fallback || null;
  }

  const isVideo =
    typeof src === 'string' &&
    (src.startsWith('data:video/') || src.includes('.mp4') || src.includes('.webm'));

  if (isVideo) {
    return (
      <video
        src={objectSrc || src}
        className={className}
        width={width}
        height={height}
        controls
        preload="metadata"
      >
        <track kind="captions" />
      </video>
    );
  }

  const content = (
    <>
      {isLoading && !objectSrc && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse rounded-inherit" />
      )}
      {objectSrc && (
        <img
          src={objectSrc}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          onLoad={() => setHasLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            hasLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      {error && !objectSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-xs text-slate-500">
          Fehler beim Laden
        </div>
      )}
    </>
  );

  const containerStyle = {
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
  };

  if (onClick) {
    return (
      <button
        type="button"
        className={`relative overflow-hidden p-0 border-0 bg-transparent text-left cursor-pointer ${className}`}
        style={containerStyle}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={containerStyle}>
      {content}
    </div>
  );
}
