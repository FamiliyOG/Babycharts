# /fix-sonar Workflow

Dieser Workflow dient der gezielten, automatisierten Behebung von SonarCloud / SonarQube Code Smells, Bugs und Security Hotspots.

## Ablauf

1. **Sonar-Issues identifizieren:**
   - Falls SonarQube MCP verfügbar: Offene Issues für das Projekt `FamilyOG_Babycharts` abfragen.
   - Andernfalls: Fehlermeldung oder Regel-ID aus dem Prompt analysieren.

2. **Root-Cause Analyse:**
   - Betroffene Datei und Zeilennummer lokalisieren.
   - Verstehen, welche Clean-Code- oder Security-Regel verletzt wurde (z.B. Regex ReDoS, Duplication, Cognitive Complexity).

3. **Behebung ohne Nebeneffekte:**
   - Problem beheben, ohne neue Code-Duplikate (`jscpd`) einzuführen.
   - Sicherstellen, dass keine Typfehler oder Linter-Warnungen entstehen.

4. **Validierung:**
   - `npm run scan:code` ausführen.
   - `npm test` ausführen.
   - `npm run build` ausführen.

5. **Commit & Push:**
   - Commit: `fix(quality): resolve Sonar rule <RULE_ID> in <FILE>`.
   - Auf `origin/main` pushen.
