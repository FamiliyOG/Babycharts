# 🌐 BabyCharts API v1 Specification (#228 / BC-203, #227 / BC-202)

Die BabyCharts REST API ist ab Version 1.1 unter dem standardisierten Präfix `/api/v1` erreichbar. Die bisherigen Pfade unter `/api/*` bleiben aus Gründen der Abwärtskompatibilität vollständig als Alias verfügbar.

---

## 🔐 Authentifizierung

### Web Client

- Verwendet sichere, verschlüsselte `HttpOnly`, `SameSite=Lax`, `Secure` Session-Cookies.
- Cookie-Name: `bc_auth_token`.

### Mobile & Native Clients (Android / iOS / API)

- Verwendet den HTTP `Authorization` Header mit Bearer-Token:
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
- Der Token wird serverseitig mit `tokenVersion` validiert. Bei Passwortänderung, Account-Löschung oder explizitem Logout wird die `tokenVersion` inkrementiert und alle aktiven Tokens werden sofort ungültig.

---

## 📡 Endpunkte-Übersicht

### 🩺 System & Health

- **`GET /api/v1/health`**: Liefert Server-Status, Uptime und Datenbank-Integritätsstatus.
  ```json
  {
    "status": "healthy",
    "version": "v1",
    "timestamp": "2026-09-02T01:00:00.000Z",
    "uptime": 1420.5,
    "database": { "ok": true, "integrity": "ok" }
  }
  ```

---

### 👤 Authentifizierung (`/api/v1/auth`)

- **`POST /api/v1/auth/register`**: Benutzer registrieren (`name`, `email`, `password`, optional `inviteCode`).
- **`POST /api/v1/auth/login`**: Benutzer anmelden (`email`, `password`, optional `totpCode`).
- **`GET /api/v1/auth/me`**: Aktuelles Benutzerprofil und Familienmitgliedschaften abrufen.
- **`POST /api/v1/auth/logout`**: Session beenden und Cookie invalidieren.
- **`POST /api/v1/auth/change-password`**: Passwort ändern (`currentPassword`, `newPassword`).
- **`POST /api/v1/auth/forgot-password`**: Passwort-Reset per E-Mail anfordern.
- **`POST /api/v1/auth/reset-password`**: Neues Passwort mit Reset-Token setzen.
- **`GET /api/v1/auth/export-my-data`**: DSGVO Art. 20 Datenexport aller persönlichen Daten (JSON).
- **`DELETE /api/v1/auth/account`**: DSGVO Art. 17 Vollständige Kontolöschung (`password` erforderlich).

#### 2FA / TOTP:

- **`POST /api/v1/auth/2fa/setup`**: 2FA-Secret und QR-Code generieren.
- **`POST /api/v1/auth/2fa/enable`**: 2FA aktivieren und Backup-Codes erzeugen.
- **`POST /api/v1/auth/2fa/disable`**: 2FA deaktivieren (`password` erforderlich).

---

### 👨‍👩‍👧‍👦 Familienverwaltung (`/api/v1/families`)

- **`GET /api/v1/families`**: Alle Familien des authentifizierten Benutzers auflisten.
- **`POST /api/v1/families`**: Neue Familie erstellen (`name`).
- **`PUT /api/v1/families/:familyId`**: Familie umbenennen (Rolle `owner` / `admin`).
- **`DELETE /api/v1/families/:familyId`**: Familie löschen (nur `owner`).
- **`POST /api/v1/families/:familyId/invites`**: Einladungscode erstellen (`role`, `expiresInDays`).
- **`POST /api/v1/families/join`**: Familie per Einladungscode beitreten (`inviteCode`).
- **`POST /api/v1/families/:familyId/members/:userId/role`**: Rolle eines Mitglieds ändern (`owner` / `admin` / `editor` / `viewer`).
- **`DELETE /api/v1/families/:familyId/members/:userId`**: Mitglied entfernen.
- **`POST /api/v1/families/:familyId/transfer-ownership`**: Eigentümerschaft an ein anderes Mitglied übertragen.

---

### 👶 Kinderprofile & Messwerte (`/api/v1/profiles`)

- **`GET /api/v1/profiles?familyId=<ID>`**: Alle Kinderprofile einer Familie abrufen.
- **`POST /api/v1/profiles`**: Neues Kinderprofil anlegen.
- **`PUT /api/v1/profiles/:childId`**: Kinderprofil aktualisieren (inkl. Optimistic Locking über `version`).
- **`DELETE /api/v1/profiles/:childId`**: Kinderprofil löschen.

---

### 🖼️ Verschlüsselte Medien (`/api/v1/media`)

- **`POST /api/v1/media/upload`**: Foto oder Video hochladen (AES-256-GCM verschlüsselt auf dem Server).
  - Maximale Dateigröße: 25 MB.
  - Unterstützte Formate: JPEG, PNG, WebP, GIF, MP4, WebM, QuickTime.
- **`GET /api/v1/media/:mediaId`**: Entschlüsseltes Medium streamen (autorisierter Token/Session-Zugriff).

---

### ⚙️ Einstellungen & Export (`/api/v1/settings`, `/api/v1/exports`)

- **`GET /api/v1/settings`**: Globale Systemeinstellungen abrufen.
- **`PUT /api/v1/settings`**: Globale Systemeinstellungen aktualisieren (Admin-Berechtigung).
- **`GET /api/v1/exports/backup`**: Vollständiges JSON-Backup exportieren.
- **`POST /api/v1/exports/restore`**: Backup-Datei wiederherstellen.
- **`POST /api/v1/exports/trigger/:childId`**: PDF-Wachstumsbericht manuell generieren.
