document.addEventListener("DOMContentLoaded", () => {
    const fileUrls = ["data/kerg2.csv"]; // Datei für Map und Profile
    const strukturFileUrl = "data/btw2025_strukturdaten.csv"; // Datei für Struktur-/Altersgruppen
    const timelineFileUrls = ["data/kerg2.csv", "data/kerg2_2021.csv", "data/kerg2.csv"]; // Dateien für Timeline

    // Funktion zum Laden und Parsen einer Datei
    const loadFile = (url) => {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                delimiter: ";",
                complete: function (results) {
                    console.log(`Geladene CSV-Daten von ${url}:`, results.data);
                    resolve(results.data);
                },
                error: function (error) {
                    console.error(`Fehler beim Laden der Datei ${url}:`, error);
                    reject(error);
                },
            });
        });
    };

    // Funktion zum Laden und Parsen mehrerer Dateien
    const loadFiles = (urls) => {
        return Promise.all(urls.map((url) => loadFile(url)));
    };

    // Datei für Map und Profile + Struktur-/Altersgruppen laden
    Promise.all([loadFile(fileUrls[0]), loadFile(strukturFileUrl)])
        .then(([data, strukturData]) => {
            // Daten filtern
            const filteredData = data.filter(
                (row) => row["Gebietsart"] === "Land" && row["Gruppenart"] === "Partei"
            );
            console.log("Gefilterte Daten für Map und Profile:", filteredData);
            console.log("Strukturdaten (inkl. Altersgruppen):", strukturData);

            // Initialisierungen für Map und Profile
            initializeMap(filteredData);
            initializeProfile(filteredData, strukturData);
        })
        .catch((error) => {
            console.error("Fehler beim Laden der Datei für Map/Profile oder Struktur/Altersgruppen:", error);
        });

    // Dateien für Timeline laden
    loadFiles(timelineFileUrls)
        .then((datasets) => {
            console.log("Daten für Timeline:", datasets);

            // Initialisierung für Timeline
            initializeTimeline(datasets);
        })
        .catch((error) => {
            console.error("Fehler beim Laden der Dateien für Timeline:", error);
        });
});