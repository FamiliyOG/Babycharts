# 👶 BabyCharts

<div align="center">

![BabyCharts Banner](https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/baby.svg)

**Der moderne, ganzheitliche & datenschutzfreundliche Tracker für Kinder-Wachstum, Vorsorgeuntersuchungen (U1–U9), STIKO-Impfungen, Zähne und Meilensteine.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg?style=flat-square&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-cyan.svg?style=flat-square&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![SQLite](<https://img.shields.io/badge/Database-SQLite%20(WAL)-blue.svg?style=flat-square&logo=sqlite>)](https://sqlite.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg?style=flat-square&logo=docker)](https://docker.com)
[![Code Quality](https://img.shields.io/badge/Linter-0%20Warnings-emerald.svg?style=flat-square)](https://eslint.org)

[Kernfunktionen](#-kernfunktionen) • [Technologie](#️-technologie-stack) • [Schnellstart](#-schnellstart) • [Docker & Unraid](#-docker--unraid-deployment) • [Sicherheit](#-sicherheit--datenschutz) • [Mitwirken](#-mitwirken)

</div>

---

## 🌟 Über BabyCharts

BabyCharts ist eine selbst gehostete All-in-One Plattform für Eltern und Familien. Alle Gesundheitsdaten, Wachstumsmaße, Tagebucheinträge und Fotos bleiben **100 % in Ihrer eigenen Hand auf Ihrem eigenen Server**, ohne Drittanbieter-Cloud oder Datenübermittlung.

---

## 🚀 Kernfunktionen

### 📈 1. Offizielles WHO-Wachstumstracking (0–5 Jahre)

- **Perzentilenkurven (P3, P15, P50, P85, P97)** basierend auf den weltweiten Standards der Weltgesundheitsorganisation (WHO).
- Interaktive Diagramme mit **Chart.js** für:
  - Körpergewicht (kg / g)
  - Körperlänge / Größe (cm)
  - Kopfumfang (cm)
  - Body-Mass-Index (BMI)
- Automatischer Geschlechtsvergleich (Jungen ♂ / Mädchen ♀) mit individueller Farbanpassung.

### 📋 2. Deutsches U-Heft Vorsorge-Tracking (U1 bis U9)

- Exakte Zeitfenster-Berechnung ab Geburt mit Empfehlungszeiträumen.
- Statusübersicht: _Erledigt_, _Fällig / Empfohlen_, _Überfällig_ oder _Ausstehend_.
- Zusammenfassung ärztlicher Schwerpunkte (z. B. Hörtest, Stoffwechselscreening, Sehtest, Motorik).

### 💉 3. STIKO-Impfpass (RKI-Standard)

- Vollständiger deutscher STIKO-Impfkalender (6-fach-Impfung, Pneumokokken, Rotaviren, MMR, Varizellen, Meningokokken B & C).
- Erfassung von Chargennummer, Impfdatum, Praxis/Arzt und Recall-Status.

### 🦷 4. Interaktiver Milchzahn-Tracker

- Visuelles Kieferschema für Ober- und Unterkiefer (20 Milchzähne).
- Anatomische Unterscheidung nach Schneidezähnen, Eckzähnen und Molaren.
- Dokumentation des Zahndurchbruchs mit Monatsalter und Notizen.

### ✨ 5. Meilenstein- & Entwicklungstagebuch

- 15 vorgefertigte Entwicklungsschritte (erstes Lächeln, Drehen, Krabbeln, Sitzen, freies Laufen, erste Worte etc.).
- Foto-Upload für jeden Meilenstein inklusive Vollbild-Lightbox.
- Erstellung benutzerdefinierter Meilensteine.

### 🩺 6. Fieber-, Symptom- & Medikamenten-Protokoll

- Kontinuierlicher Temperaturverlauf mit farbcodierten Fieberzonen.
- Protokollierung verabreichter Medikamente (z. B. Paracetamol, Ibuprofen) und Dosierungen.
- Dokumentation von Symptomen (Husten, Schnupfen, Bauchweh etc.).

### 📑 7. Smarte Berichte & Exporte

- **DIN A4 PDF-Bericht**: Umfassender Ausdruck für Kinderarzt oder Archiv mit Perzentilen und Kurven.
- **DIN A5 U-Heft Einleger**: Perfekt formatiert zum Einkleben / Einlegen in das offizielle gelbe U-Heft.
- **Kalender-Export (`.ics`)**: Automatische Termine für alle U-Untersuchungen und Impfungen für Google Calendar, Apple Kalender & Outlook.
- **CSV / Excel Export**: Rohdaten-Export für eigene Auswertungen.
- **JSON Backup & Restore**: Vollständige Datensicherung mit 1-Klick-Wiederherstellung.

### 👥 8. Familienverwaltung & Multi-User

- Geteilter Zugriff für Elternteile und Partner mit Schreibrechten (`editor`).
- Einladung von Großeltern oder Angehörigen im reinen Lesemodus (`viewer`).
- Einladungs-Code-Generator mit Rollenwahl.
- Mehrere Familien pro Benutzerkonto wechselbar.

---

## 🛠️ Technologie-Stack

| Bereich        | Technologien                                                                               |
| :------------- | :----------------------------------------------------------------------------------------- |
| **Frontend**   | React 19, Tailwind CSS v4, Chart.js, React-Chartjs-2, jsPDF, Lucide Icons, Canvas-Confetti |
| **Backend**    | Node.js, Express 5 (ESM), SQLite (`better-sqlite3` im WAL-Modus)                           |
| **Sicherheit** | JWT (JSON Web Tokens), Bcrypt Passworthashes, 2FA (TOTP via Speakeasy & QRCode)            |
| **Tooling**    | Vite 8, Prettier, Oxlint & ESLint 9, Docker Multi-Stage Builds                             |

---

## ⚡ Schnellstart (Lokal)

### Voraussetzungen

- Node.js (v20+) & npm

```bash
# 1. Repository klonen
git clone https://github.com/<your-username>/Babycharts.git
cd Babycharts

# 2. Abhängigkeiten installieren
npm install

# 3. Umgebungsvariablen einrichten
cp .env.example .env

# 4. Entwicklungsmodus starten (Frontend & Backend)
npm run dev
# In einem zweiten Terminal für die API:
npm run dev:server
```

Die Anwendung ist im Browser unter `http://localhost:5173` erreichbar.

---

## 🐳 Docker & Unraid Deployment

BabyCharts ist für den 24/7-Dauerbetrieb im Docker-Container optimiert.

### Docker Compose

Erstellen Sie eine `docker-compose.yml`:

```yaml
services:
  babycharts:
    image: babycharts:latest
    build: .
    container_name: babycharts
    restart: unless-stopped
    ports:
      - '3001:3001'
    environment:
      - PORT=3001
      - NODE_ENV=production
      - JWT_SECRET=wechsel_mich_auf_ein_sicheres_geheimnis
    volumes:
      - ./data:/app/server/data
```

Starten mit:

```bash
docker compose up -d --build
```

### Unraid Installation

- Nutzen Sie die beiliegende Datei [`unraid-template.xml`](unraid-template.xml) in Ihrem Unraid `templates-user`-Verzeichnis.
- Host-Pfad zuweisen: `/mnt/user/appdata/Babycharts/data` -> `/app/server/data`.
- Port: `3001`.

---

## 🔒 Sicherheit & Datenschutz

- **100 % lokal**: Keine externen Tracking-Tools, Analytics oder Werbenetzwerke.
- **2-Faktor-Authentifizierung (2FA)**: Schützen Sie sensible Daten via TOTP (kompatibel mit Apple Passwords, 1Password, Bitwarden, Google Authenticator).
- **SQLite WAL-Modus**: Volle ACID-Transaktionssicherheit gegen Datenverlust bei unerwarteten Neustarts.
- **Client-Fehler-Streaming**: Fehler im Frontend werden automatisch im Docker-Log protokolliert, um eine einfache Diagnose zu ermöglichen.

Weitere Details finden Sie in unserer [Sicherheitsrichtlinie](SECURITY.md).

---

## 🤝 Mitwirken

Beiträge zur Weiterentwicklung von BabyCharts sind herzlich willkommen!  
Bitte lesen Sie unsere Richtlinien in [CONTRIBUTING.md](CONTRIBUTING.md), bevor Sie einen Pull Request eröffnen.

---

## 📄 Lizenz

Dieses Projekt ist unter der **MIT-Lizenz** lizenziert – siehe die [LICENSE](LICENSE)-Datei für Details.
