let datasets = [];
let dropdown_t;

function initializeTimeline(dataset) {
    datasets = dataset;
    console.log("Daten für Timeline (separat):", datasets);
  
    // Dropdown-Menü erstellen
    dropdown_t = d3.select("#timeline-dropdown")
      .append("select")
      .attr("id", "state-select")
      .style("width", "200px")
      .on("change", function () {
        const selectedState = this.value;
        updateTimeline(selectedState);
        updateProfile(selectedState); // Profile aktualisieren
      });
  
    // Bundesländer aus den Daten extrahieren
    const states = [
        "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen",
        "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen",
        "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen",
        "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"
      ];

    // Dropdown-Optionen hinzufügen
    dropdown_t.selectAll("option")
      .data(states)
      .enter()
      .append("option")
      .attr("value", d => d)
      .text(d => d);
  
    // Standardwert auf "Bayern" setzen und Timeline aktualisieren
    dropdown_t.property("value", "Bayern");
    updateTimeline("Bayern");
  }
  
  function updateTimeline(state) {
    console.log("Aktueller State:", state);
    dropdown_t.property("value", state);
  
    // Füge jedem Datensatz das entsprechende Jahr hinzu
    const years = [2025, 2021, 2017]; // Jahre in der Reihenfolge der Datensätze
    const stateData = datasets.map((dataset, index) =>
      dataset
        .filter(row => row.Gebietsname === state && row.Gebietsart === "Land" && row.Gruppenart === "Partei")
        .map(row => ({ ...row, Jahr: years[index] })) // Jahr hinzufügen
    );
  
    console.log("Gefilterte Daten für Timeline mit Jahr:", stateData);
  
    // Parteien und Jahre extrahieren
    const parties = [...new Set(stateData.flatMap(dataset => dataset.map(row => row.Gruppenname)))];
    const allYears = [...new Set(stateData.flatMap(dataset => dataset.map(row => row.Jahr)))].sort();
  
    // Timeline-Daten erstellen
    const timelineData = parties.map(party => {
      return {
        party: party,
        values: allYears.map(year => {
          const entry = stateData.flatMap(dataset =>
            dataset.find(row => row.Gruppenname === party && row.Jahr === year)
          ).find(Boolean);
  
          const percent = entry ? parseFloat(entry.Prozent) : 0;
  
          return {
            year: year,
            percent: isNaN(percent) ? 0 : percent
          };
        })
      };
    }).filter(d => d.values.some(v => v.percent > 1)); // Nur Parteien mit mehr als 1%
  
    console.log("Timeline-Daten:", timelineData);
  
    // Container-Dimensionen
    const container = document.getElementById("timeline-chart");
    const width = container.offsetWidth;
    const height = container.offsetHeight - 70;
  
    // SVG erstellen
    const svg = d3.select("#timeline-chart").html("").append("svg")
      .attr("viewBox", `0 0 ${width} ${height + 50}`) // Platz für die Legende unter dem Diagramm
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto");
  
    // Skalen definieren
    const x = d3.scaleLinear()
      .domain(d3.extent(allYears))
      .range([50, width - 20]); // Platz für Y-Achse und Padding
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(timelineData.flatMap(d => d.values.map(v => v.percent)))]).nice()
      .range([height - 50, 20]); // Platz für Achsentitel
  
    // Farbskala
    const color = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(parties);
  
    // Tooltip erstellen
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#ffffff")
      .style("color", "#333")
      .style("padding", "10px")
      .style("border-radius", "8px")
      .style("box-shadow", "0px 4px 10px rgba(0, 0, 0, 0.3)")
      .style("border", "1px solid #ccc")
      .style("pointer-events", "none")
      .style("display", "none");
  
    // Linien zeichnen
    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.percent));
  
    svg.selectAll(".line")
      .data(timelineData)
      .enter()
      .append("path")
      .attr("class", "line")
      .attr("d", d => line(d.values))
      .attr("fill", "none")
      .attr("stroke", d => color(d.party))
      .attr("stroke-width", 3) // Dickere Linien
      .on("mouseover", (event, d) => {
        tooltip.html(`<strong>${d.party}</strong>`)
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
  
    // Markierungen hinzufügen
    timelineData.forEach(partyData => {
      svg.selectAll(`.circle-${partyData.party}`)
        .data(partyData.values)
        .enter()
        .append("circle")
        .attr("class", `circle-${partyData.party}`)
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.percent))
        .attr("r", 5) // Radius der Markierung
        .attr("fill", color(partyData.party))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .on("mouseover", (event, d) => {
          tooltip.html(`<strong>${partyData.party}</strong><br>Jahr: ${d.year}<br>Prozent: ${d.percent.toFixed(2)}%`)
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
    });
  
    // X-Achse
    svg.append("g")
      .attr("transform", `translate(0,${height - 50})`)
      .call(d3.axisBottom(x)
        .tickValues(years) // Nur Wahljahre anzeigen
        .tickFormat(d3.format("d")));
  
    // Y-Achse
    svg.append("g")
      .attr("transform", "translate(50,0)")
      .call(d3.axisLeft(y));
  
    // Achsentitel
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Jahre");
  
    svg.append("text")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Prozent");
  
    // Legende hinzufügen (unter dem Diagramm)
    const legend = svg.append("g")
      .attr("transform", `translate(50, ${height})`); // Position unter dem Diagramm
  
    // Filterung der Parteien mit mehr als 1%
    const filteredParties = timelineData.filter(d => d.values.some(v => v.percent > 1));
  
    filteredParties.forEach((d, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(${i * 120}, 0)`); // Dynamischer Abstand zwischen den Einträgen
  
      legendRow.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", color(d.party));
  
      legendRow.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .text(d.party);
    });
  
    // Wichtige Ereignisse hinzufügen
    const events = [
      { year: 2023, label: "Heizungsgesetz" },
      { year: 2020, label: "Corona-Pandemie" }
    ];
  
    events.forEach(event => {
      svg.append("line")
        .attr("x1", x(event.year))
        .attr("x2", x(event.year))
        .attr("y1", 20)
        .attr("y2", height - 50)
        .attr("stroke", "red")
        .attr("stroke-dasharray", "4");
  
      svg.append("text")
        .attr("x", x(event.year) + 5)
        .attr("y", 30)
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .style("fill", "red")
        .text(event.label);
    });
  }