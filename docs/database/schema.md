# BabyCharts Database Schema & Constraint Architecture (Issue #291)

BabyCharts utilizes an embedded **SQLite** database via `better-sqlite3` operating in Write-Ahead Logging (`WAL`) mode with strict ACID compliance, transactional integrity, and automated schema migration management.

---

## 1. Core Invariants & Pragma Configuration

Every SQLite connection initializes with:

- `PRAGMA journal_mode = WAL;` — High concurrency, parallel readers do not block writers.
- `PRAGMA foreign_keys = ON;` — Mandatory cascade and constraint validation.
- `PRAGMA busy_timeout = 10000;` — Concurrency contention retry window (10s).
- `PRAGMA synchronous = NORMAL;` — Durability with optimal NVMe write performance.

---

## 2. Table Schemas & Foreign Key Relationships

### `users`

Represents application accounts and global roles.

- `id` (TEXT, PK): Unique user identifier (`user-...` or UUID).
- `email` (TEXT, UNIQUE, NOT NULL): Canonical lowercase login email.
- `password` (TEXT, NOT NULL): Bcrypt-hashed password.
- `name` (TEXT, NOT NULL): User display name.
- `isDev` (INTEGER, DEFAULT 0): Flag indicating instance superadmin privilege.
- `role` (TEXT, DEFAULT 'user'): Account type.
- `twoFactorSecret` (TEXT): Encrypted speakeasy TOTP secret.
- `recoveryCodes` (TEXT): JSON-encoded hashed one-time backup codes.
- `tokenVersion` (INTEGER, DEFAULT 0): Global token revocation version counter.
- `sessions` (TEXT): JSON array of active device sessions and refresh metadata.
- `createdAt` / `updatedAt` (TEXT, NOT NULL).

### `families`

Multi-tenant family unit isolating child profiles and measurements.

- `id` (TEXT, PK): Unique family identifier.
- `name` (TEXT, NOT NULL): Family display name.
- `ownerId` (TEXT, REFERENCES users(id)): Family founder / primary owner.
- `createdAt` / `updatedAt` (TEXT, NOT NULL).

### `family_members`

Association between users and families with role permissions.

- `familyId` (TEXT, REFERENCES families(id) ON DELETE CASCADE).
- `userId` (TEXT, REFERENCES users(id) ON DELETE CASCADE).
- `role` (TEXT, NOT NULL): `'owner'` | `'editor'` | `'viewer'`.
- `joinedAt` (TEXT, NOT NULL).
- **PRIMARY KEY (`familyId`, `userId`)**

### `invites`

Invite tokens for joining families with specified role and expiration.

- `code` (TEXT, PK): Alphanumeric invite code.
- `familyId` (TEXT, REFERENCES families(id) ON DELETE CASCADE).
- `role` (TEXT, NOT NULL): Invited role (`editor` | `viewer`).
- `invitedEmail` (TEXT): Optional email restriction for bound invites.
- `createdBy` (TEXT, REFERENCES users(id) ON DELETE SET NULL).
- `createdAt` / `expiresAt` (TEXT).
- `maxUses` / `usesCount` (INTEGER).

### `profiles`

Child records belonging to a family.

- `id` (TEXT, PK): Unique child profile UUID.
- `familyId` (TEXT, REFERENCES families(id) ON DELETE SET NULL).
- `name` (TEXT, NOT NULL): Child's name.
- `birthdate` (TEXT, NOT NULL): YYYY-MM-DD birth date.
- `gender` (TEXT, NOT NULL): `'boy'` | `'girl'`.
- `avatar` (TEXT): Profile photo reference or data URI.
- `notes` (TEXT): Medical or general child notes.
- `schedule` (TEXT): Custom reminders and notification schedule config.
- `milestones` (TEXT): JSON dictionary of development milestones.
- `teeth` (TEXT): JSON dictionary of tooth eruption tracking.
- `vaccinations` (TEXT): JSON dictionary of immunization records.
- `deletedAt` (TEXT): Soft-deletion timestamp (NULL when active).
- `version` (INTEGER, DEFAULT 1): Optimistic locking concurrency counter.
- `createdAt` / `updatedAt` (TEXT, NOT NULL).

### `measurements`

Biometric measurements (weight, length, head circumference).

- `id` (TEXT, PK): Unique measurement ID.
- `profileId` (TEXT, REFERENCES profiles(id) ON DELETE CASCADE, NOT NULL).
- `date` (TEXT, NOT NULL): YYYY-MM-DD measurement date.
- `weight` (REAL): Weight in kilograms.
- `length` (REAL): Height/Length in centimeters.
- `headCircumference` (REAL): Head circumference in centimeters.
- `checkup` (TEXT): Optional association with a U-examination.
- `notes` (TEXT): Optional clinical or parent notes.
- `deletedAt` (TEXT): Soft-deletion timestamp.
- `createdAt` (TEXT).

### `health_logs`

Symptom, temperature, and medication journal entries.

- `id` (TEXT, PK): Unique entry ID.
- `profileId` (TEXT, REFERENCES profiles(id) ON DELETE CASCADE, NOT NULL).
- `dateTime` (TEXT, NOT NULL): ISO-8601 timestamp.
- `temperature` (REAL): Body temperature in degrees Celsius.
- `medication` / `symptoms` / `notes` (TEXT).
- `deletedAt` (TEXT): Soft-deletion timestamp.

### `visitor_grants`

Granular category-level access permissions granted to visitors.

- `id` (TEXT, PK).
- `familyId` (TEXT, REFERENCES families(id) ON DELETE CASCADE, NOT NULL).
- `visitorUserId` (TEXT, REFERENCES users(id) ON DELETE CASCADE, NOT NULL).
- `profileId` (TEXT, REFERENCES profiles(id) ON DELETE CASCADE, NOT NULL).
- `category` (TEXT, NOT NULL): E.g. `'growth'`, `'vaccines'`, `'milestones'`, `'teeth'`.
- **UNIQUE (`visitorUserId`, `profileId`, `category`)**

### `media_files`

Metadata for AES-256-GCM encrypted media uploads.

- `id` (TEXT, PK): Media identifier.
- `familyId` (TEXT, REFERENCES families(id) ON DELETE CASCADE).
- `userId` (TEXT, REFERENCES users(id) ON DELETE CASCADE).
- `profileId` (TEXT, REFERENCES profiles(id) ON DELETE SET NULL).
- `originalName` / `mimeType` (TEXT).
- `sizeBytes` (INTEGER).
- `iv` / `authTag` (TEXT).
- `createdAt` (TEXT).

---

## 3. High-Performance Index Architecture

| Index Name                        | Target Table        | Columns                            | Purpose                                             |
| --------------------------------- | ------------------- | ---------------------------------- | --------------------------------------------------- |
| `idx_profiles_family_active`      | `profiles`          | `(familyId, deletedAt)`            | Fast retrieval of active children in a family       |
| `idx_measurements_profile_active` | `measurements`      | `(profileId, deletedAt, date)`     | Chronological growth chart & percentile queries     |
| `idx_health_logs_profile_active`  | `health_logs`       | `(profileId, deletedAt, dateTime)` | Patient temperature & symptom timelines             |
| `idx_family_members_user`         | `family_members`    | `(userId)`                         | Family lookup on user login and session restoration |
| `idx_visitor_grants_lookup`       | `visitor_grants`    | `(visitorUserId, profileId)`       | Authorization checks in middleware                  |
| `idx_family_audit_logs_family`    | `family_audit_logs` | `(familyId, timestamp)`            | Paginated family audit trail views                  |
| `idx_media_files_family`          | `media_files`       | `(familyId)`                       | Family media listing                                |
| `idx_media_files_user`            | `media_files`       | `(userId)`                         | User upload quota audits                            |
| `idx_audit_logs_user`             | `audit_logs`        | `(userId, timestamp)`              | Security audit log inspections                      |

---

## 4. Transactional Boundaries

Multi-write operations are wrapped in atomic `better-sqlite3` transactions:

1. **Family Deletion**: Atomically cascades through members, invites, grants, media metadata, and audit logs.
2. **Ownership Transfer**: Updates current owner to editor and target member to owner in a single atomic commit.
3. **Profile Import**: Validates backup manifest, inserts child profile, batch-inserts measurements, and commits or rolls back in full on failure.
