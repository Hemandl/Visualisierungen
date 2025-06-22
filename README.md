# Bundestagswahl 2025 – Interaktive Analyse

Eine datengetriebene Webanwendung zur Visualisierung von Wahlergebnissen und demografischen Mustern der Bundestagswahl 2025.

## Projektstruktur

### Kern-Dateien
| Datei          | Funktion                                                                 |
|----------------|--------------------------------------------------------------------------|
| `index.html`   | Haupt-HTML-Struktur mit 3 Sektionen: Karte, Wählerprofile, Zeitverlauf  |
| `style.css`    | Globales Styling mit responsive Design, Farbverläufen und Animationen   |
| `main.js`      | Datenlade-Logik mit PapaParse und Initialisierung aller Module          |

### Visualisierungsmodule
| Modul          | Funktion                                                                 |
|----------------|--------------------------------------------------------------------------|
| `map.js`       | **Interaktive Deutschlandkarte** mit Polarisierungsindex pro Bundesland  |
| `profile.js`   | **Wählerprofile** mit Demografie-Dropdowns und Balkendiagrammen         |
| `timeline.js`  | **Zeitreihen-Analyse** mit Parteientwicklung (2017-2025)                |

### Datenverzeichnis (`/data`)
| Datei                          | Inhalt                                       |
|--------------------------------|----------------------------------------------|
| `germany_states.geojson`       | Geografische Grenzen der Bundesländer        |
| `kerg2.csv`                    | Wahlergebnisse 2025 (Landes- und Kreisebene) |
| `kerg2_2021.csv`               | Wahlergebnisse 2021 (historischer Vergleich) |
| `kerg2_2017.csv`               | Wahlergebnisse 2017 (historischer Vergleich) |
| `btw2025_strukturdaten.csv`    | Demografiedaten (Altersgruppen, Bevölkerung)|


## Datenquellen
Wahlergebnisse: Bundeswahlleiter (Datenlizenz Deutschland 2.0)

Geodaten: GeoBasis-DE / BKG 2025

Bevölkerungsdaten: Statistisches Bundesamt
