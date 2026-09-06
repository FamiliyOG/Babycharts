# BabyCharts Data Lifecycle & Privacy Policy (BC-312)

This document specifies the privacy guarantees, storage retention, data classification, and deletion lifecycles for BabyCharts self-hosted instances.

## 1. Data Classification & Storage Locations

| Data Category    | Examples                        | Storage Medium                         | Encryption Status                                                    |
| ---------------- | ------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| **Account Data** | Email, Name, Password Hash      | SQLite (`users`)                       | Passwords hashed with bcrypt (cost 10+); 2FA secrets stored securely |
| **Child Data**   | Name, Birthdate, Gender         | SQLite (`profiles`)                    | Plaintext in local SQLite with strict OS permissions                 |
| **Health Logs**  | Weight, Height, Vaccines, Notes | SQLite (`measurements`, `health_logs`) | Plaintext in local SQLite; masked in application logs                |
| **Media Files**  | Photos, Ultrasounds, Thumbnails | Disk (`server/data/media/`)            | **AES-256-GCM encrypted** at rest                                    |
| **Audit Logs**   | Role changes, logons, deletions | SQLite (`family_audit_logs`)           | Plaintext local SQLite, tamper-evident timestamps                    |

## 2. Deletion & Soft-Delete Lifecycle

1. **Profile Deletion:** When a parent deletes a child profile, it enters a `deletedAt` state (soft-delete). It is hidden from standard views but recoverable by the family owner within 30 days.
2. **Permanent Deletion:** After the retention period or upon manual purge, all related measurements, health logs, vaccinations, and encrypted media derivatives are deleted transactionally (`CASCADE`).
3. **Account Deletion:** Users can delete their account. If they are the sole owner of a family, ownership must either be transferred or the family will be deleted with all child profiles.

## 3. Zero Cloud Telemetry by Default

- BabyCharts sends **zero telemetry, analytics, or profiling data** to third parties by default.
- Error reporting via Sentry is strictly opt-in (`VITE_SENTRY_ENABLED === 'true'`). When enabled, all PII, health notes, and authentication headers are stripped before payload dispatch.
