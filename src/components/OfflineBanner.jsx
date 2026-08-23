import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(
    typeof window !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-600/90 text-amber-950 font-bold text-xs py-2 px-4 flex items-center justify-center gap-2 shadow-md animate-fadeIn safe-area-inset-top">
      <WifiOff className="w-4 h-4 shrink-0 text-amber-950" />
      <span>
        Offline-Modus: Alle Änderungen werden lokal auf Ihrem Gerät gespeichert und synchronisiert,
        sobald Sie wieder online sind.
      </span>
    </div>
  );
}
