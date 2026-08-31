---
description: Führt eine vollständige Qualitätsprüfung durch, erstellt ein neues Release-Tag und pusht dieses zu GitHub, um den Docker Multi-Arch Build für Unraid auszulösen.
---

# /deploy-unraid Workflow

Dieser Workflow wird ausgeführt, wenn der Benutzer `/deploy-unraid`, `/deploy` oder `deploy to unraid` anfordert.

## Schritte:

1. **Prüfe Git-Status & Arbeitsverzeichnis:**
   - Führe `git status` aus.
   - Falls uncommittete Änderungen vorliegen, frage den Benutzer oder führe vorab einen Commit durch.
   - Stelle sicher, dass der lokale Branch `main` mit `origin/main` synchron ist (`git pull origin main`).

2. **Qualitätsprüfung durchführen:**
   - Führe `npm run scan:code` aus (Linting, Formatting, Deadcode, Architecture).
   - Führe `npm test` aus (alle Unit-/Integrations-/Security-Tests).
   - Führe `npm run build` aus (Vite Production Build).
   - _Falls ein Test oder Build fehlschlägt:_ Breche sofort ab und behebe den Fehler vor dem Release.

3. **Release-Tag generieren:**
   - Ermittle das aktuelle Datum und einen Zeitstempel oder nutze ein semantisches Versionsformat:
     - Standard-Tag-Format für Unraid-Deployments: `release-unraid-YYYYMMDD-HHMM` (z. B. `release-unraid-20260831-1310`)
     - Alternativ (falls gewünscht): `vX.Y.Z` (aus `package.json`).
   - Erstelle das Git-Tag lokal:
     ```bash
     git tag -a <TAG_NAME> -m "Release for Unraid deployment: <TAG_NAME>"
     ```

4. **Tag zu GitHub pushen:**
   - Pushe das Tag zu GitHub:
     ```bash
     git push origin <TAG_NAME>
     ```
   - Dadurch wird der GitHub Actions Workflow `.github/workflows/docker-publish.yml` ausgelöst.
   - Das neue Multi-Arch Image (`ghcr.io/familiyog/babycharts:latest` sowie `:release-...`) wird gebaut und bereitgestellt.

5. **Abschlussbericht:**
   - Informiere den Benutzer über:
     - Erstellter Release-Tag: `<TAG_NAME>`
     - Link / Hinweis zu den GitHub Actions: https://github.com/FamiliyOG/Babycharts/actions
     - Hinweis, dass Unraid das Image nach Fertigstellung des GitHub Action Builds via `ghcr.io/familiyog/babycharts:latest` pullen kann.
