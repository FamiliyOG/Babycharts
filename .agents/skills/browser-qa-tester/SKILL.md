---
name: browser-qa-tester
description: Führt autonome Browser-QA, Responsiveness-Tests (320px Viewport) und Accessibility-Prüfungen auf BabyCharts durch.
---

# Browser QA Tester Skill

Dieser Skill leitet Coding-Agents an, interaktive Browser-Tests für BabyCharts durchzuführen.

## 🎯 Testbereiche

1. **Mobile Responsiveness:**
   - 320px × 568px (iPhone SE)
   - 375px × 667px (Standard Mobile)
   - 768px × 1024px (Tablet)
   - 1280px × 800px (Desktop)

2. **Kern-Flows (Golden Paths):**
   - Registrierung & automatischer Login
   - Kind anlegen (`ProfileModal`) mit Name, Geburtsdatum und Geschlecht
   - Messung eintragen (`MeasurementForm`) mit Gewicht, Größe, Kopfumfang
   - Arzt-Freigabe generieren und QR-Code prüfen
   - Modals öffnen, mit Escape / Klick außerhalb schließen und Focus-Trap verifizieren
   - Dark Mode / Light Mode Umschaltung

3. **Checkliste bei UI-Änderungen:**
   - [ ] Keine horizontalen Scrollbalken auf 320px Viewport
   - [ ] Touch-Targets mindestens 44px × 44px
   - [ ] Keine abgeschnittenen Texte oder Überlappungen
   - [ ] Keine JavaScript Console Errors im Browser-Log
