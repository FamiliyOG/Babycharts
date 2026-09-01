# 🩺 Regionale Gesundheitsrichtlinien & Medizinische Stammdaten (#224 / BC-119, #225 / BC-120)

BabyCharts trennt globale Wachstumsstandards architektonisch von länderspezifischen Vorsorgeplänen und Impfempfehlungen.

---

## 🌍 1. Modul-Struktur

```
src/data/
├── whoPercentiles.js     # Global: WHO Wachstumsstandards (0–5 Jahre)
├── uCheckups.js           # Deutschland (DE): U1 bis U9 Vorsorgeplan (G-BA)
├── vaccinations.js        # Deutschland (DE): STIKO Impfkalender (RKI)
├── milestones.js          # Entwicklungsmeilensteine
└── teeth.js               # Milchgebiss & Zahndurchbruch
```

---

## 💉 2. Regionale Entkopplung

1. **Globale Basis:** Die Perzentilenkurven basieren standardmäßig auf den **WHO Child Growth Standards** (Gewicht, Länge, Kopfumfang, BMI), die weltweit als Goldstandard anerkannt sind.
2. **Länderprofile:**
   - **Deutschland (`DE`):** U1–U9 Vorsorgeuntersuchungen + STIKO-Empfehlungen (inkl. 6-fach, MMRV, Meningokokken B/C, RSV-Prophylaxe).
   - **Thailand (`TH`):** MOPH (Ministry of Public Health) Impf- und Vorsorgeschema.
   - **International / USA (`EN`):** AAP / CDC Periodic Screening Guidelines.
3. **Dynamische Selektion:**
   - In den Profil- und Familieneinstellungen kann der gewünschte medizinische Leitfaden regionsspezifisch konfiguriert werden.
