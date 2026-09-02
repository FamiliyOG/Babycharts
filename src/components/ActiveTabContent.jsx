import { lazy, Suspense } from 'react';
import TodayDashboard from './TodayDashboard.jsx';
import { CardSkeleton } from './LoadingState.jsx';

const GrowthChart = lazy(() => import('./GrowthChart.jsx'));
const MeasurementTable = lazy(() => import('./MeasurementTable.jsx'));
const UCheckupTracker = lazy(() => import('./UCheckupTracker.jsx'));
const VaccinationTracker = lazy(() => import('./VaccinationTracker.jsx'));
const TeethTracker = lazy(() => import('./TeethTracker.jsx'));
const MilestoneTracker = lazy(() => import('./MilestoneTracker.jsx'));
const HealthTracker = lazy(() => import('./HealthTracker.jsx'));
const ChildTimeline = lazy(() => import('./ChildTimeline.jsx'));
const DoctorView = lazy(() => import('./DoctorView.jsx'));

export default function ActiveTabContent({
  activeTab,
  activeChild,
  ageInfo,
  activeChildMeasurements,
  setActiveTab,
  handleOpenAddMeasurement,
  handleEditMeasurement,
  handleDeleteMeasurement,
  handleSaveProfile,
  onOpenQuickAdd,
  canEdit,
}) {
  return (
    <Suspense fallback={<CardSkeleton />}>
      {(() => {
        switch (activeTab) {
          case 'today':
            return (
              <TodayDashboard
                activeChild={activeChild}
                ageInfo={ageInfo}
                measurements={activeChildMeasurements}
                onNavigateTab={setActiveTab}
                onOpenAddMeasurement={handleOpenAddMeasurement}
                onOpenQuickAdd={onOpenQuickAdd}
              />
            );
          case 'timeline':
            return (
              <ChildTimeline
                activeChild={activeChild}
                activeChildMeasurements={activeChildMeasurements}
              />
            );
          case 'growth':
            return (
              <>
                <GrowthChart
                  activeChild={activeChild}
                  measurements={activeChildMeasurements}
                  onOpenAddMeasurement={handleOpenAddMeasurement}
                />
                <MeasurementTable
                  activeChild={activeChild}
                  measurements={activeChildMeasurements}
                  onEditMeasurement={handleEditMeasurement}
                  onDeleteMeasurement={handleDeleteMeasurement}
                />
              </>
            );
          case 'ucheckups':
            return (
              <UCheckupTracker
                activeChild={activeChild}
                measurements={activeChildMeasurements}
                onAddCheckupClick={handleOpenAddMeasurement}
              />
            );
          case 'vaccines':
            return (
              <VaccinationTracker
                activeChild={activeChild}
                onUpdateChild={handleSaveProfile}
                canEdit={canEdit}
              />
            );
          case 'teeth':
            return (
              <TeethTracker
                activeChild={activeChild}
                onUpdateChild={handleSaveProfile}
                canEdit={canEdit}
              />
            );
          case 'milestones':
            return (
              <MilestoneTracker
                activeChild={activeChild}
                onUpdateChild={handleSaveProfile}
                canEdit={canEdit}
              />
            );
          case 'health':
            return (
              <HealthTracker
                activeChild={activeChild}
                onUpdateChild={handleSaveProfile}
                canEdit={canEdit}
              />
            );
          case 'doctor':
            return (
              <DoctorView
                activeChild={activeChild}
                activeChildMeasurements={activeChildMeasurements}
              />
            );
          default:
            return null;
        }
      })()}
    </Suspense>
  );
}
