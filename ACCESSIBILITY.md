# Barrierefreiheit & Accessibility bei BabyCharts

BabyCharts verfolgt das Ziel, alle Kernfunktionen für Eltern, Angehörige und medizinisches Fachpersonal barrierefrei, inklusiv und uneingeschränkt nutzbar zu gestalten.
Die Gestaltung und Entwicklung orientiert sich an den **Web Content Accessibility Guidelines (WCAG 2.2)** auf den Konformitätsstufen **AA** und strebt gezielt Kriterien der Stufe **AAA** an.

---

## 1. Konformitätsstatus & Transparenz (Issue #269)

Wir unterscheiden strikt zwischen **automatisierten Prüfungen** und **vollständigen Konformitätsaussagen**:

- **Automatisierte CI-Prüfungen (`@axe-core/playwright`):**
  - Prüfen den Code auf maschinell messbare Kriterien der Stufen A, AA und AAA (Semantik, ARIA-Labels, Formularbeschriftungen, Kontrast, Duplicate-IDs).
  - Automatisierte Werkzeuge decken erfahrungsgemäß etwa 30–50 % aller WCAG-Erfolgskriterien ab.
- **Konformitätsstufe:**
  - BabyCharts strebt die **vollständige Konformität nach WCAG 2.2 Stufe AA** an.
  - Eine formelle Bestätigung der Stufe AAA erfolgt erst nach einem vollständig dokumentierten manuellen Experten- und Screenreader-Audit (VoiceOver & NVDA).

---

## 2. Unterstützte Bedienkonzepte

### Tastaturbedienung & Fokus-Management (WCAG 2.1.1, 2.1.2, 2.4.7)

- Alle interaktiven Elemente (Buttons, Links, Inputs, Switches) sind ohne Maus mit der Tabulatortaste erreichbar.
- Dialogfenster (Modals) fangen den Tastaturfokus ein (`Focus Trap`), lassen sich mit `Escape` schließen und stellen den Fokus beim Schließen wieder auf den auslösenden Button zurück.
- Sichtbare Fokusringe (`focus-visible:ring`) mit hohem Kontrast erleichtern die visuelle Orientierung.

### Nichtvisuelle Alternativen & Screenreader (WCAG 1.1.1, 1.3.1)

- Diagramme (`Chart.js`) werden von einer textuellen Zusammenfassung der aktuellen Messwerte (`aria-live="polite"`) und einer barrierefreien tabellarischen Ansicht mit semantischen `<th>` (Scope `col` / `row`) und `<caption className="sr-only">` begleitet.
- Icons verfügen über `aria-hidden="true"` oder verständliche Textalternativen (`aria-label`).

### Farbkontraste & Farbunabhängigkeit (WCAG 1.4.1, 1.4.3, 1.4.6)

- Wichtige Statusmeldungen (z. B. Perzentilen, Fehler, Erfolge) werden niemals ausschließlich über Farbe, sondern stets durch Text, Badges oder Icons vermittelt.
- Farbkontraste in Hell- und Dunkelmodus erfüllen das Kontrastverhältnis von mindestens 4.5:1 für Normaltext und 3:1 für Grafiken und UI-Komponenten.

### Zoom & Reflow bis 400 % (WCAG 1.4.4, 1.4.10)

- Die Anwendung unterstützt Vergrößerung im Browser bis 400 % und 320 CSS-Pixel Viewport-Breite ohne Informationsverlust oder horizontales Scrollen im Hauptinhalt.

### Bewegung & Kontraste (WCAG 2.2.2, 2.3.3)

- Wenn im Betriebssystem `prefers-reduced-motion` aktiviert ist, werden alle dekorativen Animationen, Konfetti-Effekte und Diagramm-Übergänge automatisch deaktiviert.
- Windows High Contrast Mode / Forced Colors werden semantisch über Systemfarben unterstützt.

---

## 3. Automatisierte Tests ausführen

```bash
# E2E Accessibility-Audit mit Playwright & axe-core
npm run test:a11y
```
