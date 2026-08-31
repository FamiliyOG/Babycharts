import { lazy, Suspense } from 'react';
import ConfirmModal from './ConfirmModal.jsx';

const ProfileModal = lazy(() => import('./ProfileModal.jsx'));
const MeasurementForm = lazy(() => import('./MeasurementForm.jsx'));
const ExportImportModal = lazy(() => import('./ExportImportModal.jsx'));
const AuthModal = lazy(() => import('./AuthModal.jsx'));
const TwoFactorModal = lazy(() => import('./TwoFactorModal.jsx'));
const FamilyManagementModal = lazy(() => import('./FamilyManagementModal.jsx'));
const QuickAddModal = lazy(() => import('./QuickAddModal.jsx'));

export default function AppModals({
  activeChild,
  profiles,
  setProfiles,
  importProfiles,
  isQuickAddOpen,
  setIsQuickAddOpen,
  isProfileModalOpen,
  setIsProfileModalOpen,
  editingProfile,
  setEditingProfile,
  handleSaveProfile,
  handleDeleteProfile,
  isMeasurementFormOpen,
  setIsMeasurementFormOpen,
  editingMeasurement,
  setEditingMeasurement,
  handleSaveMeasurement,
  handleOpenAddMeasurement,
  isExportModalOpen,
  setIsExportModalOpen,
  handleLoadDemoData,
  isAuthModalOpen,
  setIsAuthModalOpen,
  is2FaModalOpen,
  setIs2FaModalOpen,
  isFamilyModalOpen,
  setIsFamilyModalOpen,
  measurementToDelete,
  setMeasurementToDelete,
  onConfirmDeleteMeasurement,
  setActiveTab,
  toastMessage,
}) {
  return (
    <Suspense fallback={null}>
      {/* Quick Add Modal */}
      {isQuickAddOpen && activeChild && (
        <QuickAddModal
          isOpen={isQuickAddOpen}
          activeChild={activeChild}
          onClose={() => setIsQuickAddOpen(false)}
          onOpenMeasurement={handleOpenAddMeasurement}
          onOpenHealth={() => setActiveTab('health')}
          onOpenVaccines={() => setActiveTab('vaccines')}
          onOpenMilestones={() => setActiveTab('milestones')}
          onOpenTeeth={() => setActiveTab('teeth')}
          onOpenUCheckups={() => setActiveTab('ucheckups')}
        />
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          initialData={editingProfile}
          onSaveProfile={handleSaveProfile}
          onDeleteProfile={handleDeleteProfile}
          onClose={() => {
            setIsProfileModalOpen(false);
            setEditingProfile(null);
          }}
        />
      )}

      {/* Measurement Entry Modal */}
      {isMeasurementFormOpen && activeChild && (
        <MeasurementForm
          isOpen={isMeasurementFormOpen}
          activeChild={activeChild}
          initialData={editingMeasurement}
          onSaveMeasurement={handleSaveMeasurement}
          onClose={() => {
            setIsMeasurementFormOpen(false);
            setEditingMeasurement(null);
          }}
        />
      )}

      {/* Export / Import & Settings Modal */}
      {isExportModalOpen && (
        <ExportImportModal
          isOpen={isExportModalOpen}
          profiles={profiles}
          onLoadDemoData={handleLoadDemoData}
          onImportProfiles={(imported) => {
            if (setProfiles) setProfiles(imported);
            importProfiles(imported);
          }}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* Auth Login / Register Modal */}
      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      )}

      {/* 2FA Security Modal */}
      {is2FaModalOpen && (
        <TwoFactorModal isOpen={is2FaModalOpen} onClose={() => setIs2FaModalOpen(false)} />
      )}

      {/* Family Management & Invites Modal */}
      {isFamilyModalOpen && (
        <FamilyManagementModal
          isOpen={isFamilyModalOpen}
          onClose={() => setIsFamilyModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal (BC-208) */}
      {measurementToDelete && (
        <ConfirmModal
          isOpen={Boolean(measurementToDelete)}
          onClose={() => setMeasurementToDelete(null)}
          onConfirm={() => onConfirmDeleteMeasurement(measurementToDelete)}
          title="Messwert löschen"
          message="Möchten Sie diesen Messwert wirklich unwiderruflich aus dem Verlauf entfernen?"
          confirmLabel="Löschen"
          isDestructive
        />
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl animate-slideUp flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </Suspense>
  );
}
