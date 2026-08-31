import { z } from 'zod';

// Base ID schema (UUID or alphanumeric ID)
export const IdSchema = z.string().min(1).max(100);

// Metric measurement schema (BC-110)
export const MeasurementSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein'),
  weight: z
    .number()
    .min(0.1, 'Gewicht muss positiv sein (min 0.1 kg)')
    .max(100, 'Gewicht unrealistisch hoch (> 100 kg)')
    .nullable()
    .optional(),
  length: z
    .number()
    .min(10, 'Körpergröße muss positiv sein (min 10 cm)')
    .max(200, 'Körpergröße unrealistisch hoch (> 200 cm)')
    .nullable()
    .optional(),
  headCircumference: z
    .number()
    .min(10, 'Kopfumfang muss positiv sein (min 10 cm)')
    .max(100, 'Kopfumfang unrealistisch hoch (> 100 cm)')
    .nullable()
    .optional(),
  checkup: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Health log schema
export const HealthLogSchema = z.object({
  id: z.string().optional(),
  dateTime: z.string().min(1, 'Datum und Uhrzeit erforderlich'),
  temperature: z.number().nullable().optional(),
  medication: z.string().nullable().optional(),
  symptoms: z.array(z.string()).optional().default([]),
  notes: z.string().nullable().optional(),
});

// Profile Schedule schema
export const ProfileScheduleSchema = z.object({
  enabled: z.boolean().default(false),
  frequency: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  intervalDays: z.number().int().min(1).default(7),
  lastExportAt: z.string().nullable().optional(),
});

// Profile Create / Update Schema
export const ProfileInputSchema = z.object({
  id: z.string().min(1, 'id and name are required').optional(),
  familyId: z.string().nullable().optional(),
  name: z.string().min(1, 'id and name are required').max(100).optional(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Geburtsdatum muss im Format YYYY-MM-DD sein')
    .optional(),
  gender: z.enum(['boy', 'girl', 'diverse']).default('boy'),
  avatar: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  schedule: ProfileScheduleSchema.optional(),
  measurements: z.array(MeasurementSchema).optional().default([]),
  healthLog: z.array(HealthLogSchema).optional().default([]),
  vaccinations: z.record(z.string(), z.any()).optional().default({}),
  teeth: z.record(z.string(), z.any()).optional().default({}),
  milestones: z.record(z.string(), z.any()).optional().default({}),
  customMilestones: z.array(z.any()).optional().default([]),
  version: z.number().int().optional(),
});

// User Auth Schemas
const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

export const RegisterSchema = z.object({
  email: z.string().trim().regex(EMAIL_REGEX, 'Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  language: z.enum(['de', 'en', 'th']).optional().default('de'),
});

export const LoginSchema = z.object({
  email: z.string().trim().regex(EMAIL_REGEX, 'Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
  twoFactorToken: z.string().optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
  newPassword: z.string().min(8, 'Neues Passwort muss mindestens 8 Zeichen lang sein'),
});

export const RequestPasswordResetSchema = z.object({
  email: z.string().trim().regex(EMAIL_REGEX, 'Ungültige E-Mail-Adresse'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
  newPassword: z.string().min(8, 'Neues Passwort muss mindestens 8 Zeichen lang sein'),
});

// Family Schemas
export const CreateFamilySchema = z.object({
  name: z.string().min(1, 'Familienname ist erforderlich').max(100),
});

export const CreateInviteSchema = z.object({
  role: z.enum(['editor', 'viewer']).default('editor'),
  maxUses: z.number().int().min(1).max(100).default(1),
  expiresInDays: z.number().int().min(1).max(365).default(7),
});

export const JoinFamilySchema = z.object({
  code: z.string().min(4, 'Ungültiger Einladungscode').max(20),
});
