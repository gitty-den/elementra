# Daten-Schema — Kreaturen, Elemente & Fusionen

Data-driven Grundlage für das Spiel. Drei Dateien, gedacht als `/data/*.json` im Repo. **Alle Stats & Fähigkeits-Werte sind Platzhalter fürs Balancing.**

## Übersicht

| Datei | Inhalt |
|---|---|
| `types.json` | Element-System (3 Basis + 3 Hybride) inkl. Schadens-Multiplikatoren |
| `creatures.json` | 21 Basis-Kreaturen (7 Archetypen × 3 Elemente), Stats, Ability-Referenzen (inkl. Fusions-Abilities) |
| `fusions.json` | Fusions-Regel „archetype+element": Element-Kombinatorik, Namens-Präfixe, 12 Fusions-Archetypen |

## ID-Konvention

Basis-Kreatur-`id` ist `<element>_<archetyp>`, z. B. `fire_drache`. Fusions-Kreaturen
heißen `fx_<fusionsarchetyp>_<element>` (z. B. `fx_koloss_ash`) und werden zur
LAUFZEIT aus `fusions.json` generiert (state.js) — sie stehen nicht in `creatures.json`.

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

## Fusionen (`fusions.json`, Redesign 17.07.2026)

- **Regel „archetype+element":** zwei Basis-Kreaturen VERSCHIEDENER Archetypen,
  beide Max-Level → einer von 12 kuratierten `fusionArchetypes` (je `pair`,
  `role`, `rarity`, `baseStats`, `passive`/`active`-Referenz).
- Element des Ergebnisses: gleiche Eltern-Elemente → dasselbe, sonst
  `elementCombos` (fire+water=steam, fire+nature=ash, nature+water=frost).
- Anzeigename = `namePrefixes[element]` + „-" + Archetypname („Aschen-Koloss").
- 9 der 21 Archetyp-Paare haben bewusst kein Rezept (Content-Reserve).
- Die frühere Regel „elemental" samt 21 Hybrid-Kreaturen ist entfernt.

## MVP-Subset

Aktiv im ersten Build (`mvp: true`):
`fire_drache` (Glutdrache), `nature_golem` (Moosgolem), `water_geist` (Quellgeist), `nature_wolf` (Dornwolf), `water_wyrm` (Seeschlange), `fire_greif` (Aschengreif).
