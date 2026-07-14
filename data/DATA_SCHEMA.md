# Daten-Schema — Kreaturen, Elemente & Fusionen

Data-driven Grundlage für das Spiel. Drei Dateien, gedacht als `/data/*.json` im Repo. **Alle Stats & Fähigkeits-Werte sind Platzhalter fürs Balancing.**

## Übersicht

| Datei | Inhalt |
|---|---|
| `types.json` | Element-System (3 Basis + 3 Hybride) inkl. Schadens-Multiplikatoren |
| `creatures.json` | 42 Kreaturen (21 Basis + 21 Hybride), Stats, Ability-Referenzen |
| `fusions.json` | Fusions-Regel + 21 konkrete Rezepte |

## ID-Konvention

Kreatur-`id` ist immer `<element>_<archetyp>`, z. B. `fire_drache`, `steam_golem`. Der `name` ist der Anzeigename (bei Hybriden aktuell Platzhalter wie „Dampf-Drache").

## Elemente (`types.json`)

Basis-Kreislauf mit Vorteil **×1,5** / Nachteil **×0,75**:

```
🔥 Feuer → 🌿 Natur → 💧 Wasser → 🔥 Feuer
```

Hybride (Tier 2) sind **neutral** — kein Typ-Vorteil, aber auch keine Schwäche → flexible Allrounder:
`Dampf` (Feuer+Wasser), `Asche` (Feuer+Natur), `Frost` (Natur+Wasser).

## Kreaturen (`creatures.json`)

- **7 Archetypen** mit fester Kampf-Rolle: Drache (DPS), Golem (Tank), Greif (Speed), Bestie/Wolf (Bruiser), Wyrm (DoT), Geist (Support/Heal), Phönix (Sustain/Revive).
- Jeder Archetyp existiert in allen 3 Basis-Elementen.
- **Stats** folgen der Rolle; Element gibt kleinen Flavor (Feuer +ATK, Natur +HP, Wasser +DEF). Hybride ≈ Rolle × 1,4.
- **Fähigkeiten** liegen zentral unter `abilities` und werden per `passive`/`active`-Referenz genutzt (pro Archetyp geteilt).
- **Energie-Modell:** Leiste 0–100. Passive lädt (Angriff/Treffer/Zeit), aktive Fähigkeit (Ulti) kostet volle 100 und wird per Antippen ausgelöst.
- `mvp: true` markiert die 6 Start-Kreaturen.

## Fusionen (`fusions.json`)

- **Regel „elemental":** gleicher Archetyp, zwei verschiedene Basis-Elemente auf Max-Level → Hybrid.
- Jedes `recipe`: `inputs` (2 Kreatur-IDs) → `output` (Hybrid-ID), `requiresMaxLevel: true`.
- **Post-MVP:** Regel „archetype" (gleiches Element, andere Archetypen → Chimäre) ist als `enabled: false` vorgesehen.

## MVP-Subset

Aktiv im ersten Build (`mvp: true`):
`fire_drache` (Glutdrache), `nature_golem` (Moosgolem), `water_geist` (Quellgeist), `nature_wolf` (Dornwolf), `water_wyrm` (Seeschlange), `fire_greif` (Aschengreif).

Demo-Fusion: dazu `water_drache` (Tiefendrache) freischalten → `fire_drache` + `water_drache` = `steam_drache` (Dampf-Drache).
