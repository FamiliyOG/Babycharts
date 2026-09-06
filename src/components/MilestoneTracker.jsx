import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fireConfetti } from '../utils/confetti.js';
import { Sparkles, Plus } from 'lucide-react';
import { STANDARD_MILESTONES } from '../data/milestones.js';
import PhotoLightbox from './PhotoLightbox.jsx';
import { uploadEncryptedMedia } from '../utils/api.js';
import { readMediaAsDataUrl } from '../utils/imageCompressor.js';
import {
  MilestoneCategoryFilter,
  MilestoneCard,
  MilestoneDetailModal,
  CustomMilestoneModal,
} from '../features/milestones/index.js';

export default function MilestoneTracker({ activeChild, onUpdateChild, canEdit }) {
  const { t } = useTranslation();
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState(null);

  // Form states
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneNotes, setMilestoneNotes] = useState('');
  const [milestonePhoto, setMilestonePhoto] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Custom milestone form states
  const [customTitle, setCustomTitle] = useState('');
  const [customIcon, setCustomIcon] = useState('⭐');
  const [customCategory, setCustomCategory] = useState('custom');
  const [customDesc, setCustomDesc] = useState('');
  const [photoError, setPhotoError] = useState(null);

  // State to track media URLs that fail to load from server (404/expired)
  const [failedImageUrls, setFailedImageUrls] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!activeChild) return null;

  const milestonesData = activeChild.milestones || {};
  const customMilestones = activeChild.customMilestones || [];

  // Combine standard and custom milestones
  const allMilestones = [...STANDARD_MILESTONES, ...customMilestones];
  const filteredMilestones =
    selectedCategory === 'all'
      ? allMilestones
      : allMilestones.filter((m) => m.category === selectedCategory);

  const categories = [
    { id: 'all', label: t('milestones.filterAll', 'Alle') },
    { id: 'motor', label: t('milestones.filterMotor', 'Motorik') },
    { id: 'language', label: t('milestones.filterLanguage', 'Sprache') },
    { id: 'social', label: t('milestones.filterSocial', 'Sozial') },
    { id: 'nutrition', label: t('milestones.filterNutrition', 'Ernährung') },
    { id: 'custom', label: t('milestones.filterCustom', 'Eigene') },
  ];

  const openEditModal = (milestone) => {
    const existing = milestonesData[milestone.id] || {};
    setSelectedMilestone(milestone);
    setMilestoneDate(existing.date || new Date().toISOString().split('T')[0]);
    setMilestoneNotes(existing.notes || '');
    setMilestonePhoto(existing.photo || null);
    setPhotoError(null);
  };

  const handleSaveMilestone = (e) => {
    e.preventDefault();
    if (!selectedMilestone || !canEdit) return;

    const wasAlreadyCompleted = milestonesData[selectedMilestone.id]?.completed;

    const updatedData = {
      ...milestonesData,
      [selectedMilestone.id]: {
        completed: true,
        date: milestoneDate,
        notes: milestoneNotes.trim(),
        photo: milestonePhoto,
        updatedAt: new Date().toISOString(),
      },
    };

    onUpdateChild({
      ...activeChild,
      milestones: updatedData,
    });

    if (!wasAlreadyCompleted) {
      fireConfetti();
    }

    setSelectedMilestone(null);
  };

  const handleRemoveMilestone = (milestoneId) => {
    if (!canEdit) return;
    const updatedData = { ...milestonesData };
    delete updatedData[milestoneId];

    onUpdateChild({
      ...activeChild,
      milestones: updatedData,
    });

    setSelectedMilestone(null);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    setIsUploadingPhoto(true);

    try {
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('Datei ist zu groß (maximal 25 MB erlaubt).');
      }

      const mediaUrl = await uploadEncryptedMedia(file, activeChild.familyId);
      if (mediaUrl) {
        setMilestonePhoto(mediaUrl);
      } else {
        const compressedDataUrl = await readMediaAsDataUrl(file);
        setMilestonePhoto(compressedDataUrl);
      }
    } catch (err) {
      console.error('Milestone photo processing error:', err);
      setPhotoError(err.message || 'Fehler beim Verarbeiten des Fotos.');
      try {
        const compressedDataUrl = await readMediaAsDataUrl(file);
        setMilestonePhoto(compressedDataUrl);
      } catch (fallbackErr) {
        console.error('Milestone photo fallback error:', fallbackErr);
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCreateCustomMilestone = (e) => {
    e.preventDefault();
    if (!customTitle.trim() || !canEdit) return;

    const newCustomMilestone = {
      id: `custom_${Date.now()}`,
      title: customTitle.trim(),
      description: customDesc.trim(),
      category: customCategory,
      icon: customIcon || '⭐',
      isCustom: true,
    };

    const updatedCustom = [...customMilestones, newCustomMilestone];
    onUpdateChild({
      ...activeChild,
      customMilestones: updatedCustom,
    });

    setIsCustomModalOpen(false);
    setCustomTitle('');
    setCustomDesc('');
    setCustomCategory('custom');
    setCustomIcon('⭐');
  };

  const handleDeleteCustomMilestone = (customId) => {
    if (!canEdit) return;
    const updatedCustom = customMilestones.filter((m) => m.id !== customId);
    const updatedData = { ...milestonesData };
    delete updatedData[customId];

    onUpdateChild({
      ...activeChild,
      customMilestones: updatedCustom,
      milestones: updatedData,
    });
  };

  const achievedCount = Object.keys(milestonesData).filter(
    (k) => milestonesData[k]?.completed
  ).length;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-950/60 border border-amber-800/50 text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{t('milestones.title')}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/40 font-bold">
                {achievedCount} {t('milestones.completed')}
              </span>
            </h2>
            <p className="text-xs text-slate-400">{t('milestones.subtitle')}</p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setIsCustomModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950 transition-all active:scale-95 self-start sm:self-auto shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('milestones.addCustom')}</span>
          </button>
        )}
      </div>

      {/* Category Filter Bar (BC-241) */}
      <div className="mb-5">
        <MilestoneCategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          allMilestones={allMilestones}
          milestonesData={milestonesData}
          canEdit={canEdit}
          onOpenCustomModal={() => setIsCustomModalOpen(true)}
          t={t}
        />
      </div>

      {/* Milestone Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMilestones.map((m) => {
          const entry = milestonesData[m.id];
          const isDone = Boolean(entry?.completed);

          return (
            <MilestoneCard
              key={m.id}
              milestone={m}
              isDone={isDone}
              entry={entry}
              activeChild={activeChild}
              canEdit={canEdit}
              failedImageUrls={failedImageUrls}
              setFailedImageUrls={setFailedImageUrls}
              onOpenEditModal={openEditModal}
              onDeleteCustomMilestone={handleDeleteCustomMilestone}
              onOpenLightbox={setLightboxData}
              t={t}
            />
          );
        })}
      </div>

      {/* Record/Edit Milestone Modal */}
      <MilestoneDetailModal
        selectedMilestone={selectedMilestone}
        onClose={() => setSelectedMilestone(null)}
        milestonesData={milestonesData}
        milestoneDate={milestoneDate}
        setMilestoneDate={setMilestoneDate}
        milestonePhoto={milestonePhoto}
        setMilestonePhoto={setMilestonePhoto}
        isUploadingPhoto={isUploadingPhoto}
        handlePhotoUpload={handlePhotoUpload}
        photoError={photoError}
        milestoneNotes={milestoneNotes}
        setMilestoneNotes={setMilestoneNotes}
        onSaveMilestone={handleSaveMilestone}
        onRemoveMilestone={handleRemoveMilestone}
        t={t}
      />

      {/* Create Custom Milestone Modal */}
      <CustomMilestoneModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        customIcon={customIcon}
        setCustomIcon={setCustomIcon}
        customTitle={customTitle}
        setCustomTitle={setCustomTitle}
        customCategory={customCategory}
        setCustomCategory={setCustomCategory}
        customDesc={customDesc}
        setCustomDesc={setCustomDesc}
        onCreateCustomMilestone={handleCreateCustomMilestone}
        t={t}
      />

      {/* Fullscreen Photo Lightbox */}
      {lightboxData && (
        <PhotoLightbox
          photo={lightboxData.photo}
          title={lightboxData.title}
          date={lightboxData.date}
          notes={lightboxData.notes}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
}
