let timelineDatasets = [];
let timelineDropdown;
let timelineSelectedState = "Bayern";
let timelineParties = [];
let timelineYears = [2025, 2021, 2017];
let timelineTooltip = { show: false, content: "", x: 0, y: 0 };
let timelineP; // p5-Instanz für das Timeline-Chart

function getPartyColor(partyName) {
  // Finde den passenden Farbcode für die Partei
  const normalizedPartyName = partyName.toUpperCase();
  
  // Durchsuche die definierten Farben
  for (const [key, value] of Object.entries(partyColors)) {
    if (normalizedPartyName.includes(key.toUpperCase())) {
      return value;
    }
  }
  
  // Fallback für unbekannte Parteien
  return partyColors["Sonstige"];
}

function initializeTimeline(dataset) {
  timelineDatasets = dataset;

  // Erstelle natives HTML-Select für das Dropdown
  timelineDropdown = document.createElement('select');
  timelineDropdown.id = 'state-select';
  timelineDropdown.style.width = '200px';
  document.getElementById('timeline-dropdown').appendChild(timelineDropdown);
  window.timelineDropdown = timelineDropdown;
  timelineDropdown.addEventListener('change', () => {
  timelineSelectedState = timelineDropdown.value;
  // Aktualisiere die Visualisierung bei Änderung des Bundeslandes
  updateTimelineVisualization();
  // Wähle das Bundesland überall aus
  window.selectStateEverywhere(timelineSelectedState);
});

  // Bundesländer ins Dropdown einfügen
  const states = [
    "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen",
    "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen",
    "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen",
    "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"
  ];

  states.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    timelineDropdown.appendChild(option);
  });

  // Setze Standardwert und aktualisiere Visualisierung
  timelineDropdown.value = timelineSelectedState;

  // p5-Instanz initialisieren
  initTimelineP5();
  updateTimelineVisualization();
}

function initTimelineP5() {
  timelineP = new p5((p) => {
    p.setup = () => {
      // Canvas wird in drawTimelineChart erstellt
    };

    p.draw = () => {
      // Wird manuell aufgerufen
    };

    p.mouseMoved = () => {
      timelineTooltip.show = false;
      drawTimelineChart();
    };

    p.mouseClicked = () => {
      // Event-Handler bei Bedarf
    };
  }, document.getElementById('timeline-chart'));
}

function updateTimelineVisualization() {
  drawTimelineChart();
}

function drawTimelineChart() {
  if (!timelineP) return;

  // Daten für das ausgewählte Bundesland verarbeiten
  const stateData = timelineDatasets.map((dataset, index) =>
    dataset
      .filter(row => row.Gebietsname === timelineSelectedState &&
        row.Gebietsart === "Land" &&
        row.Gruppenart === "Partei")
      .map(row => ({ ...row, Jahr: timelineYears[index] }))
  );

  // Einzigartige Parteien und Jahre bestimmen
  timelineParties = [...new Set(stateData.flatMap(dataset => dataset.map(row => row.Gruppenname)))];
  const allYears = [...new Set(stateData.flatMap(dataset => dataset.map(row => row.Jahr)))].sort();

  // Timeline-Daten vorbereiten
  const timelineData = timelineParties.map(party => {
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
  }).filter(d => d.values.some(v => v.percent > 1)); // Nur Parteien mit >1%

  // Container-Größe holen
  const container = document.getElementById("timeline-chart");
  const width = container.offsetWidth;
  const height = container.offsetHeight - 70;

  // Canvas erstellen oder anpassen
  if (!timelineP.canvas) {
    timelineP.createCanvas(width, height + 50); // Extra Platz für Legende
  } else {
    timelineP.resizeCanvas(width, height + 50);
  }

  timelineP.background(255);

  // Margins und Skalen
  const margin = { top: 20, right: 20, bottom: 70, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // X-Skala (Jahre)
  const xScale = (year) => margin.left + chartWidth * (year - Math.min(...timelineYears)) / (Math.max(...timelineYears) - Math.min(...timelineYears));

  // Y-Skala (Prozent)
  const maxPercent = Math.max(...timelineData.flatMap(d => d.values.map(v => v.percent)), 10);
  const yScale = (percent) => height - margin.bottom - (percent / maxPercent * chartHeight);

  // Gitterlinien
  timelineP.stroke(200);
  timelineP.strokeWeight(0.5);

  // Horizontale Gitterlinien
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const yPos = yScale((maxPercent / yTicks) * i);
    timelineP.line(margin.left, yPos, width - margin.right, yPos);
  }

  // Vertikale Gitterlinien
  timelineYears.forEach(year => {
    const xPos = xScale(year);
    timelineP.line(xPos, margin.top, xPos, height - margin.bottom);
  });

  // Linien für jede Partei zeichnen
  timelineP.noFill();
  timelineData.forEach(partyData => {
    const color = getPartyColor(partyData.party);
    timelineP.stroke(...color);
    timelineP.strokeWeight(3);
    timelineP.beginShape();

    partyData.values.forEach(value => {
      timelineP.vertex(xScale(value.year), yScale(value.percent));
    });

    timelineP.endShape();
  });

  // Kreise für Datenpunkte
  timelineData.forEach(partyData => {
    const color = getPartyColor(partyData.party);
    timelineP.fill(...color);
    timelineP.stroke(255);
    timelineP.strokeWeight(1);

    partyData.values.forEach(value => {
      timelineP.circle(xScale(value.year), yScale(value.percent), 10);

      // Tooltip bei Mouseover
      if (timelineP.dist(timelineP.mouseX, timelineP.mouseY, xScale(value.year), yScale(value.percent)) < 6) {
        timelineP.fill(255);
        timelineP.circle(xScale(value.year), yScale(value.percent), 10);
        timelineP.fill(...color);
        timelineP.circle(xScale(value.year), yScale(value.percent), 6);

        timelineTooltip.content = `${partyData.party}
Jahr: ${value.year}
Prozent: ${value.percent.toFixed(2)}%`;
        timelineTooltip.x = timelineP.mouseX;
        timelineTooltip.y = timelineP.mouseY;
        timelineTooltip.show = true;
      }
    });
  });

  // Achsen zeichnen
  timelineP.stroke(0);
  timelineP.strokeWeight(1);

  // X-Achse
  timelineP.line(margin.left, height - margin.bottom, width - margin.right, height - margin.bottom);

  // Y-Achse
  timelineP.line(margin.left, margin.top, margin.left, height - margin.bottom);

  // X-Achsen-Beschriftung (Jahre)
  timelineP.textSize(12);
  timelineP.textAlign(timelineP.CENTER, timelineP.TOP);
  timelineP.fill(0);
  timelineP.noStroke();

  timelineYears.forEach(year => {
    timelineP.text(year, xScale(year), height - margin.bottom + 10);
  });

  // Y-Achsen-Beschriftung (Prozent)
  timelineP.textAlign(timelineP.RIGHT, timelineP.CENTER);
  for (let i = 0; i <= yTicks; i++) {
    const value = (maxPercent / yTicks) * i;
    timelineP.text(value.toFixed(1) + '%', margin.left - 10, yScale(value));
  }

  // Achsentitel
  timelineP.textSize(14);
  timelineP.textAlign(timelineP.CENTER, timelineP.TOP);
  timelineP.text("Jahre", width / 2, height - margin.bottom + 30);

  timelineP.push();
  timelineP.translate(margin.left - 40, height / 2);
  timelineP.rotate(-timelineP.HALF_PI);
  timelineP.text("Prozent", 0, 0);
  timelineP.pop();

  // Legende (nur Parteien mit >1%)
  const filteredParties = timelineData.filter(d => d.values.some(v => v.percent > 1));
  const legendX = margin.left;
  const legendY = height + 20;
  const legendItemWidth = 120;

  filteredParties.forEach((partyData, i) => {
    const color = getPartyColor(partyData.party);
    timelineP.fill(...color);
    timelineP.noStroke();
    timelineP.rect(legendX + i * legendItemWidth, legendY, 10, 10);

    timelineP.textSize(12);
    timelineP.textAlign(timelineP.LEFT, timelineP.TOP);
    timelineP.fill(0);
    timelineP.text(partyData.party, legendX + i * legendItemWidth + 15, legendY);
  });

  // Wichtige Ereignisse
  const events = [
    { year: 2023, label: "Heizungsgesetz" },
    { year: 2020, label: "Corona-Pandemie" }
  ];

  events.forEach(event => {
    timelineP.stroke(255, 0, 0);
    timelineP.strokeWeight(1);
    timelineP.drawingContext.setLineDash([4, 4]);
    timelineP.line(xScale(event.year), margin.top, xScale(event.year), height - margin.bottom);
    timelineP.drawingContext.setLineDash([]);

    timelineP.textSize(12);
    timelineP.textAlign(timelineP.LEFT, timelineP.TOP);
    timelineP.fill(255, 0, 0);
    timelineP.text(event.label, xScale(event.year) + 5, margin.top + 10);
  });

  // Tooltip zeichnen
  if (timelineTooltip.show) {
    drawTimelineTooltip();
  }
}

function drawTimelineTooltip() {
  if (!timelineP) return;

  const lines = timelineTooltip.content.split('\n');
  const lineHeight = 18;
  const padding = 10;
  timelineP.textSize(12);
  const maxWidth = Math.max(...lines.map(l => timelineP.textWidth(l))) + padding * 2;
  const tooltipHeight = lines.length * lineHeight + padding * 2;

  // Tooltip-Position (nicht aus dem Canvas laufen lassen)
  let x = timelineTooltip.x + 15;
  let y = timelineTooltip.y + 15;

  if (x + maxWidth > timelineP.width) x = timelineP.width - maxWidth - 5;
  if (y + tooltipHeight > timelineP.height) y = timelineP.height - tooltipHeight - 5;

  // Tooltip-Box
  timelineP.fill(255);
  timelineP.stroke(200);
  timelineP.strokeWeight(1);
  timelineP.rect(x, y, maxWidth, tooltipHeight, 5);

  // Tooltip-Text
  timelineP.fill(0);
  timelineP.noStroke();
  timelineP.textSize(12);
  timelineP.textAlign(timelineP.LEFT, timelineP.TOP);

  for (let i = 0; i < lines.length; i++) {
    timelineP.text(lines[i], x + padding, y + padding + i * lineHeight);
  }
}