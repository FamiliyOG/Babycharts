# BabyCharts Architecture & Decision Records (BC-311)

This document describes the architectural layout, core subsystems, and fundamental Architectural Decision Records (ADRs) of BabyCharts.

## 1. Subsystem Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       Browser Client                        │
│   React 19 + Vite 8 + Tailwind CSS 4 + Lucide + Chart.js    │
│   Domain Adapters & Types + i18next (DE, EN, TH)            │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / HTTPS (JSON & Blobs)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express 5 Server                        │
│  - Security: Helmet (CSP), CSRF, Rate Limiting, RBAC Matrix │
│  - API Versioning: /api/v1 (RFC 9263 Deprecation headers)   │
│  - Services: AuthService, FamilyService, ProfileService     │
│  - Repositories: UserRepo, FamilyRepo, ProfileRepo          │
│  - Media: AES-256-GCM Encryption Pipeline & Range Streaming │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Storage & Local Persistence                 │
│  - Better-sqlite3 (WAL Mode, Foreign Keys, Schema v1–v9)    │
│  - Encrypted Media Files & Derivatives (sm, md, lg)         │
│  - JSON Backups & Ephemeral PDF Reports                     │
└─────────────────────────────────────────────────────────────┘
```

## 2. Key Architectural Decision Records (ADRs)

### ADR 001: Local-First Self-Hosting with SQLite (WAL Mode)

- **Status:** Accepted
- **Context:** Families require strict privacy and zero cloud dependencies for sensitive child medical data.
- **Decision:** Use `better-sqlite3` with Write-Ahead Logging (WAL) and foreign keys enabled on every connection. Eliminates external database administration requirements.

### ADR 002: Authenticated Encryption for Media Derivatives (AES-256-GCM)

- **Status:** Accepted
- **Context:** Child photos and ultrasound scans stored on disks must not be readable if disk images or raw files are accessed without application keys.
- **Decision:** Encrypt all uploaded originals and generated thumbnails (`sm`, `md`, `lg`) using AES-256-GCM with master key derivation and discrete auth tags.

### ADR 003: Centralized Declarative Authorization Matrix

- **Status:** Accepted
- **Context:** Scattered inline permission checks increase risk of IDOR and privilege escalation.
- **Decision:** Enforce a single central role matrix (`server/security/authMatrix.js`) evaluated server-side before request handlers execute.
