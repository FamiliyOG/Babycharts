import { useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Check, Calendar, Camera, Plus, Edit2, Trash2 } from 'lucide-react';
import { STANDARD_MILESTONES } from '../data/milestones.js';
import PhotoLightbox from './PhotoLightbox.jsx';
import { uploadEncryptedMedia } from '../utils/api.js';

function sanitizePhotoUrl(url) {
  if (typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Allow safe image data URIs (PNG, JPEG, JPG, WebP, GIF, SVG) or relative/absolute URLs
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('/') || trimmed.startsWith('http')) {
    return trimmed;
  }

  return null;
}

export default function MilestoneTracker({ activeChild, onUpdateChild, canEdit }) {
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
  const [customDesc, setCustomDesc] = useState('');
  const [photoError, setPhotoError] = useState(null);

  if (!activeChild) return null;

  const milestonesData = activeChild.milestones || {};
  const customMilestones = activeChild.customMilestones || [];

  // Combine standard and custom milestones
  const allMilestones = [...STANDARD_MILESTONES, ...customMilestones];

  const openEditModal = (milestone) => {
    const existing = milestonesData[milestone.id] || {};
    setSelectedMilestone(milestone);
    setMilestoneDate(existing.date || new Date().toISOString().split('T')[0]);
    setMilestoneNotes(existing.notes || '');
    setMilestonePhoto(sanitizePhotoUrl(existing.photo) || null);
    setPhotoError(null);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);

    if (!file.type.startsWith('image/')) {
      setPhotoError('Ungültiges Dateiformat: Bitte wählen Sie ein Foto aus (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('Datei zu groß: Das Foto darf maximal 15 MB groß sein.');
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string' && result.startsWith('data:image/')) {
        try {
          // Upload to encrypted media storage scoped to this family
          const serverUrl = await uploadEncryptedMedia(result, activeChild.familyId, file.name);
          setMilestonePhoto(serverUrl || result);
          setPhotoError(null);
        } catch {
          // Fallback to Data URL if offline
          setMilestonePhoto(result);
        } finally {
          setIsUploadingPhoto(false);
        }
      } else {
        setPhotoError('Ungültiges Bildformat.');
        setIsUploadingPhoto(false);
      }
    };
    reader.onerror = () => {
      setPhotoError('Fehler beim Einlesen des Fotos. Bitte versuchen Sie es erneut.');
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveMilestone = (e) => {
    e.preventDefault();
    if (!selectedMilestone || !canEdit) return;

    // Trigger celebration confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#f59e0b', '#ec4899', '#06b6d4', '#10b981'],
    });

    const updated = {
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
      milestones: updated,
    });

    setSelectedMilestone(null);
  };

  const handleRemoveMilestone = (milestoneId) => {
    if (!canEdit) return;
    const updated = { ...milestonesData };
    delete updated[milestoneId];

    onUpdateChild({
      ...activeChild,
      milestones: updated,
    });

    setSelectedMilestone(null);
  };

  const handleCreateCustomMilestone = (e) => {
    e.preventDefault();
    if (!customTitle.trim() || !canEdit) return;

    const newMilestone = {
      id: `custom-${Date.now()}`,
      category: 'custom',
      title: customTitle.trim(),
      icon: customIcon || '⭐',
      description: customDesc.trim(),
      isCustom: true,
    };

    const updatedCustom = [...customMilestones, newMilestone];
    onUpdateChild({
      ...activeChild,
      customMilestones: updatedCustom,
    });

    setIsCustomModalOpen(false);
    setCustomTitle('');
    setCustomDesc('');
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
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Meilenstein- &amp; Entwicklungstagebuch</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/40 font-bold">
                {achievedCount} Meilensteine erreicht
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Besondere Entwicklungsschritte, erste Worte und unvergessliche Momente von{' '}
              {activeChild.name}
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setIsCustomModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950 transition-all active:scale-95 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Eigenen Meilenstein anlegen</span>
          </button>
        )}
      </div>

      {/* Milestone Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allMilestones.map((m) => {
          const entry = milestonesData[m.id];
          const isDone = entry?.completed;

          return (
            <div
              key={m.id}
              className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                isDone
                  ? 'bg-amber-950/15 border-amber-700/40 shadow-xs'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header with Icon & Check status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 rounded-2xl bg-slate-900 border border-slate-800 shrink-0">
                      {m.icon || '⭐'}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-200">{m.title}</h4>
                      {m.avgAgeMonths && !isDone && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          Typisch: ca. {m.avgAgeMonths} Monate
                        </span>
                      )}
                    </div>
                  </div>

                  {isDone && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-800/60 shrink-0">
                      <Check className="w-3 h-3" /> Erreicht
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                  {m.description || 'Ein wundervoller Meilenstein.'}
                </p>

                {/* Achieved Card Content (Photo, Date, Notes) */}
                {isDone && (
                  <div className="mb-3 space-y-2">
                    {sanitizePhotoUrl(entry.photo) && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxData({
                            photo: sanitizePhotoUrl(entry.photo),
                            title: m.title,
                            date: entry.date,
                            notes: entry.notes,
                          })
                        }
                        title="Foto vergrößern"
                        className="w-full rounded-2xl overflow-hidden border border-slate-700 max-h-48 bg-slate-950 block group cursor-pointer relative"
                      >
                        <img
                          src={sanitizePhotoUrl(entry.photo)}
                          alt={m.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                          🔍 Vergrößern
                        </div>
                      </button>
                    )}

                    <div className="text-[11px] bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(entry.date).toLocaleDateString('de-DE')}</span>
                      </div>
                      {entry.notes && (
                        <p className="text-[11px] text-slate-300 italic pt-0.5">„{entry.notes}“</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {canEdit && (
                <div className="pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                  {m.isCustom ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomMilestone(m.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Eigenen Meilenstein löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    type="button"
                    onClick={() => openEditModal(m)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isDone
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <Edit2 className="w-3 h-3" />
                        <span>Bearbeiten</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Festhalten</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Record/Edit Milestone Modal */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-2xl">{selectedMilestone.icon}</span>
              <h3 className="text-base font-bold">{selectedMilestone.title}</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">{selectedMilestone.description}</p>

            <form onSubmit={handleSaveMilestone} className="space-y-4">
              <div>
                <label
                  htmlFor="milestone-date"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Erreicht am *
                </label>
                <input
                  id="milestone-date"
                  type="date"
                  required
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Photo Upload Section */}
              <div>
                <span className="block text-xs font-semibold text-slate-300 mb-1">
                  Erinnerungsfoto (optional)
                </span>
                {milestonePhoto ? (
                  <div className="space-y-2">
                    <div className="relative group rounded-2xl overflow-hidden border border-slate-700 max-h-48 bg-slate-950">
                      <img
                        src={milestonePhoto}
                        alt="Vorschau"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setMilestonePhoto(null)}
                        className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md z-10"
                        title="Foto entfernen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <label
                      htmlFor="milestone-photo-input"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors ${
                        isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {isUploadingPhoto ? 'Verschlüssele & speichere...' : 'Anderes Foto wählen'}
                      </span>
                      <input
                        id="milestone-photo-input"
                        type="file"
                        accept="image/*"
                        disabled={isUploadingPhoto}
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="milestone-photo-input"
                    className={`flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 rounded-2xl cursor-pointer hover:border-amber-500 hover:bg-slate-950/60 transition-all text-slate-400 hover:text-slate-200 ${
                      isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Camera className="w-6 h-6 mb-1 text-amber-400" />
                    <span className="text-xs font-medium">
                      {isUploadingPhoto
                        ? 'Verschlüssele & lade hoch...'
                        : 'Foto hochladen (verschlüsselt auf Server)'}
                    </span>
                    <input
                      id="milestone-photo-input"
                      type="file"
                      accept="image/*"
                      disabled={isUploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
                {photoError && (
                  <div className="mt-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{photoError}</span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="milestone-notes"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Notizen &amp; Erinnerung (optional)
                </label>
                <textarea
                  id="milestone-notes"
                  rows={3}
                  placeholder="z. B. Heute im Park ganz ohne Hilfe die ersten 5 Schritte zu Papa gelaufen..."
                  value={milestoneNotes}
                  onChange={(e) => setMilestoneNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                {milestonesData[selectedMilestone.id] ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveMilestone(selectedMilestone.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 text-xs font-semibold"
                  >
                    Eintrag löschen
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMilestone(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-950"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom Milestone Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Eigenen Meilenstein anlegen</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Erstelle einen individuellen Entwicklungsschritt für dein Kind.
            </p>

            <form onSubmit={handleCreateCustomMilestone} className="space-y-4">
              <div className="flex gap-3">
                <div className="w-20">
                  <label
                    htmlFor="custom-icon"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Icon
                  </label>
                  <input
                    id="custom-icon"
                    type="text"
                    required
                    value={customIcon}
                    onChange={(e) => setCustomIcon(e.target.value)}
                    className="w-full text-center text-lg py-1.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex-1">
                  <label
                    htmlFor="custom-title"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Titel des Meilensteins *
                  </label>
                  <input
                    id="custom-title"
                    type="text"
                    required
                    placeholder="z. B. Erstes Mal Laufrad gefahren"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="custom-desc"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Beschreibung (optional)
                </label>
                <textarea
                  id="custom-desc"
                  rows={2}
                  placeholder="z. B. Hält das Gleichgewicht und fährt stolz durch den Garten..."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-950"
                >
                  Meilenstein erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
