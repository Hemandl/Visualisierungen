let globalData = [];
let strukturdaten = [];
let dropdownState, dropdownWahlkreis, dropdownAgeGroup;

function initializeProfile(data, strukturData) {
  globalData = data;
  strukturdaten = strukturData;

  // Bundesländer extrahieren
  const bundeslaender = [...new Set(strukturdaten.map(row => row.Land).filter(l => l && l !== "Deutschland"))].sort();

  // Altersgruppen aus den Spaltennamen extrahieren 
  const altersgruppen = [
     "18-24 (%)", "25-34 (%)", "35-59 (%)", "60-74 (%)", "75 und mehr (%)"
  ];

  // Dropdown für Bundesland
  dropdownState = d3.select("#profile-dropdown")
    .append("select")
    .attr("id", "state-select")
    .on("change", function () {
      updateWahlkreisDropdown(this.value);
      updateProfile(this.value);
      updateTimeline(this.value); 
    });

  dropdownState.selectAll("option")
    .data(bundeslaender)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  // Dropdown für Wahlkreis
  dropdownWahlkreis = d3.select("#profile-dropdown")
    .append("select")
    .attr("id", "wahlkreis-select")
    .style("margin-left", "10px")
    .on("change", function () {
      updateProfile(dropdownState.property("value"))
    });

  // Dropdown für Altersgruppe
  dropdownAgeGroup = d3.select("#profile-dropdown")
    .append("select")
    .attr("id", "age-group-select")
    .style("margin-left", "10px")
    .on("change", function () {
      updateProfile(dropdownState.property("value"))
  });

  dropdownAgeGroup.selectAll("option")
    .data(altersgruppen)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  // Initiale Dropdowns setzen: Bayern, erster Wahlkreis, erste Altersgruppe
  dropdownState.property("value", "Bayern");
  updateWahlkreisDropdown("Bayern");
  dropdownAgeGroup.property("value", altersgruppen[0]);
  updateProfile("Bayern");
}

function updateWahlkreisDropdown(selectedLand) {
  // Wahlkreise für das gewählte Bundesland extrahieren
  const wahlkreise = strukturdaten
    .filter(row => row.Land === selectedLand)
    .map(row => row["Wahlkreis-Name"])
    .filter(Boolean)
    .sort();

  dropdownWahlkreis.selectAll("option").remove();
  dropdownWahlkreis.selectAll("option")
    .data(wahlkreise)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  dropdownWahlkreis.property("value", wahlkreise[0]);
}

function updateProfile(state) {
  if (state != dropdownState.property("value")){
    updateWahlkreisDropdown(state);
  }
  const selectedLand = state || dropdownState.property("value");
  dropdownState.property("value", selectedLand);
  const selectedWahlkreis = dropdownWahlkreis.property("value");
  const selectedAgeGroup = dropdownAgeGroup.property("value");

  // Debug-Ausgabe der Auswahl
  console.log("Auswahl:", {selectedLand, selectedWahlkreis, selectedAgeGroup});

  // Strukturdatensatz für die Auswahl holen
  const struktur = strukturdaten.find(row =>
    row.Land === selectedLand && row["Wahlkreis-Name"] === selectedWahlkreis
  );

  // Debug-Ausgabe der gefundenen Strukturdaten
  console.log("Strukturdaten:", struktur);

  let agePercent = 0;
  let wahlberechtigte = 0;
  
  if (struktur) {
    // Finde die richtige Spalte für die ausgewählte Altersgruppe
    const ageGroupColumn = Object.keys(struktur).find(
      k => k.includes("Alter von") && k.includes(selectedAgeGroup.replace(" (%)", ""))
    );
    
    // Debug-Ausgabe der gefundenen Altersgruppenspalte
    console.log("Altersgruppenspalte:", ageGroupColumn, "Wert:", struktur[ageGroupColumn]);

    if (ageGroupColumn && struktur[ageGroupColumn]) {
      agePercent = parseFloat(struktur[ageGroupColumn].toString().replace(",", "."));
      if (isNaN(agePercent)) {
        console.error("Ungültiger Altersgruppenwert:", struktur[ageGroupColumn]);
        agePercent = 0;
      }
    }

    // Berechnung der wahlberechtigten Deutschen
    if (struktur['Bevölkerung am 31.12.2023 - Deutsche (in 1000)']) {
      const deutscheStr = struktur['Bevölkerung am 31.12.2023 - Deutsche (in 1000)']
        .toString()
        .replace(/\./g, "") // Entferne Tausendertrennzeichen
        .replace(",", "."); // Ersetze Komma durch Punkt für parseFloat
      
      const deutsche = parseFloat(deutscheStr) * 1000;
      
      if (struktur['Alter von ... bis ... Jahren am 31.12.2023 - unter 18 (%)']) {
        const unter18Str = struktur['Alter von ... bis ... Jahren am 31.12.2023 - unter 18 (%)']
          .toString()
          .replace(",", ".");
        const unter18Prozent = parseFloat(unter18Str);

        if (!isNaN(deutsche) && !isNaN(unter18Prozent)) {
          wahlberechtigte = Math.round(deutsche * (1 - unter18Prozent / 100));
        }
      }
    }
  }

  // Debug-Ausgabe der berechneten Werte
  console.log("Berechnete Werte:", {
    agePercent,
    wahlberechtigte
  });

  // Parteien-Daten für den Wahlkreis filtern
  const wahlkreisData = globalData.filter(row =>
    row.Gebietsname === selectedWahlkreis && row.Gruppenart === "Partei"
  );
  
  const parteiDatenRaw = wahlkreisData.length ? wahlkreisData : globalData.filter(row =>
    row.Gebietsname === selectedLand && row.Gruppenart === "Partei"
  );

  // Debug-Ausgabe der gefundenen Parteidaten
  console.log("Anzahl Parteidaten:", parteiDatenRaw.length);

  // Nur eine Zeile pro Partei
  const parteiDaten = Array.from(
    parteiDatenRaw.reduce((map, row) => {
      if (!map.has(row.Gruppenname)) map.set(row.Gruppenname, row);
      return map;
    }, new Map()).values()
  );

  // Berechne geschätzte Stimmen pro Partei in der Altersgruppe
  let parteiStimmen = parteiDaten.map(row => {
    let parteiProzent = 0;
    if (row.Prozent) {
      parteiProzent = parseFloat(row.Prozent.toString().replace(",", "."));
      if (isNaN(parteiProzent)) {
        console.error("Ungültiger Prozentwert für Partei:", row.Gruppenname, "Wert:", row.Prozent);
        parteiProzent = 0;
      }
    }

    const anteilAltersgruppe = agePercent / 100;
    const parteiStimmenAnteil = parteiProzent / 100;

    const geschaetzteStimmen = wahlberechtigte * anteilAltersgruppe * parteiStimmenAnteil;
    
    return {
      party: row.Gruppenname,
      parteiProzent: parteiProzent,
      geschaetzteStimmen: isNaN(geschaetzteStimmen) ? 0 : geschaetzteStimmen
    };
  });

  // Berechne Gesamtstimmen in der Altersgruppe (Summe aller Parteien)
  const gesamtStimmenAltersgruppe = parteiStimmen.reduce(
    (sum, d) => sum + (isNaN(d.geschaetzteStimmen) ? 0 : d.geschaetzteStimmen), 0
  );

  // Debug-Ausgabe der Stimmenberechnung
  console.log("Gesamtstimmen in Altersgruppe:", gesamtStimmenAltersgruppe);
  console.log("Partei Stimmen vor Filterung:", parteiStimmen);

  // Berechne den Anteil jeder Partei an den Stimmen in der Altersgruppe
  parteiStimmen = parteiStimmen
    .map(d => ({
      ...d,
      anteilInAltersgruppe: gesamtStimmenAltersgruppe > 0 
        ? (d.geschaetzteStimmen / gesamtStimmenAltersgruppe) * 100 
        : 0
    }))
    .filter(d => d.anteilInAltersgruppe > 1); // Filtere kleine Parteien heraus

  // Debug-Ausgabe der finalen Daten
  console.log("Finale Parteistimmen:", parteiStimmen);


  // --- D3-Visualisierung ---
const container = document.getElementById("profile-chart");
const width = container.offsetWidth;
const height = container.offsetHeight;

// Prüfe, ob es überhaupt Balken gibt
if (!parteiStimmen.length || !agePercent || !wahlberechtigte) {
  d3.select("#profile-chart").html('<div style="color:#888;text-align:center;padding:2em;">Keine Daten für diese Auswahl vorhanden.</div>');
  return;
}

const svg = d3.select("#profile-chart").html("").append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("width", "100%")
  .style("height", "auto");

const x = d3.scaleBand()
  .domain(parteiStimmen.map(d => d.party))
  .range([50, width - 20])
  .padding(0.2);

const y = d3.scaleLinear()
  .domain([0, d3.max(parteiStimmen, d => d.geschaetzteStimmen)]).nice()
  .range([height - 50, 20]);

const color = d3.scaleSequential()
  .domain([0, d3.max(parteiStimmen, d => d.geschaetzteStimmen)])
  .interpolator(d3.interpolateBlues);

// Tooltip erstellen
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background", "#fff")
  .style("color", "#222")
  .style("padding", "12px")
  .style("border-radius", "8px")
  .style("box-shadow", "0px 4px 10px rgba(0, 0, 0, 0.3)")
  .style("border", "1px solid #ccc")
  .style("pointer-events", "none")
  .style("display", "none");

svg.selectAll(".bar")
  .data(parteiStimmen)
  .enter()
  .append("rect")
  .attr("class", "bar")
  .attr("x", d => x(d.party))
  .attr("y", d => y(d.geschaetzteStimmen))
  .attr("width", x.bandwidth())
  .attr("height", d => height - 50 - y(d.geschaetzteStimmen))
  .attr("fill", d => color(d.geschaetzteStimmen))
  .attr("rx", 5)
  .on("mouseover", (event, d) => {
    tooltip.html(
      `<div style="font-size:16px;font-weight:bold;">${d.party}</div>
      <hr style="margin:6px 0 6px 0;">
      <div><b>Geschätzte Stimmen in Altersgruppe:</b> ${Math.round(d.geschaetzteStimmen).toLocaleString()}</div>
      <div><b>Stimmenanteil Partei im Land:</b> ${d.parteiProzent.toFixed(2)} %</div>
      <div><b>Stimmenanteil in Altersgruppe:</b> ${d.anteilInAltersgruppe.toFixed(2)} %</div>
      <hr style="margin:6px 0 6px 0;">
      <div style="font-size:11px;color:#888;">
      Hinweis: Nur deutsche Bevölkerung ab 18 Jahren berücksichtigt. Parteien unter 1 % werden ausgeblendet.</div>`
    )
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY + 10) + "px")
      .style("display", "block");
  })
  .on("mousemove", event => {
    tooltip.style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY + 10) + "px");
  })
  .on("mouseout", () => {
    tooltip.style("display", "none");
  });

svg.append("g")
  .attr("transform", `translate(0,${height - 50})`)
  .call(d3.axisBottom(x))
  .selectAll("text")
  .attr("transform", "rotate(-45)")
  .style("text-anchor", "end");

svg.append("g")
  .attr("transform", "translate(50,0)")
  .call(d3.axisLeft(y).tickFormat(d => Math.round(d).toLocaleString()));

svg.append("text")
  .attr("x", width / 2)
  .attr("y", height - 10)
  .style("text-anchor", "middle")
  .text(`Geschätzte Stimmen je Partei in ${selectedWahlkreis}, ${selectedLand}, Altersgruppe: ${selectedAgeGroup}`);
}