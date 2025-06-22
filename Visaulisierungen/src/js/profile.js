let profileData = [];
let profileStrukturdaten = [];
let profileDropdownState, profileDropdownWahlkreis, profileDropdownAgeGroup;
let profileParteiStimmen = [];
let profileSelectedLand = "Bayern";
let profileSelectedWahlkreis = "";
let profileSelectedAgeGroup = "18-24 (%)";
let profileTooltip = { show: false, content: "", x: 0, y: 0 };
let profileP; // p5-Instanz für das Profil-Chart

// Parteifarben definieren
const partyColors = {
  "CDU": [0, 0, 0],          // Schwarz
  "SPD": [224, 60, 49],      // Rot
  "GRÜNE": [100, 161, 45], // Grün
  "FDP": [255, 237, 0],      // Gelb
  "AfD": [0, 158, 224],      // Blau
  "DIE LINKE": [207, 0, 116],// Pink
  "CSU": [0, 56, 147],       // Dunkelblau
  "FREIE WÄHLER": [243, 146, 0], // Orange
  "BSW": [150, 0, 0],        // Dunkelrot
  "Sonstige": [150, 150, 150]// Grau
};

function initializeProfile(data, strukturData) {
  profileData = data;
  profileStrukturdaten = strukturData;

  // Bundesländer extrahieren
  const bundeslaender = [...new Set(profileStrukturdaten.map(row => row.Land).filter(l => l && l !== "Deutschland"))].sort();

  // Altersgruppen aus den Spaltennamen extrahieren 
  const altersgruppen = [
    "18-24 (%)", "25-34 (%)", "35-59 (%)", "60-74 (%)", "75 und mehr (%)"
  ];

  // Dropdown für Bundesland 
  profileDropdownState = document.createElement('select');
  profileDropdownState.id = 'state-select';
  document.getElementById('profile-dropdown').appendChild(profileDropdownState);
  window.profileDropdown = profileDropdownState;
  profileDropdownState.addEventListener('change', () => {
  if (profileSelectedLand !== profileDropdownState.value) {
    profileSelectedLand = profileDropdownState.value;
    updateProfileWahlkreisDropdown();
    updateProfileVisualization();
    window.selectStateEverywhere(profileSelectedLand);
  }
});
  bundeslaender.forEach(land => {
    const option = document.createElement('option');
    option.value = land;
    option.textContent = land;
    profileDropdownState.appendChild(option);
  });

  // Dropdown für Wahlkreis 
  profileDropdownWahlkreis = document.createElement('select');
  profileDropdownWahlkreis.id = 'wahlkreis-select';
  profileDropdownWahlkreis.style.marginLeft = '10px';
  document.getElementById('profile-dropdown').appendChild(profileDropdownWahlkreis);
  profileDropdownWahlkreis.addEventListener('change', () => {
    profileSelectedWahlkreis = profileDropdownWahlkreis.value;
    updateProfileVisualization();
  });

  // Dropdown für Altersgruppe 
  profileDropdownAgeGroup = document.createElement('select');
  profileDropdownAgeGroup.id = 'age-group-select';
  profileDropdownAgeGroup.style.marginLeft = '10px';
  document.getElementById('profile-dropdown').appendChild(profileDropdownAgeGroup);
  profileDropdownAgeGroup.addEventListener('change', () => {
    profileSelectedAgeGroup = profileDropdownAgeGroup.value;
    updateProfileVisualization();
  });
  altersgruppen.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    profileDropdownAgeGroup.appendChild(option);
  });

  // Initiale Werte setzen
  profileDropdownState.value = profileSelectedLand;
  updateProfileWahlkreisDropdown();
  profileDropdownAgeGroup.value = profileSelectedAgeGroup;
  
  // p5-Instanz initialisieren
  initProfileP5();
  updateProfileVisualization();
}

function initProfileP5() {
  // p5.js im Instanzmodus initialisieren
  profileP = new p5((p) => {
    p.setup = () => {
      // Canvas wird in drawProfileChart erstellt
    };

    p.draw = () => {
      // Wird manuell aufgerufen
    };

    p.mouseMoved = () => {
      profileTooltip.show = false;
      drawProfileChart();
    };

    p.mouseClicked = () => {
      // Event-Handler bei Bedarf
    };
  }, document.getElementById('profile-chart'));
}

function updateProfileWahlkreisDropdown() {
  // Wahlkreise für das gewählte Bundesland extrahieren
  const wahlkreise = profileStrukturdaten
    .filter(row => row.Land === profileSelectedLand)
    .map(row => row["Wahlkreis-Name"])
    .filter(Boolean)
    .sort();

  // Dropdown leeren und neu füllen
  profileDropdownWahlkreis.innerHTML = '';
  wahlkreise.forEach(kreis => {
    const option = document.createElement('option');
    option.value = kreis;
    option.textContent = kreis;
    profileDropdownWahlkreis.appendChild(option);
  });

  if (wahlkreise.length > 0) {
    profileSelectedWahlkreis = wahlkreise[0];
    profileDropdownWahlkreis.value = profileSelectedWahlkreis;
  }
}

function updateProfileVisualization() {
  // Strukturdatensatz für die Auswahl holen
  const struktur = profileStrukturdaten.find(row =>
    row.Land === profileSelectedLand && row["Wahlkreis-Name"] === profileSelectedWahlkreis
  );

  let agePercent = 0;
  let wahlberechtigte = 0;
  
  if (struktur) {
    // Finde die richtige Spalte für die ausgewählte Altersgruppe (robust)
    const ageGroupColumn = Object.keys(struktur).find(
      k => k.replace(/\s/g, '').includes(profileSelectedAgeGroup.replace(/\s/g, ''))
    );
    
    if (ageGroupColumn && struktur[ageGroupColumn]) {
      agePercent = parseFloat(struktur[ageGroupColumn].toString().replace(",", "."));
      if (isNaN(agePercent)) agePercent = 0;
    }

    // Berechnung der wahlberechtigten Deutschen
    if (struktur['Bevölkerung am 31.12.2023 - Deutsche (in 1000)']) {
      const deutscheStr = struktur['Bevölkerung am 31.12.2023 - Deutsche (in 1000)']
        .toString()
        .replace(/\./g, "")
        .replace(",", ".");
      
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

  // Parteien-Daten für den Wahlkreis filtern
  const wahlkreisData = profileData.filter(row =>
    row.Gebietsname === profileSelectedWahlkreis && row.Gruppenart === "Partei"
  );
  
  const parteiDatenRaw = wahlkreisData.length ? wahlkreisData : profileData.filter(row =>
    row.Gebietsname === profileSelectedLand && row.Gruppenart === "Partei"
  );

  // Nur eine Zeile pro Partei
  const parteiDaten = Array.from(
    parteiDatenRaw.reduce((map, row) => {
      if (!map.has(row.Gruppenname)) map.set(row.Gruppenname, row);
      return map;
    }, new Map()).values()
  );

  // Berechne geschätzte Stimmen pro Partei in der Altersgruppe
  profileParteiStimmen = parteiDaten.map(row => {
    let parteiProzent = 0;
    if (row.Prozent) {
      parteiProzent = parseFloat(row.Prozent.toString().replace(",", "."));
      if (isNaN(parteiProzent)) parteiProzent = 0;
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

  // Berechne Gesamtstimmen in der Altersgruppe
  const gesamtStimmenAltersgruppe = profileParteiStimmen.reduce(
    (sum, d) => sum + (isNaN(d.geschaetzteStimmen) ? 0 : d.geschaetzteStimmen), 0
  );

  // Berechne den Anteil jeder Partei an den Stimmen in der Altersgruppe
  profileParteiStimmen = profileParteiStimmen
    .map(d => ({
      ...d,
      anteilInAltersgruppe: gesamtStimmenAltersgruppe > 0 
        ? (d.geschaetzteStimmen / gesamtStimmenAltersgruppe) * 100 
        : 0
    }))
    .filter(d => d.anteilInAltersgruppe > 1); // Filtere kleine Parteien heraus

  drawProfileChart();
}

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

function drawProfileChart() {
  if (!profileP) return;
  
  const container = document.getElementById("profile-chart");
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  
  // Canvas erstellen oder anpassen
  if (!profileP.canvas) {
    profileP.createCanvas(width, height);
  } else {
    profileP.resizeCanvas(width, height);
  }
  
  profileP.background(255);
  
  // Check if we have data to display
  if (!profileParteiStimmen.length) {
    profileP.fill(100);
    profileP.noStroke();
    profileP.textSize(16);
    profileP.textAlign(profileP.CENTER, profileP.CENTER);
    profileP.text("Keine Daten für diese Auswahl vorhanden", width/2, height/2);
    return;
  }
  
  // Set up scales
  const margin = { top: 20, right: 20, bottom: 70, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  const x = profileParteiStimmen.map(d => d.party);
  const y = profileParteiStimmen.map(d => d.geschaetzteStimmen);
  const maxY = Math.max(...y, 1);
  
  // X scale (band scale for parties)
  const xScale = (index) => margin.left + (index * chartWidth / x.length) + (chartWidth / x.length / 2);
  const barWidth = chartWidth / x.length * 0.8;
  
  // Y scale (linear for values)
  const yScale = (value) => height - margin.bottom - (value / maxY * chartHeight);
  
  // Draw bars
  for (let i = 0; i < profileParteiStimmen.length; i++) {
    const d = profileParteiStimmen[i];
    const xPos = xScale(i) - barWidth/2;
    const yPos = yScale(d.geschaetzteStimmen);
    const barHeight = height - margin.bottom - yPos;
    
    // Parteispezifische Farbe verwenden
    const partyColor = getPartyColor(d.party);
    
    profileP.fill(...partyColor);
    profileP.stroke(200);
    profileP.strokeWeight(1);
    
    // Draw bar with rounded corners
    profileP.rect(xPos, yPos, barWidth, barHeight, 5);
    
    // Check if mouse is over this bar
    if (profileP.mouseX > xPos && profileP.mouseX < xPos + barWidth && 
        profileP.mouseY > yPos && profileP.mouseY < yPos + barHeight) {
      // Highlight bar (hellere Farbe)
      const highlightColor = partyColor.map(c => Math.min(c + 70, 255));
      profileP.fill(...highlightColor);
      profileP.rect(xPos, yPos, barWidth, barHeight, 5);
      
      // Set tooltip content
      profileTooltip.content = `${d.party}
Geschätzte Stimmen in Altersgruppe: ${Math.round(d.geschaetzteStimmen).toLocaleString()}
Stimmenanteil Partei im Land: ${d.parteiProzent.toFixed(2)} %
Stimmenanteil in Altersgruppe: ${d.anteilInAltersgruppe.toFixed(2)} %
Hinweis: Nur deutsche Bevölkerung ab 18 Jahren berücksichtigt. Parteien unter 1 % werden ausgeblendet.`;
      profileTooltip.x = profileP.mouseX;
      profileTooltip.y = profileP.mouseY;
      profileTooltip.show = true;
    }
  }
  
  // Draw axes
  profileP.stroke(0);
  profileP.strokeWeight(1);
  profileP.line(margin.left, height - margin.bottom, width - margin.right, height - margin.bottom); // X axis
  profileP.line(margin.left, margin.top, margin.left, height - margin.bottom); // Y axis
  
  // Draw X axis labels (party names)
  profileP.textSize(12);
  profileP.textAlign(profileP.CENTER, profileP.TOP);
  profileP.fill(0);
  profileP.noStroke();
  
  for (let i = 0; i < x.length; i++) {
    profileP.push();
    profileP.translate(xScale(i), height - margin.bottom + 10);
    profileP.rotate(-profileP.PI/4);
    profileP.text(x[i], 0, 0);
    profileP.pop();
  }
  
  // Draw Y axis labels (values)
  profileP.textAlign(profileP.RIGHT, profileP.CENTER);
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const value = (maxY / yTicks) * i;
    const yPos = yScale(value);
    profileP.text(Math.round(value).toLocaleString(), margin.left - 10, yPos);
    
    // Tick marks
    profileP.stroke(200);
    profileP.line(margin.left - 5, yPos, margin.left, yPos);
    profileP.noStroke();
  }
  
  // Draw chart title
  profileP.textSize(14);
  profileP.textAlign(profileP.CENTER, profileP.TOP);
  profileP.text(`Geschätzte Stimmen je Partei in ${profileSelectedWahlkreis}, ${profileSelectedLand}, Altersgruppe: ${profileSelectedAgeGroup}`, 
       width/2, 10);
  
  // Draw tooltip if needed
  if (profileTooltip.show) {
    drawProfileTooltip();
  }
}

function drawProfileTooltip() {
  if (!profileP) return;
  
  const lines = profileTooltip.content.split('\n');
  const lineHeight = 18;
  const padding = 10;
  
  // Berechne maximale Textbreite
  profileP.textSize(12);
  const maxWidth = Math.max(...lines.map(l => profileP.textWidth(l))) + padding * 2;
  const tooltipHeight = lines.length * lineHeight + padding * 2;
  
  // Position tooltip (avoid going off screen)
  let x = profileTooltip.x + 15;
  let y = profileTooltip.y + 15;
  
  if (x + maxWidth > profileP.width) x = profileP.width - maxWidth - 5;
  if (y + tooltipHeight > profileP.height) y = profileP.height - tooltipHeight - 5;
  
  // Tooltip box
  profileP.fill(255);
  profileP.stroke(200);
  profileP.strokeWeight(1);
  profileP.rect(x, y, maxWidth, tooltipHeight, 5);
  
  // Tooltip text
  profileP.fill(0);
  profileP.noStroke();
  profileP.textSize(12);
  profileP.textAlign(profileP.LEFT, profileP.TOP);
  
  for (let i = 0; i < lines.length; i++) {
    // Simple formatting for first line (title)
    if (i === 0) {
      profileP.textStyle(profileP.BOLD);
      profileP.text(lines[i], x + padding, y + padding + i * lineHeight);
      profileP.textStyle(profileP.NORMAL);
    } else {
      profileP.text(lines[i], x + padding, y + padding + i * lineHeight);
    }
  }
}