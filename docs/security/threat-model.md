# BabyCharts Threat Model (BC-310)

This threat model outlines the assets, boundaries, threat actors, and STRIDE mitigations for BabyCharts.

## 1. Protected Assets & Data Sensitivity

- **Sensitive Child Health Data:** Measurements (weight, height, head circumference), WHO percentiles, vaccination records, U-checkups, medical notes, teeth logs.
- **Media & Images:** Encrypted photos and milestone memories stored locally on the server.
- **Identity & Credentials:** User emails, bcrypt password hashes, JWT refresh/session tokens, TOTP 2FA secrets, backup passphrases.
- **Family Integrity:** Role memberships (Owner, Admin, Editor, Viewer, Visitor).

## 2. Trust Boundaries & Data Flow

- **Browser Client <-> Reverse Proxy / Express API:** HTTPS/HTTP, Cookie & Bearer JWT authentication, CSRF tokens on state-changing operations, strict Content Security Policy.
- **Express API <-> SQLite Database:** Better-sqlite3 parameterized statements, WAL mode, foreign key enforcement, idempotent schema migrations.
- **Express API <-> Local Media Storage:** AES-256-GCM authenticated encryption at rest; ephemeral object URLs on the client.
- **API <-> External Telemetry (Sentry):** Strictly opt-in (`VITE_SENTRY_ENABLED === 'true'`), automated redaction of sensitive health data, passwords, and tokens.

## 3. STRIDE Threat Analysis & Mitigations

| Threat Category            | Potential Attack Vector                                | BabyCharts Mitigation                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Spoofing**               | Forged JWT, stolen tokens, session hijacking           | HttpOnly SameSite cookies, JWT signature verification, token version invalidation on password change, 2FA TOTP requirement.                                                                |
| **Tampering**              | Parameter tampering, Mass Assignment, SQLite injection | Zod input schemas, prepared SQL statements, rejection of unwhitelisted body keys (e.g. `role`, `ownerId`), optimistic concurrency control (`version` check).                               |
| **Repudiation**            | Denying critical deletions or permission changes       | Immutable transactional `family_audit_logs` tracking user, timestamp, target, and action.                                                                                                  |
| **Information Disclosure** | IDOR / cross-family data leak, unencrypted media       | Strict family and profile ownership checks on every route (`checkFamilyWritePermission`, `authMatrix`), AES-256-GCM encrypted media files, PII-redacted logger (`server/utils/logger.js`). |
| **Denial of Service**      | Oversized payloads, API brute forcing, regex DoS       | Granular `express.json` limits (1MB general, 15MB profiles, 35MB media), Express-Rate-Limit on auth endpoints.                                                                             |
| **Elevation of Privilege** | Member elevating to Owner or accessing another family  | Central RBAC matrix (`server/security/authMatrix.js`), verification of requester's role within the exact family context.                                                                   |
