import WelcomeHomeScreen from './WelcomeHomeScreen.jsx';
import PercentileCard from './PercentileCard.jsx';
import ModuleNavigationTabs from './ModuleNavigationTabs.jsx';
import ActiveTabContent from './ActiveTabContent.jsx';
import NoChildWelcome from './NoChildWelcome.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { LoadingSpinner } from './LoadingState.jsx';

export default function AppContent({
  isLoading,
  user,
  activeChild,
  ageInfo,
  activeTab,
  setActiveTab,
  activeChildMeasurements,
  handleEditMeasurement,
  handleDeleteMeasurement,
  handleOpenAddMeasurement,
  handleSaveProfile,
  canEdit,
  isDev,
  setIsProfileModalOpen,
  handleLoadDemoData,
}) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <WelcomeHomeScreen />;
  }

  if (activeChild) {
    return (
      <div className="space-y-6">
        <PercentileCard activeChild={activeChild} ageInfo={ageInfo} />
        <ModuleNavigationTabs activeTab={activeTab} onSelectTab={setActiveTab} />
        <ErrorBoundary isWidget>
          <ActiveTabContent
            activeTab={activeTab}
            activeChild={activeChild}
            ageInfo={ageInfo}
            activeChildMeasurements={activeChildMeasurements}
            setActiveTab={setActiveTab}
            handleOpenAddMeasurement={handleOpenAddMeasurement}
            handleEditMeasurement={handleEditMeasurement}
            handleDeleteMeasurement={handleDeleteMeasurement}
            handleSaveProfile={handleSaveProfile}
            canEdit={canEdit}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <NoChildWelcome
      canEdit={canEdit}
      isDev={isDev}
      onOpenCreateModal={() => setIsProfileModalOpen(true)}
      onLoadDemoData={handleLoadDemoData}
    />
  );
}
