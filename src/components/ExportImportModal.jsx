import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useModalDismissal } from '../utils/useModalDismissal.js';
import { useBodyScrollLock } from '../utils/useBodyScrollLock.js';
import { fetchSessions } from '../utils/api.js';
import { encryptBackup } from '../utils/cryptoBackup.js';
import {
  BackupExportCard,
  BackupImportCard,
  ActiveSessionsCard,
  GdprDataExportCard,
  PwaInstallCard,
  ClinicalExportCard,
} from '../features/export/index.js';

export default function ExportImportModal({ isOpen, onClose, profiles, onImportProfiles }) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation();
  const { dialogRef } = useModalDismissal(isOpen, onClose);
  const [importStatus, setImportStatus] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(() =>
    typeof window !== 'undefined' ? window.deferredPrompt : null
  );
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  });

  const [isExporting, setIsExporting] = useState(false);
  const [sessions, setSessions] = useState([]);

  // AES-256-GCM Backup Encryption State (Issue #250)
  const [useEncryption, setUseEncryption] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetchSessions().then((sessList) => {
      if (isMounted) {
        setSessions(sessList || []);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleInstallable = () => {
      setDeferredPrompt(window.deferredPrompt);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        window.deferredPrompt = null;
        setDeferredPrompt(null);
      } catch {
        // ignore
      }
    }
  };

  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      let payload = profiles;
      let filename = `BabyCharts_Backup_${new Date().toISOString().split('T')[0]}.json`;

      if (useEncryption) {
        if (!exportPassphrase || exportPassphrase.length < 6) {
          window.alert(
            'Bitte vergeben Sie ein Passwort mit mindestens 6 Zeichen für das verschlüsselte Backup.'
          );
          setIsExporting(false);
          return;
        }
        payload = await encryptBackup(profiles, exportPassphrase);
        filename = `BabyCharts_EncryptedBackup_${new Date().toISOString().split('T')[0]}.enc.json`;
      }

      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setIsExporting(false);
    } catch (err) {
      setIsExporting(false);
      window.alert('Fehler beim Exportieren: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overscroll-none">
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close', 'Schließen')}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>{t('exportImport.title')}</span>
        </h2>

        {/* PWA Home Screen Installation Card (Mobile only) */}
        <PwaInstallCard
          isInstalled={isInstalled}
          deferredPrompt={deferredPrompt}
          onInstallPwa={handleInstallPwa}
          t={t}
        />

        <div className="space-y-4">
          {/* Plaintext / Encrypted Backup Export */}
          <BackupExportCard
            profiles={profiles}
            useEncryption={useEncryption}
            setUseEncryption={setUseEncryption}
            exportPassphrase={exportPassphrase}
            setExportPassphrase={setExportPassphrase}
            isExporting={isExporting}
            onExport={handleExportJson}
            t={t}
          />

          {/* GDPR Complete Personal Data Export (BC-207) */}
          <GdprDataExportCard t={t} />

          {/* Privacy-Preserving Physician / Clinical Export (Issue #319) */}
          <ClinicalExportCard profiles={profiles} t={t} />

          {/* Active Sessions & Devices (Issue #249) */}
          <ActiveSessionsCard sessions={sessions} setSessions={setSessions} />

          {/* JSON Import via File Upload */}
          <BackupImportCard
            onImportProfiles={onImportProfiles}
            importStatus={importStatus}
            setImportStatus={setImportStatus}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}
