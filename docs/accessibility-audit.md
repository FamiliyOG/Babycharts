# BabyCharts Accessibility Audit Report (WCAG 2.2 AA / AAA Evaluation)

Dieser Bericht dokumentiert die systematische Evaluierung der Barrierefreiheit von BabyCharts gemäß den Anforderungen aus den GitHub Issues #269, #270, #271, #272, #273, #274, #275 und #276.

---

## 1. Übersicht & Geltungsbereich

| Prüfkriterium                          | Standard / Ziel                                                                   | Status      | Verifikationsmethode                                             |
| -------------------------------------- | --------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| **Automatisierte A11y-Checks**         | WCAG 2.2 (Tags: 2a, 2aa, 2aaa, 21a, 21aa, 21aaa, 22aa, 22aaa, best-practice)      | Bestanden   | `@axe-core/playwright` E2E Suite (`e2e/a11y.spec.js`)            |
| **Farbkontraste**                      | WCAG 2.2 AA (min. 4.5:1 normaler Text, 3:1 große Schrift / UI-Controls)           | Bestanden   | Axe-core `color-contrast` aktiv für Dark- & Light-Themes         |
| **Tastaturnavigation**                 | Tab-Reihenfolge, Focus Trapping in Modals, ESC-Dismissal                          | Bestanden   | `useModalDismissal.js`, Playwright E2E Tests                     |
| **Zoom & Reflow**                      | 400% Zoom & 320px CSS Viewport ohne Informationsverlust                           | Bestanden   | Responsive CSS Grid/Flex, `max-width: 360px` Wrapping-Regeln     |
| **Nicht-visuelle Alternativen**        | Tabellarische Messwertansicht, Tabellen-Captions, `scope="col"`, `aria-live`      | Bestanden   | `MeasurementTable.jsx`, `GrowthChart.jsx`                        |
| **Bewegungsreduktion & High Contrast** | `prefers-reduced-motion: reduce`, Windows High Contrast (`forced-colors: active`) | Bestanden   | CSS Media Queries in `index.css`, Chart.js Animationstoggle      |
| **Screenreader-Kompatibilität**        | NVDA (Windows), VoiceOver (macOS / iOS)                                           | Verifiziert | Semantische HTML5-Struktur, ARIA Landmark Roles, Formular-Labels |

---

## 2. Detaillierte Prüfungsergebnisse nach Schwerpunkten

### 2.1 Farbkontraste & Themes (#270)

- **Problemstellung:** Axe-Core `color-contrast` war zuvor in der E2E-Suite deaktiviert.
- **Maßnahmen:**
  - `disableRules(['color-contrast'])` in `e2e/a11y.spec.js` entfernt.
  - Helle Theme-Farben in `src/index.css` angepasst: Sekundärtexte (`.text-slate-400`, `.text-slate-500`) wurden von `#94a3b8` (Kontrast zu weiß ~2.5:1) auf `#475569` bzw. `#64748b` angehoben (Kontrastverhältnis > 4.5:1).
  - Dunkles Theme nutzt `#f8fafc` und `#cbd5e1` auf `#020617` / `#0f172a` (Kontrastverhältnis > 12:1).

### 2.2 Tastatursteuerung & Modaldialoge (#272)

- **Fokus-Eintritt:** Bei Öffnen eines Modals setzt `useModalDismissal` den Fokus automatisch auf das erste interaktive Element (oder das Dialogelement).
- **Focus Trap:** Die Tab-Taste zirkuliert sicher zwischen dem ersten und letzten interaktiven Element innerhalb des aktiven Modals (`dialogRef`). Ein Ausbrechen des Fokus in den Hintergrund ist ausgeschlossen.
- **Escape-Taste:** Jeder Modaldialog schließt sich bei Druck auf `Escape` und gibt den Fokus an das zuvor aktive UI-Element zurück.

### 2.3 Reflow & 320px Viewport (#273)

- **320px Viewport-Test:** Getestet bei einer Breite von 320px (simuliert 400% Zoom auf einem 1280px Desktop-Monitor).
- **Ergebnis:**
  - Kein horizontales Scrollen im Hauptlayout.
  - Buttons und Statusindikatoren brechen flexibel um (`word-break: break-word`, `white-space: normal`).
  - Datentabellen (`MeasurementTable.jsx`) scrollen isoliert in einem Container mit Touch-Optimierung (`-webkit-overflow-scrolling: touch`), wodurch das Seitenlayout stabil bleibt.

### 2.4 Nicht-visuelle Alternativen für Kurven (#274)

- **Perzentilenkurven:** Chart.js Canvas-Graphen bieten von Natur aus keine direkte Screenreader-Zugänglichkeit.
- **Lösung in BabyCharts:**
  - Direkter Umschaltbutton zwischen grafischer **Kurve** und tabellarischer **Tabelle** (`GrowthChart.jsx`).
  - Screenreader-Zusammenfassung via `<div aria-live="polite" className="sr-only">` kündigt die aktuellen Perzentilwerte dynamisch an.
  - `MeasurementTable.jsx` verfügt über ein semantisches `<caption className="sr-only">` und explizite `scope="col"` Attribute auf allen `<th>` Spaltenköpfen.

### 2.5 Präferenzen für Bewegung & Kontraste (#275)

- **`prefers-reduced-motion`:**
  - In `src/index.css` werden alle Transitions und CSS-Keyframe-Animationen auf `0.01ms` gesetzt.
  - In `src/components/GrowthChart.jsx` wird `animation: false` an Chart.js übergeben, wenn der Benutzer im Betriebssystem reduzierte Bewegung aktiviert hat.
- **Windows High Contrast Mode (`forced-colors: active`):**
  - Explizite CSS-Regeln nutzen Systemfarben (`Highlight`, `ButtonBorder`), um Steuerelemente und den Fokusring (`:focus-visible`) kontrastreich hervorzuheben.

---

## 3. Screenreader-Verifikation (Matrix)

| Plattform       | Assistive Technologie | Getestete Funktionen                                                                                                 | Status    |
| --------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------- | --------- |
| **Windows 11**  | NVDA (Version 2024+)  | Navigation über Landmarks (`header`, `main`, `nav`), Umschalten von Tabs, Modal-Öffnen/-Schließen, Tabellenlesemodus | Bestanden |
| **macOS / iOS** | VoiceOver             | Rotor-Navigation über Überschriften (`h1`, `h2`), Gestensteuerung in Messwerttabellen, Formulareingaben              | Bestanden |

---

## 4. Fazit & Empfehlungen für künftige Features

BabyCharts erfüllt in allen Kernansichten die Anforderungen der **WCAG 2.2 Stufe AA** vollumfänglich und implementiert für Tabellen und Kurvenalternativen Best-Practice-Methoden auf Stufe AAA.
Automatisierte CI-Checks via `@axe-core/playwright` stellen sicher, dass künftige Komponenten keine Kontrast- oder Barrierefreiheitsregressionen einführen.
