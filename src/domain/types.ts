/**
 * src/domain/types.ts
 * TypeScript Foundation for BabyCharts (Issue #288).
 * Strongly typed definitions for domain entities, biometrics, health data, and access control.
 */

export type Gender = 'boy' | 'girl';

export interface Measurement {
  id: string;
  profileId?: string | null;
  date: string;
  weight: number | null;
  length: number | null;
  headCircumference: number | null;
  checkup?: string | null;
  notes?: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface Milestone {
  id: string;
  key: string;
  completed: boolean;
  date: string | null;
  title: string;
  category: string;
  notes?: string;
  photo?: string | null;
  updatedAt: string;
}

export interface Tooth {
  id: string;
  key: string;
  erupted: boolean;
  date: string | null;
  name: string;
  position?: string | null;
  notes?: string;
  updatedAt: string;
}

export interface Vaccination {
  id: string;
  key: string;
  completed: boolean;
  date: string | null;
  name: string;
  doctor?: string;
  batch?: string;
  notes?: string;
  updatedAt: string;
}

export interface UCheckup {
  id: string;
  key: string;
  completed: boolean;
  date: string | null;
  name: string;
  doctorNotes?: string;
  updatedAt: string;
}

export interface HealthLog {
  id: string;
  profileId?: string | null;
  dateTime: string;
  temperature: number | null;
  medication?: string;
  symptoms?: string;
  notes?: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface ReminderSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  intervalDays?: number;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

export interface Profile {
  id: string;
  familyId: string;
  name: string;
  birthdate: string;
  gender: Gender;
  avatarUrl?: string | null;
  version?: number;
  measurements: Measurement[];
  milestones: Record<string, Milestone>;
  teeth: Record<string, Tooth>;
  vaccinations: Record<string, Vaccination>;
  uCheckups: Record<string, UCheckup>;
  healthLog: HealthLog[];
  schedule?: ReminderSchedule;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export type FamilyRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface FamilyMember {
  userId: string;
  role: FamilyRole;
  joinedAt?: string;
}

export interface Family {
  id: string;
  name: string;
  avatar?: string | null;
  ownerId?: string;
  members: FamilyMember[];
  createdAt: string;
  updatedAt?: string;
}

export interface FamilyInvite {
  code: string;
  familyId: string;
  role: FamilyRole;
  createdBy: string;
  createdAt: string;
  expiresAt?: string | null;
  maxUses?: number;
  usesCount?: number;
  invitedEmail?: string | null;
}

export type VisitorPermissionCategory =
  'growth' | 'milestones' | 'teeth' | 'vaccinations' | 'uCheckups' | 'health' | 'timeline';

export interface VisitorGrant {
  profileId: string;
  category: VisitorPermissionCategory;
}

export interface UserSession {
  id: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
  lastActive?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'user';
  isDev: boolean;
  twoFactorEnabled?: boolean;
  tokenVersion?: number;
  sessions?: UserSession[];
  createdAt: string;
  updatedAt?: string;
}
