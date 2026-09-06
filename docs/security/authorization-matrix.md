# BabyCharts Autorisierungs- und Rollenmatrix (RBAC)

Dieses Dokument beschreibt die zentrale Autorisierungsarchitektur von BabyCharts gemäß den Sicherheitsanforderungen aus den Issues **#257, #261, #268, #325, #326, #327, #330, #331 und #334**.

---

## 1. Berechtigungsstufen (Permission Levels)

Die API erzwingt über `server/security/authMatrix.js` ein einheitliches Berechtigungsmodell (Default-Deny):

| Permission       | Beschreibung                                                              | Typische Endpunkte                                                                                 |
| ---------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `public`         | Ohne Authentifizierung zugänglich                                         | Setup-Status, Login, Registrierung, Passwort-Reset, öffentliche Einstellungen                      |
| `authenticated`  | Jeder gültig angemeldete Benutzer                                         | Eigenes Profil (`/me`), Session-Verwaltung, Familie anlegen/beitreten                              |
| `family:member`  | Jedes bestätigte Mitglied der Familie (Viewer, Editor, Admin, Owner)      | Familie abrufen, Profile anzeigen, Messungen lesen, Audit-Log einsehen                             |
| `family:editor`  | Mitglieder mit Schreibrechten (Elternteil, Admin, Owner)                  | Profil anlegen/bearbeiten, Messungen eintragen, Besuchereinladungen erstellen                      |
| `family:admin`   | Volle Familienverwaltung (nur Familiengründer/Owner oder ernannte Admins) | Mitgliederrollen verwalten, Ownership übertragen, Familie löschen, Backups exportieren/importieren |
| `instance:admin` | Instanz-Superadministrator                                                | Instanzeinstellungen, Entwicklerdiagnose, Datenbank-Backups, Notfall-Break-Glass-Zugriff           |

---

## 2. Familienrollen & Delegierte Rechte (#325)

| Rolle                       | Familiendaten lesen         | Daten schreiben / Messungen erfassen | Besuchereinladungen erstellen (`viewer`) | Elterneinladungen erstellen (`editor`) | Mitglieder verwalten | Familie löschen | Vollständiges Backup |
| --------------------------- | --------------------------- | ------------------------------------ | ---------------------------------------- | -------------------------------------- | -------------------- | --------------- | -------------------- |
| **Familiengründer (Owner)** | ✅                          | ✅                                   | ✅                                       | ✅                                     | ✅                   | ✅              | ✅                   |
| **Administrator**           | ✅                          | ✅                                   | ✅                                       | ✅                                     | ✅                   | ❌ (Nur Owner)  | ✅                   |
| **Elternteil (Editor)**     | ✅                          | ✅                                   | ✅                                       | ❌                                     | ❌                   | ❌              | ❌                   |
| **Besucher (Viewer)**       | ✅ _(Granular freigegeben)_ | ❌                                   | ❌                                       | ❌                                     | ❌                   | ❌              | ❌                   |

---

## 3. Sicherheits-Invarianten & Lebenszyklus-Härtung

### 3.1 Authentifizierungs-Tokens in URLs (#257)

- Tokens in URL-Query-Parametern (`?token=...`, `?jwt=...`) sind auf allen Endpunkten (insb. `/api/media/:id`) strikt untersagt und werden mit **HTTP 400** abgewiesen.
- Authentifizierung erfolgt ausschließlich über `Authorization: Bearer <JWT>` oder sichere `httpOnly`-Cookies (`babycharts_session`).

### 3.2 Content-Security-Policy (#261)

- `script-src` ist strikt auf `'self'` beschränkt (`'unsafe-inline'` ist vollständig entfernt).
- Telemetriedomänen (`connect-src`) werden nur dann eingebunden, wenn Telemetrie installationsseitig explizit aktiv ist.

### 3.3 Familiengründer-Lebenszyklus & Transfer (#326)

- **Eigentümertransfer:** Nur der aktuelle Inhaber kann die Eigentümerschaft übertragen. Erfordert frische Re-Authentifizierung (`X-Reauth-Token`). Transfer an Besucher oder Nichtmitglieder ist verboten.
- **Familienlöschung:** Ausschließlich der Inhaber (Owner) darf die Familie löschen.
- **Kontolöschung des Inhabers:** Hat die Familie weitere Mitglieder, muss der Inhaber die Eigentümerschaft zuerst übertragen. Bei Alleinmitgliedern wird die Familie sauber kaskadierend bereinigt.

### 3.4 Familien-Backups (#327)

- `GET /api/families/:familyId/backup`: Nur der Familiengründer/Admin kann das vollständige JSON-Archiv exportieren.
- `POST /api/families/:familyId/backup/dry-run`: Erlaubt eine Auswirkungsvorschau ohne Schreibzugriffe.
- `POST /api/profiles/import`: Nur der Inhaber/Admin darf ein vollständiges Backup importieren. Eltern oder Besucher erhalten **HTTP 403**.

### 3.5 Superadmin-Entkopplung (#330)

- Der Status als Instanz-Superadmin (`role === 'superadmin' || isDev`) ist vollständig von Familienmitgliedschaften entkoppelt.
- **Letzter Superadmin:** Der letzte Superadmin der Instanz kann weder gelöscht noch degradiert werden.
- **Datenschutzisolation:** Superadmins besitzen keinen stillen Bypass auf fremde Familiendaten; Notfallzugriff erfordert ein auditiertes Break-Glass-Verfahren (`POST /api/families/:familyId/emergency-access`).

### 3.6 Entwicklerdiagnose (#331)

- `GET /api/settings/developer-diagnostics` ist standardmäßig deaktiviert (`enable_developer_tools: false`).
- Auch für Superadmins nur erreichbar, wenn das Flag in den Einstellungen explizit aktiv ist.
- Exponiert ausschließlich aggregierte Metriken und Systemversionen; keine Passwörter, Tokens, Keys oder PII.
