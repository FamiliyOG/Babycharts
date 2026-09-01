# /implement-issue Workflow

Dieser Workflow führt einen Coding-Agent durch die vollständige Bearbeitung eines GitHub Issues mit MCP-Unterstützung.

## Ablauf

1. **Issue analysieren:**
   - Falls GitHub MCP verfügbar ist: Issue-Beschreibung, Kommentare und verknüpfte Akzeptanzkriterien laden.
   - Andernfalls: Issue-Kontext aus User-Prompt lesen.

2. **Dokumentation prüfen (Context7):**
   - Falls externe Third-Party Libraries (z.B. React 19, Vite 8, TanStack Query, Zod) verwendet oder geändert werden, aktuelle API-Docs via Context7 abrufen.

3. **Architektur & Trust Boundaries bestimmen:**
   - Überprüfen, ob Backend (`server/`), Auth (`JWT / Cookie`), Datenbank (`better-sqlite3`) oder Frontend (`src/`) betroffen sind.
   - Familien-Isolation (`crossFamilySecurity`) und Pflichtfelder beachten.

4. **Implementierung:**
   - Kleinste, saubere Code-Änderung ohne speculative Abstraktionen durchführen.
   - Keine Hardcoded-Strings einfügen (immer `src/i18n/` aktualisieren).

5. **Regressionstests:**
   - Regressionstest schreiben (`src/test/` oder `e2e/`).
   - `npm test` ausführen.

6. **Quality Gate:**
   - `npm run scan:code` ausführen.
   - `npm run build` ausführen.

7. **Abschluss & Commit:**
   - Conventional Commit mit Schließung des Tickets: `feat(scope): ... (closes #ID)`.
   - Auf `origin/main` pushen.
