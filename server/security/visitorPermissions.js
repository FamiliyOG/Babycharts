/**
 * server/security/visitorPermissions.js
 * Granular per-child & per-category visitor permissions enforcement (Issue #323).
 *
 * Supported categories:
 * - 'growth': measurements (weight, length, headCircumference) & percentiles
 * - 'vaccinations': vaccination status & schedules
 * - 'uCheckups': U-examinations
 * - 'teeth': dentition records
 * - 'milestones': milestone developments
 * - 'health': health logs, temperature curves & medication records
 * - 'photos': avatar and photo logs
 * - 'notes': private notes
 */

export const VISITOR_CATEGORIES = Object.freeze([
  'growth',
  'vaccinations',
  'uCheckups',
  'teeth',
  'milestones',
  'health',
  'photos',
  'notes',
]);

/**
 * Checks if a visitor has a specific grant for a child profile and data category.
 * Default-Deny: If no grant exists, returns false.
 */
export function hasVisitorGrant(profileId, category, visitorGrants = []) {
  if (!Array.isArray(visitorGrants) || !profileId || !category) {
    return false;
  }
  return visitorGrants.some(
    (g) => g.profileId === profileId && (g.category === category || g.category === '*')
  );
}

/**
 * Filters profile data for a visitor user according to their granted categories (Issue #323).
 * If user is parent or owner, passes profile through untouched.
 */
export function filterProfileForVisitor(profile, visitorGrants = [], userRole = 'parent') {
  if (!profile) return null;
  const isVisitor = userRole === 'visitor' || userRole === 'viewer';
  if (!isVisitor) {
    return profile; // Parents and owners have full read access
  }

  const allowedGrowth = hasVisitorGrant(profile.id, 'growth', visitorGrants);
  const allowedVaccinations = hasVisitorGrant(profile.id, 'vaccinations', visitorGrants);
  const allowedTeeth = hasVisitorGrant(profile.id, 'teeth', visitorGrants);
  const allowedMilestones = hasVisitorGrant(profile.id, 'milestones', visitorGrants);
  const allowedHealth = hasVisitorGrant(profile.id, 'health', visitorGrants);
  const allowedPhotos = hasVisitorGrant(profile.id, 'photos', visitorGrants);
  const allowedNotes = hasVisitorGrant(profile.id, 'notes', visitorGrants);

  return {
    id: profile.id,
    familyId: profile.familyId,
    name: profile.name,
    birthdate: profile.birthdate,
    gender: profile.gender,
    avatar: allowedPhotos ? profile.avatar : null,
    notes: allowedNotes ? profile.notes : null,
    schedule: profile.schedule,
    version: profile.version,
    deletedAt: profile.deletedAt,
    measurements: allowedGrowth ? profile.measurements || [] : [],
    vaccinations: allowedVaccinations ? profile.vaccinations || {} : {},
    teeth: allowedTeeth ? profile.teeth || {} : {},
    milestones: allowedMilestones ? profile.milestones || {} : {},
    customMilestones: allowedMilestones ? profile.customMilestones || [] : [],
    healthLog: allowedHealth ? profile.healthLog || [] : [],
  };
}
