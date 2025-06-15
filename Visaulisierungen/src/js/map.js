function initializeMap(data) {
    const container = document.getElementById("map");
    const width = container.offsetWidth; // Dynamische Breite des Containers
    const height = container.offsetHeight -70 ;

    // SVG erstellen (responsiv)
    const svg = d3.select("#map")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%") // Passt sich an die Breite des Containers an
        .style("height", "auto"); // Höhe wird automatisch angepasst

    // Tooltip erstellen
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#ffffff") // Weißer Hintergrund
        .style("color", "#333") // Dunkler Text
        .style("padding", "10px")
        .style("border-radius", "8px")
        .style("box-shadow", "0px 4px 10px rgba(0, 0, 0, 0.3)")
        .style("border", "1px solid #ccc")
        .style("pointer-events", "none")
        .style("display", "none");

    // Projektion definieren
    const projection = d3.geoMercator()
        .center([10.5, 51.3]) // Deutschland zentrieren
        .scale(2100) // Skalierung anpassen
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // GeoJSON-Daten laden
    d3.json("data/germany_states.geojson").then(geoData => {
        // Polarisierungsindex berechnen
        const polarization = {};
        const partyData = {}; // Speichert die Parteien-Daten für jedes Bundesland

        data.forEach(row => {
            const state = row.Gebietsname.trim();
            const percent = parseFloat(row.Prozent.replace(",", "."));
            if (isNaN(percent)) {
                return;
            }
            if (!polarization[state]) polarization[state] = 0;
            polarization[state] += Math.pow(percent / 100, 2);

            // Parteien-Daten speichern
            if (!partyData[state]) partyData[state] = [];
            partyData[state].push({ party: row.Gruppenname, percent });
        });

        for (let state in polarization) {
            polarization[state] = 1 - polarization[state];
        }

        // Parteien-Daten sortieren
        for (let state in partyData) {
            partyData[state].sort((a, b) => b.percent - a.percent); // Absteigend sortieren
        }

        const color = d3.scaleSequential()
            .domain(d3.extent(Object.values(polarization))) // Wertebereich der Polarization
            .interpolator(d3.interpolateRdBu) // Farbskala von Rot bis Blau
            .unknown("#ccc"); // Standardfarbe für unbekannte Werte

        // Farbskala invertieren (Blau = niedrig, Rot = hoch)
        const invertedColor = t => color(1 - t);

        // Karte zeichnen
        svg.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => {
                const stateName = d.properties.name.trim(); // Leerzeichen entfernen
                const polarizationValue = polarization[stateName];
                return polarizationValue !== undefined ? invertedColor((polarizationValue - d3.min(Object.values(polarization))) / (d3.max(Object.values(polarization)) - d3.min(Object.values(polarization)))) : "#ccc";
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .on("mouseover", (event, d) => {
                const stateName = d.properties.name.trim();
                const polarizationValue = polarization[stateName];
                const topParties = partyData[stateName]?.slice(0, 3) || [];

                // Tooltip-Inhalt erstellen
                let tooltipContent = `<div style="font-size: 16px; font-weight: bold;">${stateName}</div>`;
                tooltipContent += `<hr style="margin: 5px 0; border: 0; border-top: 1px solid #ccc;">`;
                tooltipContent += `<div style="font-size: 14px;">Polarisierungsindex: <strong>${polarizationValue !== undefined ? polarizationValue.toFixed(2) : "Keine Daten"}</strong></div>`;
                tooltipContent += `<hr style="margin: 5px 0; border: 0; border-top: 1px solid #ccc;">`;
                tooltipContent += `<div style="font-size: 14px;">Top 3 Parteien:</div>`;
                topParties.forEach(party => {
                    tooltipContent += `<div style="font-size: 13px;">${party.party}: ${party.percent.toFixed(2)}%</div>`;
                });

                tooltip.html(tooltipContent)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY + 15) + "px")
                    .style("display", "block");
            })
            .on("mousemove", event => {
                tooltip.style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY + 15) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("display", "none");
            })
            .on("click", (event, d) => {
                const stateName = d.properties.name.trim();
                console.log(`Bundesland geklickt: ${stateName}`);

                // Andere Diagramme aktualisieren
                updateProfile(stateName); // Profile aktualisieren
                updateTimeline(stateName,"Insgesamt"); // Timeline aktualisieren
            });
            // Legende hinzufügen
        const legendWidth = container.offsetWidth - 50; // Breite der Legende
        const legendHeight = 30;

        const legendSvg = d3.select("#map")
            .append("svg")
            .attr("width", legendWidth)
            .attr("height", legendHeight + 30) 
            .attr("id", "legend");

        const legendScale = d3.scaleLinear()
            .domain(d3.extent(Object.values(polarization)))
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5)
            .tickFormat(d3.format(".2f"));

        const gradient = legendSvg.append("defs")
            .append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", color(1)); // Blau (niedrig)

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", color(0)); // Rot (hoch)

        legendSvg.append("rect")
            .attr("x", 25)
            .attr("y", 10)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)");

        legendSvg.append("g")
            .attr("transform", `translate(25, ${10 + legendHeight})`)
            .call(legendAxis);
    }).catch(error => {
        console.error("Fehler beim Laden der GeoJSON-Daten:", error);
    });
}