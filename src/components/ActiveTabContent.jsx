import TodayDashboard from './TodayDashboard.jsx';
import GrowthChart from './GrowthChart.jsx';
import MeasurementTable from './MeasurementTable.jsx';
import UCheckupTracker from './UCheckupTracker.jsx';
import VaccinationTracker from './VaccinationTracker.jsx';
import TeethTracker from './TeethTracker.jsx';
import MilestoneTracker from './MilestoneTracker.jsx';
import HealthTracker from './HealthTracker.jsx';

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
  canEdit,
}) {
  switch (activeTab) {
    case 'today':
      return (
        <TodayDashboard
          activeChild={activeChild}
          ageInfo={ageInfo}
          measurements={activeChildMeasurements}
          onNavigateTab={setActiveTab}
          onOpenAddMeasurement={handleOpenAddMeasurement}
        />
      );
    case 'growth':
      return (
        <>
          <GrowthChart activeChild={activeChild} measurements={activeChildMeasurements} />
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
    default:
      return null;
  }
}
