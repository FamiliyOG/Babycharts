# BabyCharts Usability-Testing-Protokoll & SUS-Benchmark (Issue #285)

## 1. Übersicht & Zielsetzung

Dieses Dokument definiert das strukturierte Usability-Testprotokoll für **BabyCharts** nach den Erweiterungen aus **Phase 3 (UI/UX, Navigation, Timeline, Familiencockpit & Klinischer Arztmodus)**.

Ziel ist es, die Gebrauchstauglichkeit, Fehlertoleranz und Navigationseffizienz für Eltern und medizinische Fachkräfte zu evaluieren und mit dem standardisierten **System Usability Scale (SUS)** Benchmark messbar zu machen.

---

## 2. Test-Szenarien & Aufgaben (Tasks)

| Task ID  | Szenario                                                                                                                      | Erwartetes Ergebnis                                                           | Erfolgs-Kriterien                                                              |
| :------- | :---------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **T-01** | **URL Deep Linking (#277)**<br>Direkter Aufruf von `/c/:childId/growth` über Lesezeichen/URL.                                 | Die App öffnet direkt das gewählte Kind und den Tab "Wachstumskurven".        | Kein Flackern, keine Weiterleitung auf Startseite bei gültiger ID.             |
| **T-02** | **Familiencockpit (#278)**<br>Überprüfung von anstehenden U-Vorsorgen und STIKO-Impfungen auf dem Today-Dashboard.            | Nächster Termin und empfohlene Impfungen sind auf einen Blick sichtbar.       | Direkter Klick auf Schnellaktion öffnet das entsprechende Modul.               |
| **T-03** | **Quick Add & Sortierung (#279)**<br>Hinzufügen eines Eintrags über den schwebenden Plus-Button mit Suchfilter.               | Häufig genutzte Aktionen stehen oben; Filter findet Aktionen sofort.          | Doppelklicks werden gedebuggt; keine doppelten Einträge.                       |
| **T-04** | **Custom Mobile Navigation (#280)**<br>Navigation über die untere Tableiste auf Smartphone-Screens (< 400px).                 | Die wichtigsten 4 Tabs sind mit Daumen erreichbar; Tooltips/Labels sind klar. | Keine Überlappung mit System-Gesten oder Safe Areas.                           |
| **T-05** | **Formulare & Validierung (#281)**<br>Eintragen eines Messwerts mit unvollständigen oder ungewöhnlichen Werten.               | FormField zeigt inline Fehler (`aria-describedby`) und Warnungen an.          | Tastaturfokus springt zum ersten fehlerhaften Feld; Speichern wird verhindert. |
| **T-06** | **Timeline Filter & Suche (#282)**<br>Suche nach einem bestimmten Meilenstein oder U-Untersuchung im Zeitverlauf.             | Suchfilter und Datumsauswahl filtern Einträge in Echtzeit.                    | Leere Zustände bieten klare Handlungsanweisungen.                              |
| **T-07** | **Klinischer Arztmodus (#283)**<br>Aufrufen der Kinderarzt-Übersicht beim Pädiater und anschließendes Drucken/Schließen.      | Strippt private Fotos und Notizen; 15-Minuten-Timeout schützt Privatsphäre.   | Kategorien (Biometrie, Impfungen, U-Heft) lassen sich gezielt ein-/ausblenden. |
| **T-08** | **Messwert löschen & Rückgängig (#284)**<br>Versehentliches Löschen eines Eintrags mit anschließendem Klick auf "Rückgängig". | Gelöschter Messwert wird über Toast sofort und verlustfrei wiederhergestellt. | Rückgängig-Aktion funktioniert zuverlässig innerhalb von 7 Sekunden.           |

---

## 3. System Usability Scale (SUS) Fragebogen

Der SUS-Fragebogen besteht aus 10 Standardfragen auf einer Likert-Skala von 1 (Stimme überhaupt nicht zu) bis 5 (Stimme vollkommen zu):

1. Ich kann mir gut vorstellen, BabyCharts regelmäßig zu nutzen.
2. Ich empfinde BabyCharts als unnötig komplex.
3. Ich fand BabyCharts einfach zu bedienen.
4. Ich glaube, ich würde die Unterstützung einer Fachperson brauchen, um BabyCharts zu nutzen.
5. Die verschiedenen Funktionen in BabyCharts sind gut integriert.
6. Ich empfinde zu viele Unstimmigkeiten in BabyCharts.
7. Ich kann mir vorstellen, dass die meisten Menschen sehr schnell den Umgang mit BabyCharts lernen.
8. Ich empfinde die Bedienung als sehr umständlich.
9. Ich habe mich bei der Nutzung von BabyCharts sehr sicher gefühlt.
10. Ich musste viele Dinge lernen, bevor ich mit BabyCharts arbeiten konnte.

### SUS-Auswertung & Zielbenchmark

- **Zielwert:** $\ge 85$ Punkte (Entspricht "Grade A+" / Exzellente Usability).
- **Minimum-Akzeptanz:** $\ge 75$ Punkte.

---

## 4. Test-Ergebnisse & Beobachtungen (Evaluationsbericht)

- **Deep Linking:** Das Umschalten per Browser-Vor/Zurück funktioniert nahtlos synchron mit Zustand und LocalStorage.
- **Rückgängig-Funktion:** Das Toast-System stellt gelöschte Messwerte mit einer atomaren Mutation wieder her und schützt Eltern vor versehentlichem Datenverlust.
- **Barrierefreiheit & Lesbarkeit:** Die Kontraste in allen Tabs entsprechen WCAG AA ($> 4.5:1$); Tastatur-Fokus-Traps schließen Fehlbedienungen aus.
