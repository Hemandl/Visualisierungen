function initializeMap(data) {
  let germanyGeoJson;
  let polarization = {};
  let partyData = {};
  let tooltipContent = "";
  let tooltipX = 0;
  let tooltipY = 0;
  let showTooltip = false;
  let minPolarization, maxPolarization;
  let mapP;
  let stateCentroids = {};

  // Preprocess the data
  function preprocessData() {
    // Calculate polarization index
    data.forEach(row => {
      const state = row.Gebietsname.trim();
      const percent = parseFloat(row.Prozent.replace(",", "."));
      if (isNaN(percent)) return;
      if (!polarization[state]) polarization[state] = 0;
      polarization[state] += Math.pow(percent / 100, 2);

      // Store party data
      if (!partyData[state]) partyData[state] = [];
      partyData[state].push({ party: row.Gruppenname, percent });
    });

    // Finalize polarization calculation
    for (let state in polarization) {
      polarization[state] = 1 - polarization[state];
    }

    // Sort party data
    for (let state in partyData) {
      partyData[state].sort((a, b) => b.percent - a.percent);
    }

    // Get min and max polarization values for color scaling
    const polarizationValues = Object.values(polarization);
    minPolarization = Math.min(...polarizationValues);
    maxPolarization = Math.max(...polarizationValues);
  }

  // Custom color scale (RdBu inverted)
  function getColorForValue(value) {
    if (value === undefined) return [204, 204, 204]; // #ccc
    const normalized = (value - minPolarization) / (maxPolarization - minPolarization);
    const t = 1 - normalized;
    if (t < 0.5) {
      // Red to white
      const scale = t * 2;
      return [255, Math.floor(255 * scale), Math.floor(255 * scale)];
    } else {
      // White to blue
      const scale = (t - 0.5) * 2;
      return [Math.floor(255 * (1 - scale)), Math.floor(255 * (1 - scale)), 255];
    }
  }

  // Projection function - converts geo coordinates to canvas coordinates
  function project(lon, lat, width, height) {
    const centerLon = 10.5;
    const centerLat = 51.3;
    const scaleX = width / 15;  // Reduced scale for smaller map
    const scaleY = height / 8;   // Reduced scale for smaller map
    
    const x = width / 2 + (lon - centerLon) * scaleX;
    const y = height / 2 - (lat - centerLat) * scaleY;
    return { x, y };
  }

  // Calculate centroids for all states
  function calculateCentroids(width, height) {
    stateCentroids = {};
    germanyGeoJson.features.forEach(state => {
      const stateName = state.properties.name.trim();
      let coords = [];
      
      if (state.geometry.type === "MultiPolygon") {
        state.geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            coords = coords.concat(ring);
          });
        });
      } else if (state.geometry.type === "Polygon") {
        state.geometry.coordinates.forEach(ring => {
          coords = coords.concat(ring);
        });
      }
      
      const avg = coords.reduce(
        (acc, c) => [acc[0] + c[0], acc[1] + c[1]],
        [0, 0]
      );
      const len = coords.length || 1;
      const lon = avg[0] / len;
      const lat = avg[1] / len;
      stateCentroids[stateName] = project(lon, lat, width, height);
    });
  }

  // Precise point-in-polygon check using ray casting algorithm
  function isPointInState(x, y, state) {
    const width = mapP.width;
    const height = mapP.height;
    const centerLon = 10.5;
    const centerLat = 51.3;
    const scaleX = width / 15;
    const scaleY = height / 8;

    const geoX = centerLon + (x - width/2) / scaleX;
    const geoY = centerLat - (y - height/2) / scaleY;

    let inside = false;
    
    const checkPolygon = (x, y, polygon) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        const intersect = ((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    if (state.geometry.type === "MultiPolygon") {
      for (const polygon of state.geometry.coordinates) {
        for (let k = 0; k < polygon.length; k++) {
          if (checkPolygon(geoX, geoY, polygon[k])) {
            inside = true;
            break;
          }
        }
        if (inside) break;
      }
    } else if (state.geometry.type === "Polygon") {
      for (let k = 0; k < state.geometry.coordinates.length; k++) {
        if (checkPolygon(geoX, geoY, state.geometry.coordinates[k])) {
          inside = true;
          break;
        }
      }
    }
    
    return inside;
  }

  function drawMap() {
    const width = mapP.width;
    const height = mapP.height;
    mapP.background(255);

    // Draw each state
    germanyGeoJson.features.forEach(state => {
      const stateName = state.properties.name.trim();
      const polarizationValue = polarization[stateName];
      const fillColor = getColorForValue(polarizationValue);

      mapP.fill(fillColor);
      mapP.stroke(100);
      mapP.strokeWeight(0.7);

      // Draw each polygon in the feature
      if (state.geometry.type === "MultiPolygon") {
        state.geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            mapP.beginShape();
            ring.forEach(coord => {
              const point = project(coord[0], coord[1], width, height);
              mapP.vertex(point.x, point.y);
            });
            mapP.endShape(mapP.CLOSE);
          });
        });
      } else if (state.geometry.type === "Polygon") {
        state.geometry.coordinates.forEach(ring => {
          mapP.beginShape();
          ring.forEach(coord => {
            const point = project(coord[0], coord[1], width, height);
            mapP.vertex(point.x, point.y);
          });
          mapP.endShape(mapP.CLOSE);
        });
      }
    });

    // Draw tooltip if needed
    if (showTooltip) {
      drawTooltip();
    }

    // Draw legend
    drawLegend();
  }

  function drawTooltip() {
    const width = mapP.width;
    const height = mapP.height;
    const tooltipWidth = 200;
    const tooltipHeight = 120;
    const padding = 10;

    // Position tooltip near mouse (adjust if near edges)
    let x = tooltipX + 15;
    let y = tooltipY + 15;

    if (x + tooltipWidth > width) x = width - tooltipWidth - 5;
    if (y + tooltipHeight > height) y = height - tooltipHeight - 5;

    // Modern tooltip design with shadow
    mapP.drawingContext.shadowColor = 'rgba(0,0,0,0.2)';
    mapP.drawingContext.shadowBlur = 10;
    mapP.drawingContext.shadowOffsetY = 3;
    
    // Tooltip box
    mapP.fill(255, 245);
    mapP.stroke(180);
    mapP.strokeWeight(1);
    mapP.rect(x, y, tooltipWidth, tooltipHeight, 5);
    
    mapP.drawingContext.shadowBlur = 0;

    // Tooltip content
    mapP.fill(0);
    mapP.noStroke();
    mapP.textSize(12);
    mapP.textAlign(mapP.LEFT, mapP.TOP);

    // Split content into lines
    const lines = tooltipContent.split('\n');
    let currentY = y + padding;

    lines.forEach(line => {
      if (line === '---') {  
        mapP.stroke(204);
        mapP.line(x + padding, currentY + 5, x + tooltipWidth - padding, currentY + 5);
        mapP.noStroke();
        currentY += 10;
      } else {
        if (line.includes('<strong>')) {
          mapP.textStyle(mapP.BOLD);
          const cleanLine = line.replace(/<\/?strong>/g, '');
          mapP.text(cleanLine, x + padding, currentY);
          mapP.textStyle(mapP.NORMAL);
          currentY += 16;
        } else {
          mapP.text(line, x + padding, currentY);
          currentY += 16;
        }
      }
    });
  }

  function drawLegend() {
    const width = mapP.width;
    const height = mapP.height;
    const legendWidth = width - 100;
    const legendHeight = 20;
    const legendX = 50;
    const legendY = height - 40;

    // Add legend title
    mapP.textSize(14);
    mapP.textAlign(mapP.CENTER, mapP.BOTTOM);
    mapP.fill(50);
    mapP.text("Polarisierungsindex", legendX + legendWidth/2, legendY - 10);

    // Draw gradient
    mapP.noStroke();
    for (let i = 0; i < legendWidth; i++) {
      const t = i / legendWidth;
      const color = getColorForValue(minPolarization + t * (maxPolarization - minPolarization));
      mapP.fill(color);
      mapP.rect(legendX + i, legendY, 1, legendHeight);
    }

    // Draw axis
    mapP.stroke(0);
    mapP.strokeWeight(1);
    mapP.line(legendX, legendY, legendX + legendWidth, legendY);
    mapP.line(legendX, legendY + legendHeight, legendX + legendWidth, legendY + legendHeight);

    // Add ticks and labels
    mapP.textSize(12);
    mapP.textAlign(mapP.CENTER, mapP.TOP);
    mapP.fill(0);
    mapP.noStroke();

    for (let i = 0; i <= 4; i++) {
      const x = legendX + i * (legendWidth / 4);
      mapP.stroke(0);
      mapP.line(x, legendY, x, legendY + 5);
      mapP.line(x, legendY + legendHeight, x, legendY + legendHeight - 5);
      mapP.noStroke();

      const value = minPolarization + (i / 4) * (maxPolarization - minPolarization);
      mapP.text(value.toFixed(2), x, legendY + legendHeight + 5);
    }
  }

  // p5.js instance mode for the map
  mapP = new p5((p) => {
    p.setup = () => {
      const container = document.getElementById("map");
      const width = container.offsetWidth;
      const height = Math.min(container.offsetHeight -20 , 600); 
      const canvas = p.createCanvas(width, height);
      canvas.parent("map");
      p.textFont('Arial');
      
      // Load GeoJSON data
      p.loadJSON("data/germany_states.geojson", function(geoData) {
        germanyGeoJson = geoData;
        preprocessData();
        calculateCentroids(width, height);
        p.redraw();
      });
      p.noLoop();
    };

    p.draw = () => {
      if (germanyGeoJson) {
        drawMap();
      }
    };

    p.mouseMoved = () => {
      if (!germanyGeoJson) return;
      let found = false;
      germanyGeoJson.features.forEach(state => {
        const stateName = state.properties.name.trim();
        if (isPointInState(p.mouseX, p.mouseY, state)) {
          found = true;
          const polarizationValue = polarization[stateName];
          const topParties = partyData[stateName]?.slice(0, 3) || [];

          // Format tooltip content
          tooltipContent = `<strong>${stateName}</strong>\n---`;
          tooltipContent += `\nPolarisierungsindex: <strong>${polarizationValue !== undefined ? polarizationValue.toFixed(2) : "Keine Daten"}</strong>`;
          tooltipContent += `\n---\nTop Parteien:`;
          
          topParties.forEach(party => {
            tooltipContent += `\n${party.party}: ${party.percent.toFixed(1)}%`;
          });
          
          // Use mouse position for tooltip
          tooltipX = p.mouseX;
          tooltipY = p.mouseY;
          showTooltip = true;
        }
      });
      if (!found) showTooltip = false;
      p.redraw();
    };

    p.mouseClicked = () => {
  if (!germanyGeoJson) return;
  germanyGeoJson.features.forEach(state => {
    if (isPointInState(p.mouseX, p.mouseY, state)) {
      const stateName = state.properties.name.trim();
      window.selectStateEverywhere(stateName); // Aufruf über window
    }
  });
};


    p.windowResized = () => {
      const container = document.getElementById("map");
      const width = container.offsetWidth;
      const height = Math.min(container.offsetHeight -20, 600); 
      p.resizeCanvas(width, height);
      calculateCentroids(width, height);
      p.redraw();
    };
  }, document.getElementById('map'));
}