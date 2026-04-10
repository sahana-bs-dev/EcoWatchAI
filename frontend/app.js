(function () {
    if (typeof window === "undefined" || typeof document === "undefined") {
        if (typeof module !== "undefined" && module.exports) module.exports = {};
        // Running in non-browser environment (node). No-op gracefully.
        console.warn("frontend/app.js loaded outside browser; aborting initialization.");
        return;
    }

    const { API_BASE_URL, MAPBOX_TOKEN } = window.ECOWATCH_CONFIG;

    const state = {
    dashboard: null,
    isDemoMode: false,
    selectedLat: null,
    selectedLng: null,
    selectedPlaceName: "",
    radius: 10,
    map: null,
    leafletMap: null,
    leafletLayers: [],
    leafletRadiusCircle: null,
    mapLoaded: false,
    satelliteEnabled: false,
    aqiChart: null,
    pollutantChart: null,
    network: null,
    industryMarkers: [],
    stationMarker: null,
    selectionMarker: null,
    simulationTimer: null,
    liveLabels: [],
    placeSearchTimer: null
};

const elements = {
    placeSearchInput: document.getElementById("placeSearchInput"),
    placeSearchResults: document.getElementById("placeSearchResults"),
    locationSelect: document.getElementById("locationSelect"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    radiusSelect: document.getElementById("radiusSelect"),
    mapViewBtn: document.getElementById("mapViewBtn"),
    networkViewBtn: document.getElementById("networkViewBtn"),
    satelliteToggle: document.getElementById("satelliteToggle"),
    mapPanel: document.getElementById("mapPanel"),
    networkPanel: document.getElementById("networkPanel"),
    currentAqiValue: document.getElementById("currentAqiValue"),
    predictedAqiValue: document.getElementById("predictedAqiValue"),
    ecoScoreValue: document.getElementById("ecoScoreValue"),
    globalComplianceValue: document.getElementById("globalComplianceValue"),
    aqiStatus: document.getElementById("aqiStatus"),
    mapAqiValue: document.getElementById("mapAqiValue"),
    radiusValue: document.getElementById("radiusValue"),
    topPolluterValue: document.getElementById("topPolluterValue"),
    selectedLocationText: document.getElementById("selectedLocationText"),
    recommendationList: document.getElementById("recommendationList"),
    ragQuestion: document.getElementById("ragQuestion"),
    ragAskBtn: document.getElementById("ragAskBtn"),
    ragAnswer: document.getElementById("ragAnswer"),
    ragSources: document.getElementById("ragSources"),
    ragPreviewList: document.getElementById("ragPreviewList"),
    impactList: document.getElementById("impactList"),
    nearbyIndustryList: document.getElementById("nearbyIndustryList"),
    nearbyCount: document.getElementById("nearbyCount"),
    complianceList: document.getElementById("complianceList"),
    spreadBars: document.getElementById("spreadBars"),
    rankingList: document.getElementById("rankingList"),
    alertBanner: document.getElementById("alertBanner"),
    alertBannerText: document.getElementById("alertBannerText"),
    alertBannerMeta: document.getElementById("alertBannerMeta"),
    anomalyBadge: document.getElementById("anomalyBadge"),
    mapFallback: document.getElementById("mapFallback")
};

document.addEventListener("DOMContentLoaded", async () => {
    bindEvents();
    await loadDashboard();
    startSimulation();
});

function bindEvents() {
    elements.placeSearchInput.addEventListener("input", onPlaceSearchInput);
    elements.radiusSelect.addEventListener("change", async (event) => {
        state.radius = Number(event.target.value);
        elements.radiusValue.textContent = `${state.radius} km`;
        await loadDashboard();
    });

    elements.locationSelect.addEventListener("change", async (event) => {
        const [lat, lng] = event.target.value.split(",").map(Number);
        state.selectedLat = lat;
        state.selectedLng = lng;
        await loadDashboard();
    });
    elements.analyzeBtn.addEventListener("click", async () => {
        const [lat, lng] = elements.locationSelect.value.split(",").map(Number);
        state.selectedLat = lat;
        state.selectedLng = lng;
        state.selectedPlaceName = elements.locationSelect.options[elements.locationSelect.selectedIndex]?.textContent || "";
        await loadDashboard();
    });

    elements.mapViewBtn.addEventListener("click", () => toggleView("map"));
    elements.networkViewBtn.addEventListener("click", () => toggleView("network"));

    elements.satelliteToggle.addEventListener("click", () => {
        state.satelliteEnabled = !state.satelliteEnabled;
        elements.satelliteToggle.textContent = `Satellite View: ${state.satelliteEnabled ? "On" : "Off"}`;
        if (state.map) {
            state.map.setStyle(
                state.satelliteEnabled
                    ? "mapbox://styles/mapbox/satellite-streets-v12"
                    : "mapbox://styles/mapbox/dark-v11"
            );
            state.map.once("style.load", () => {
                state.mapLoaded = true;
                renderMapLayers();
            });
        }
        if (state.leafletMap) {
            updateLeafletTiles();
        }
    });
    elements.ragAskBtn.addEventListener("click", askRagQuestion);
}

async function loadDashboard() {
    try {
        const data = await getDashboardData();

        state.dashboard = data;
        state.selectedLat = data.selected_location.lat;
        state.selectedLng = data.selected_location.lng;

        populateLocationSelect(data);
        renderDashboard(data);
        initVisualizations(data);
        await runAiChecks(data.pollutants);
    } catch (error) {
        console.error("Failed to load dashboard:", error);
        showBanner("Dashboard data could not be loaded.", "Connection Issue");
    }
}

async function getDashboardData() {
    if (!shouldUseRemoteApi()) {
        state.isDemoMode = true;
        return getDemoDashboard();
    }

    const params = new URLSearchParams({ radius: String(state.radius) });
    if (state.selectedLat !== null && state.selectedLng !== null) {
        params.set("lat", state.selectedLat);
        params.set("lng", state.selectedLng);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/dashboard-data?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Dashboard API failed with ${response.status}`);
        }
        state.isDemoMode = false;
        return await response.json();
    } catch (error) {
        console.warn("Falling back to demo mode:", error);
        state.isDemoMode = true;
        showBanner("Backend not connected. Running built-in demo mode.", "Local Demo");
        return getDemoDashboard();
    }
}

function populateLocationSelect(data) {
    const options = [
        {
            label: "Selected inspection point",
            lat: data.selected_location.lat,
            lng: data.selected_location.lng,
            type: "Selected"
        },
        {
            label: data.monitoring_station?.name || "Central Monitoring Station",
            lat: data.monitoring_station?.lat || data.map_center.lat,
            lng: data.monitoring_station?.lng || data.map_center.lng,
            type: "Monitoring"
        },
        ...data.public_areas.map((area) => ({
            label: area.name,
            lat: area.lat,
            lng: area.lng,
            type: area.type || "Public Area"
        })),
        ...data.industries.map((industry) => ({
            label: industry.name,
            lat: industry.lat,
            lng: industry.lng,
            type: industry.sector || "Industry"
        }))
    ];

    const uniqueOptions = [];
    const seen = new Set();
    for (const option of options) {
        const key = `${option.label}-${option.lat.toFixed(4)}-${option.lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueOptions.push(option);
    }

    const currentValue = `${data.selected_location.lat},${data.selected_location.lng}`;
    elements.locationSelect.innerHTML = uniqueOptions
        .map((option) => {
            const value = `${option.lat},${option.lng}`;
            const selected = value === currentValue ? "selected" : "";
            return `<option value="${value}" ${selected}>${option.label} (${option.type})</option>`;
        })
        .join("");

    if (state.selectedPlaceName && elements.placeSearchInput && document.activeElement !== elements.placeSearchInput) {
        elements.placeSearchInput.value = state.selectedPlaceName;
    }
}

function renderDashboard(data) {
    elements.currentAqiValue.textContent = Math.round(data.aqi.value);
    elements.predictedAqiValue.textContent = Math.round(data.aqi.predicted);
    elements.ecoScoreValue.textContent = data.aqi.eco_score;
    elements.globalComplianceValue.textContent = data.highest_polluter.compliance;
    elements.aqiStatus.textContent = data.aqi.status;
    elements.mapAqiValue.textContent = Math.round(data.aqi.value);
    elements.radiusValue.textContent = `${data.selected_location.radius_km} km`;
    elements.topPolluterValue.textContent = data.highest_polluter.name;
    const placeLabel = state.selectedPlaceName ? `${state.selectedPlaceName} | ` : "";
    elements.selectedLocationText.textContent = `${placeLabel}Lat ${data.selected_location.lat.toFixed(4)}, Lng ${data.selected_location.lng.toFixed(4)} within a ${data.selected_location.radius_km} km inspection radius.`;

    const modeMeta = data.industry_data_mode === "live_osm_estimated" || data.place_data_mode === "live_osm"
        ? "Live AQI + live Mysuru map entities from OSM"
        : data.alerts[1];
    showBanner(data.alerts[0], modeMeta);
    renderRecommendations(data.recommendations);
    renderNearbyIndustries(data.nearby_industries);
    renderCompliance(data.compliance);
    renderImpact(data.impact_analysis);
    renderSpread(data.pollution_spread);
    renderRanking(data.ranking);
    renderRagPreview(data.rag_preview || getDemoRagPreview());
    renderCharts(data);
}

function renderRecommendations(items) {
    elements.recommendationList.innerHTML = items.map((item) => `<li class="list-card">${item}</li>`).join("");
}

function renderNearbyIndustries(items) {
    elements.nearbyCount.textContent = `${items.length} found`;
    if (!items.length) {
        elements.nearbyIndustryList.innerHTML = `<div class="list-card text-sm text-slate-300">No industries detected in the selected radius.</div>`;
        return;
    }

    elements.nearbyIndustryList.innerHTML = items
        .map((item, index) => `
            <div class="list-card industry-item">
                <div class="flex items-center justify-between gap-3">
                    <div class="industry-meta">
                        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">${index === 0 ? "Highest polluter" : "Nearby industry"}</p>
                        <strong class="text-base">${item.name}</strong>
                        <p class="mt-2 text-sm text-slate-500">${item.pollution_level} pollution | ${item.distance_km} km away${item.estimated ? " | estimated risk" : ""}</p>
                    </div>
                    <span class="aqi-pill ${severityClass(item.pollution_level)}">${Math.round(item.aqi)} AQI</span>
                </div>
            </div>
        `)
        .join("");
}

function renderCompliance(items) {
    elements.complianceList.innerHTML = items
        .slice(0, 6)
        .map((item) => `
            <div class="list-card flex items-center justify-between gap-3">
                <div>
                    <strong>${item.name}</strong>
                    <p class="mt-1 text-sm text-slate-300">AQI ${Math.round(item.aqi)}</p>
                </div>
                <span class="text-sm font-semibold ${complianceClass(item.status)}">${statusText(item.status)}</span>
            </div>
        `)
        .join("");
}

function renderImpact(items) {
    if (!items.length) {
        elements.impactList.innerHTML = `<div class="list-card text-sm text-slate-300">No populated zones affected within the current radius.</div>`;
        return;
    }

    elements.impactList.innerHTML = items
        .map((item) => `
            <div class="list-card">
                <div class="flex items-center justify-between gap-3">
                    <strong>${item.name}</strong>
                    <span class="text-xs uppercase tracking-[0.2em] text-slate-400">${item.type}</span>
                </div>
                <div class="mt-2 flex items-center justify-between text-sm text-slate-300">
                    <span>${item.distance_km} km</span>
                    <span>${Number(item.population).toLocaleString()} people</span>
                </div>
            </div>
        `)
        .join("");
}

function renderSpread(items) {
    elements.spreadBars.innerHTML = items
        .map((item) => `
            <div class="spread-row">
                <div class="flex items-center justify-between text-sm text-slate-200">
                    <span>${item.distance_km} km</span>
                    <span>${item.impact_percent}% impact | AQI ${Math.round(item.estimated_aqi)}</span>
                </div>
                <div class="spread-track">
                    <div class="spread-fill" style="width:${item.impact_percent}%"></div>
                </div>
            </div>
        `)
        .join("");
}

function renderRanking(items) {
    elements.rankingList.innerHTML = items
        .map((item, index) => `
            <div class="list-card flex items-center justify-between gap-3">
                <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">#${index + 1}</p>
                    <strong>${item.name}</strong>
                </div>
                <div class="text-right">
                    <p class="text-sm font-semibold ${severityClass(item.status)}">${item.status}</p>
                    <p class="text-sm text-slate-300">AQI ${Math.round(item.aqi)}</p>
                </div>
            </div>
        `)
        .join("");
}

function renderCharts(data) {
    const labels = data.history.map((item) => item.timestamp.slice(11, 16));
    const pastSeries = data.history.map((item) => Math.round(item.aqi));
    const currentAqi = Math.round(data.aqi.value);
    const predictedAqi = Math.round(data.aqi.predicted);
    const fullLabels = [...labels, "Now", "Forecast"];
    const trendSeries = [...pastSeries, currentAqi, null];
    const forecastSeries = new Array(labels.length).fill(null).concat([currentAqi, predictedAqi]);
    const pollutantValues = [
        data.pollutants.co2,
        data.pollutants.so2,
        data.pollutants.no2,
        data.pollutants.pm25,
        data.pollutants.pm10
    ];

    if (state.aqiChart) state.aqiChart.destroy();
    if (state.pollutantChart) state.pollutantChart.destroy();

    state.liveLabels = [...labels, "Current", "Predicted"];

    const aqiCtx = document.getElementById("aqiChart").getContext("2d");
    const aqiGradient = aqiCtx.createLinearGradient(0, 0, 0, 320);
    aqiGradient.addColorStop(0, "rgba(53, 163, 74, 0.22)");
    aqiGradient.addColorStop(1, "rgba(53, 163, 74, 0.02)");

    state.aqiChart = new Chart(aqiCtx, {
        type: "line",
        data: {
            labels: fullLabels,
            datasets: [
                {
                    label: "Observed AQI",
                    data: trendSeries,
                    borderColor: "#2f7a42",
                    backgroundColor: aqiGradient,
                    fill: true,
                    tension: 0.38,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 5,
                    pointBackgroundColor: "#f8f4ea",
                    pointBorderColor: "#2f7a42",
                    pointBorderWidth: 2
                },
                {
                    label: "Forecast",
                    data: forecastSeries,
                    borderColor: "#e25822",
                    backgroundColor: "#e25822",
                    borderDash: [8, 6],
                    tension: 0.22,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 5,
                    pointBackgroundColor: "#fff7ec",
                    pointBorderColor: "#e25822",
                    pointBorderWidth: 2,
                    fill: false
                }
            ]
        },
        options: chartOptions("AQI", {
            suggestedMin: Math.max(0, Math.min(...pastSeries, currentAqi, predictedAqi) - 25),
            suggestedMax: Math.max(...pastSeries, currentAqi, predictedAqi) + 25
        })
    });

    state.pollutantChart = new Chart(document.getElementById("pollutantChart"), {
        type: "bar",
        data: {
            labels: ["CO2", "SO2", "NO2", "PM2.5", "PM10"],
            datasets: [
                {
                    label: "Pollutant Load",
                    data: pollutantValues,
                    backgroundColor: ["#2f7a42", "#5b7f57", "#d79d2f", "#e6893d", "#d75d33"],
                    borderRadius: 999,
                    borderSkipped: false,
                    barThickness: 18
                }
            ]
        },
        options: {
            ...chartOptions("Concentration", {
                suggestedMin: 0,
                suggestedMax: Math.max(...pollutantValues) + 40
            }),
            indexAxis: "y",
            plugins: {
                ...chartOptions("Concentration").plugins,
                legend: {
                    display: false
                }
            }
        }
    });
}

function chartOptions(label, range = {}) {
    return {
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false
        },
        plugins: {
            legend: {
                labels: {
                    color: "#445247",
                    usePointStyle: true,
                    boxWidth: 10,
                    boxHeight: 10,
                    font: {
                        family: "Manrope",
                        weight: "700"
                    }
                }
            },
            tooltip: {
                backgroundColor: "rgba(27, 40, 30, 0.94)",
                titleColor: "#fff7ec",
                bodyColor: "#f8f3e8",
                borderColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                padding: 12,
                displayColors: true
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#6f7a6f",
                    font: {
                        family: "Manrope",
                        weight: "600"
                    }
                },
                grid: { color: "rgba(33,73,43,0.08)" }
            },
            y: {
                title: { display: true, text: label, color: "#445247" },
                ticks: {
                    color: "#6f7a6f",
                    font: {
                        family: "Manrope",
                        weight: "600"
                    }
                },
                suggestedMin: range.suggestedMin,
                suggestedMax: range.suggestedMax,
                grid: { color: "rgba(33,73,43,0.08)" }
            }
        }
    };
}

function initVisualizations(data) {
    if (MAPBOX_TOKEN && MAPBOX_TOKEN !== "YOUR_MAPBOX_PUBLIC_TOKEN") {
        elements.mapFallback.classList.add("hidden");
        initMap(data);
    } else {
        initLeafletMap(data);
    }
    initNetwork(data.network);
}

function initLeafletMap(data) {
    elements.mapFallback.classList.add("hidden");
    if (!state.leafletMap) {
        state.leafletMap = L.map("map", {
            zoomControl: true
        }).setView([data.selected_location.lat, data.selected_location.lng], 12);

        updateLeafletTiles();
        state.leafletMap.on("click", async (event) => {
            state.selectedLat = event.latlng.lat;
            state.selectedLng = event.latlng.lng;
            await loadDashboard();
        });
    }
    renderLeafletMap(data);
}

function updateLeafletTiles() {
    if (!state.leafletMap) return;
    state.leafletMap.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
            state.leafletMap.removeLayer(layer);
        }
    });

    const url = state.satelliteEnabled
        ? "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    L.tileLayer(url, {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(state.leafletMap);
}

function renderLeafletMap(data) {
    if (!state.leafletMap) return;
    state.leafletLayers.forEach((layer) => state.leafletMap.removeLayer(layer));
    state.leafletLayers = [];
    if (state.leafletRadiusCircle) {
        state.leafletMap.removeLayer(state.leafletRadiusCircle);
    }

    state.leafletRadiusCircle = L.circle([data.selected_location.lat, data.selected_location.lng], {
        radius: data.selected_location.radius_km * 1000,
        color: "#2f7a42",
        weight: 2,
        fillColor: "#2f7a42",
        fillOpacity: 0.08
    }).addTo(state.leafletMap);

    const selectedMarker = L.marker([data.selected_location.lat, data.selected_location.lng], {
        icon: buildLeafletIcon("selected")
    }).addTo(state.leafletMap);
    selectedMarker.bindPopup(`<strong>Selected zone</strong><br>AQI ${Math.round(data.aqi.value)}`);
    state.leafletLayers.push(selectedMarker);

    data.heatmap.forEach((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const level = feature.properties.level.toLowerCase();
        const marker = L.marker([lat, lng], {
            icon: buildLeafletIcon(level)
        }).addTo(state.leafletMap);
        marker.bindPopup(`<strong>${escapeHtml(feature.properties.name)}</strong><br>${escapeHtml(feature.properties.level)} emission zone<br>AQI ${Math.round(feature.properties.aqi)}`);
        state.leafletLayers.push(marker);
    });

    data.public_areas.forEach((area) => {
        const areaMarker = L.circleMarker([area.lat, area.lng], {
            radius: 6,
            fillColor: "#f7f3e8",
            color: "#5f6a60",
            weight: 1,
            fillOpacity: 1
        }).addTo(state.leafletMap);
        areaMarker.bindPopup(`<strong>${escapeHtml(area.name)}</strong><br>${escapeHtml(area.type)}<br>Population ${Number(area.population).toLocaleString()}`);
        state.leafletLayers.push(areaMarker);
    });

    state.leafletMap.setView([data.selected_location.lat, data.selected_location.lng], 12);
}

function buildLeafletIcon(level) {
    return L.divIcon({
        className: "",
        html: `<div class="eco-marker ${level}"></div>`,
        iconSize: level === "selected" ? [38, 38] : [28, 28],
        iconAnchor: level === "selected" ? [19, 19] : [14, 14]
    });
}

function initMap(data) {
    mapboxgl.accessToken = MAPBOX_TOKEN;

    if (!state.map) {
        state.map = new mapboxgl.Map({
            container: "map",
            style: state.satelliteEnabled ? "mapbox://styles/mapbox/satellite-streets-v12" : "mapbox://styles/mapbox/dark-v11",
            center: [data.map_center.lng, data.map_center.lat],
            zoom: 11.5
        });

        state.map.on("load", () => {
            state.mapLoaded = true;
            renderMapLayers();
        });

        state.map.on("click", async (event) => {
            state.selectedLat = event.lngLat.lat;
            state.selectedLng = event.lngLat.lng;
            await loadDashboard();
        });
        return;
    }

    if (state.mapLoaded) renderMapLayers();
}

function renderMapLayers() {
    const data = state.dashboard;
    if (!state.map || !state.mapLoaded || !data) return;

    clearMarkers();

    upsertSource("heatmap-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: data.heatmap }
    });

    upsertSource("roads-source", {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: data.roads.map((road) => ({
                type: "Feature",
                geometry: { type: "LineString", coordinates: road.coordinates },
                properties: { name: road.name }
            }))
        }
    });

    upsertSource("radius-source", createCircleSource(data.selected_location.lng, data.selected_location.lat, data.selected_location.radius_km));

    upsertLayer("roads-layer", {
        id: "roads-layer",
        type: "line",
        source: "roads-source",
        paint: {
            "line-color": "#7dd3fc",
            "line-width": 2,
            "line-opacity": 0.6
        }
    });

    upsertLayer("heatmap-layer", {
        id: "heatmap-layer",
        type: "heatmap",
        source: "heatmap-source",
        paint: {
            "heatmap-weight": ["get", "intensity"],
            "heatmap-intensity": 0.8,
            "heatmap-radius": 35,
            "heatmap-opacity": 0.75,
            "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0, "rgba(46, 204, 113, 0)",
                0.25, "#2ecc71",
                0.55, "#f1c40f",
                0.85, "#e74c3c"
            ]
        }
    });

    upsertLayer("radius-layer", {
        id: "radius-layer",
        type: "fill",
        source: "radius-source",
        paint: {
            "fill-color": "#38bdf8",
            "fill-opacity": 0.12
        }
    });

    upsertLayer("radius-outline-layer", {
        id: "radius-outline-layer",
        type: "line",
        source: "radius-source",
        paint: {
            "line-color": "#7dd3fc",
            "line-width": 2,
            "line-opacity": 0.8
        }
    });

    state.stationMarker = new mapboxgl.Marker({ color: "#7dd3fc" })
        .setLngLat([data.monitoring_station.lng, data.monitoring_station.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML("<strong>Central Monitoring Station</strong><p>Central sensor fusion hub</p>"))
        .addTo(state.map);

    data.industries.forEach((industry) => {
        const matching = data.heatmap.find((item) => item.properties.name === industry.name);
        const level = (matching?.properties.level || "Low").toLowerCase();
        const el = document.createElement("div");
        el.className = `industry-marker ${level}`;
        const marker = new mapboxgl.Marker(el)
            .setLngLat([industry.lng, industry.lat])
            .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(`<strong>${escapeHtml(industry.name)}</strong><p>${escapeHtml(industry.sector)} sector</p><p>${level.toUpperCase()} emission zone</p>`))
            .addTo(state.map);
        state.industryMarkers.push(marker);
    });

    data.public_areas.forEach((area) => {
        const marker = new mapboxgl.Marker({ color: "#94a3b8", scale: 0.75 })
            .setLngLat([area.lng, area.lat])
            .setPopup(new mapboxgl.Popup({ offset: 14 }).setHTML(`<strong>${escapeHtml(area.name)}</strong><p>${escapeHtml(area.type)}</p><p>Population ${Number(area.population).toLocaleString()}</p>`))
            .addTo(state.map);
        state.industryMarkers.push(marker);
    });

    if (state.selectionMarker) state.selectionMarker.remove();
    state.selectionMarker = new mapboxgl.Marker({ color: "#f8fafc", scale: 1.1 })
        .setLngLat([data.selected_location.lng, data.selected_location.lat])
        .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(`<strong>Selected zone</strong><p>Radius ${data.selected_location.radius_km} km</p>`))
        .addTo(state.map);

    state.map.flyTo({
        center: [data.selected_location.lng, data.selected_location.lat],
        essential: true,
        zoom: 11.8
    });
}

function clearMarkers() {
    state.industryMarkers.forEach((marker) => marker.remove());
    state.industryMarkers = [];
    if (state.stationMarker) state.stationMarker.remove();
}

function upsertSource(id, source) {
    if (state.map.getSource(id)) {
        state.map.getSource(id).setData(source.data);
        return;
    }
    state.map.addSource(id, source);
}

function upsertLayer(id, definition) {
    if (!state.map.getLayer(id)) {
        state.map.addLayer(definition);
    }
}

function createCircleSource(lng, lat, radiusKm) {
    const points = 64;
    const coords = [];
    const dx = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    const dy = radiusKm / 110.574;
    for (let i = 0; i < points; i += 1) {
        const theta = (i / points) * Math.PI * 2;
        coords.push([lng + dx * Math.cos(theta), lat + dy * Math.sin(theta)]);
    }
    coords.push(coords[0]);
    return {
        type: "geojson",
        data: {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [coords]
            }
        }
    };
}

function initNetwork(networkData) {
    const container = document.getElementById("networkView");
    const data = {
        nodes: new vis.DataSet(networkData.nodes),
        edges: new vis.DataSet(networkData.edges)
    };
    const options = {
        autoResize: true,
        interaction: { hover: true },
        layout: { improvedLayout: true },
        physics: {
            enabled: true,
            stabilization: { iterations: 180 }
        },
        groups: {
            industry: { color: { background: "#e74c3c", border: "#fecaca" }, font: { color: "#fff" } },
            sensor: { color: { background: "#f1c40f", border: "#fef08a" }, font: { color: "#111827" } },
            station: { color: { background: "#2ecc71", border: "#bbf7d0" }, font: { color: "#fff" } }
        },
        edges: { color: "#7dd3fc", width: 2 },
        nodes: {
            shape: "dot",
            size: 18,
            borderWidth: 2,
            font: { color: "#e2e8f0", face: "Manrope", size: 14 }
        }
    };

    if (state.network) {
        state.network.setData(data);
        return;
    }

    state.network = new vis.Network(container, data, options);
}

async function runAiChecks(pollutants) {
    try {
        if (state.isDemoMode) {
            const predicted = getDemoPrediction(pollutants);
            const anomaly = getDemoAnomaly({ ...pollutants, aqi: state.dashboard.aqi.value });
            elements.predictedAqiValue.textContent = Math.round(predicted.predicted_aqi);
            setAnomalyBadge(anomaly.anomaly);
            return;
        }

        const [predictionRes, anomalyRes] = await Promise.all([
            fetch(`${API_BASE_URL}/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pollutants)
            }),
            fetch(`${API_BASE_URL}/anomaly`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...pollutants, aqi: state.dashboard.aqi.value })
            })
        ]);

        const prediction = await predictionRes.json();
        const anomaly = await anomalyRes.json();
        elements.predictedAqiValue.textContent = Math.round(prediction.predicted_aqi);
        setAnomalyBadge(anomaly.anomaly);
    } catch (error) {
        console.error("AI checks failed:", error);
    }
}

function startSimulation() {
    stopSimulation();
    state.simulationTimer = window.setInterval(async () => {
        try {
            const data = state.isDemoMode ? getDemoSimulationTick() : await fetchSimulationTick();
            elements.currentAqiValue.textContent = Math.round(data.current.aqi);
            elements.predictedAqiValue.textContent = Math.round(data.prediction.predicted_aqi);
            elements.ecoScoreValue.textContent = data.current.eco_score;
            elements.aqiStatus.textContent = data.current.status;
            elements.mapAqiValue.textContent = Math.round(data.current.aqi);
            renderRecommendations(data.recommendations);
            setAnomalyBadge(data.anomaly.anomaly);
            updateLiveCharts(data);

            if (data.anomaly.anomaly) {
                showBanner(data.anomaly.message, data.alerts[0]);
            } else {
                showBanner(data.alerts[0], data.alerts[1]);
            }
            if (state.isDemoMode) {
                renderRagPreview(getDemoRagPreview());
            }
        } catch (error) {
            console.error("Simulation update failed:", error);
        }
    }, 4000);
}

function stopSimulation() {
    if (state.simulationTimer) window.clearInterval(state.simulationTimer);
}

async function fetchSimulationTick() {
    const response = await fetch(`${API_BASE_URL}/simulate`);
    if (!response.ok) {
        throw new Error(`Simulation API failed with ${response.status}`);
    }
    return await response.json();
}

function updateLiveCharts(simulation) {
    if (state.aqiChart) {
        const trendDataset = state.aqiChart.data.datasets[0].data;
        const forecastDataset = state.aqiChart.data.datasets[1].data;
        const nextLabels = [...state.liveLabels.slice(-11), "Current", "Predicted"];
        const nextTrend = [...trendDataset.slice(-11), Math.round(simulation.current.aqi), null];
        const nextForecast = new Array(nextLabels.length - 2).fill(null).concat([
            Math.round(simulation.current.aqi),
            Math.round(simulation.prediction.predicted_aqi)
        ]);
        state.liveLabels = nextLabels;
        state.aqiChart.data.labels = nextLabels;
        state.aqiChart.data.datasets[0].data = nextTrend;
        state.aqiChart.data.datasets[1].data = nextForecast;
        state.aqiChart.update();
    }

    if (state.pollutantChart) {
        state.pollutantChart.data.datasets[0].data = [
            simulation.current.pollutants.co2,
            simulation.current.pollutants.so2,
            simulation.current.pollutants.no2,
            simulation.current.pollutants.pm25,
            simulation.current.pollutants.pm10
        ];
        state.pollutantChart.update();
    }
}

function setAnomalyBadge(isAnomaly) {
    if (isAnomaly) {
        elements.anomalyBadge.textContent = "Spike";
        elements.anomalyBadge.className = "stat-word";
        return;
    }
    elements.anomalyBadge.textContent = "Stable";
    elements.anomalyBadge.className = "stat-word";
}

function toggleView(view) {
    const showMap = view === "map";
    elements.mapPanel.classList.toggle("hidden", !showMap);
    elements.networkPanel.classList.toggle("hidden", showMap);
    elements.mapViewBtn.classList.toggle("active", showMap);
    elements.networkViewBtn.classList.toggle("active", !showMap);
    if (showMap && state.map) state.map.resize();
    if (showMap && state.leafletMap) state.leafletMap.invalidateSize();
    if (!showMap && state.network) state.network.fit();
}

function showBanner(primary, secondary) {
    elements.alertBanner.classList.remove("hidden");
    elements.alertBannerText.textContent = primary;
    elements.alertBannerMeta.textContent = secondary;
}

function onPlaceSearchInput(event) {
    const query = event.target.value.trim();
    if (state.placeSearchTimer) {
        window.clearTimeout(state.placeSearchTimer);
    }

    if (!query) {
        elements.placeSearchResults.innerHTML = "";
        return;
    }

    state.placeSearchTimer = window.setTimeout(async () => {
        await searchPlaces(query);
    }, 250);
}

async function searchPlaces(query) {
    if (!shouldUseRemoteApi()) {
        elements.placeSearchResults.innerHTML = `<div class="source-card">Run the backend to search real Mysore localities.</div>`;
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/places?query=${encodeURIComponent(query)}&city=${encodeURIComponent("Mysore, Karnataka, India")}`);
        if (!response.ok) throw new Error(`Place search failed with ${response.status}`);
        const payload = await response.json();
        renderPlaceSearchResults(payload.places || []);
    } catch (error) {
        console.error("Place search failed:", error);
        elements.placeSearchResults.innerHTML = `<div class="source-card">Could not fetch live Mysore places right now.</div>`;
    }
}

function renderPlaceSearchResults(places) {
    if (!places.length) {
        elements.placeSearchResults.innerHTML = `<div class="source-card">No Mysore locality match found.</div>`;
        return;
    }

    elements.placeSearchResults.innerHTML = places
        .map((place, index) => `
            <button class="search-result-btn" type="button" data-index="${index}">
                <strong>${escapeHtml(place.name)}</strong>
                <span>${escapeHtml(place.display_name)}</span>
            </button>
        `)
        .join("");

    const buttons = elements.placeSearchResults.querySelectorAll(".search-result-btn");
    buttons.forEach((button, index) => {
        button.addEventListener("click", async () => {
            const place = places[index];
            state.selectedLat = place.lat;
            state.selectedLng = place.lng;
            state.selectedPlaceName = place.name;
            elements.placeSearchInput.value = place.name;
            elements.placeSearchResults.innerHTML = "";
            await loadDashboard();
        });
    });
}

async function askRagQuestion() {
    const question = elements.ragQuestion.value.trim();
    if (!question) {
        elements.ragAnswer.textContent = "Ask about compliance, mitigation, anomalies, or health impact for the selected location.";
        return;
    }

    const focusIndustry = state.dashboard?.highest_polluter?.name || "JK Tyre Mysuru Plant";
    const aqi = state.dashboard?.aqi?.value || state.dashboard?.current?.aqi || 0;

    try {
        let result;
        if (state.isDemoMode) {
            result = getDemoRagResponse(question, focusIndustry, aqi);
        } else {
            const response = await fetch(`${API_BASE_URL}/rag-query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, industry: focusIndustry, aqi })
            });
            if (!response.ok) throw new Error(`RAG API failed with ${response.status}`);
            result = await response.json();
        }

        elements.ragAnswer.textContent = result.answer;
        renderRagSources(result.citations);
    } catch (error) {
        console.error("RAG query failed:", error);
        elements.ragAnswer.textContent = "RAG response could not be generated right now.";
    }
}

function renderRagSources(sources) {
    elements.ragSources.innerHTML = (sources || [])
        .map((source) => `
            <div class="source-card">
                <strong>${escapeHtml(source.title)}</strong>
                <p class="text-sm text-slate-500">${escapeHtml(source.category)} | ${escapeHtml(source.industry)}</p>
                <p class="mt-2 text-sm text-slate-600">${escapeHtml(source.excerpt)}</p>
            </div>
        `)
        .join("");
}

function renderRagPreview(items) {
    elements.ragPreviewList.innerHTML = (items || [])
        .map((item) => `
            <div class="source-card">
                <strong>${escapeHtml(item.title)}</strong>
                <p class="text-sm text-slate-600">${escapeHtml(item.content)}</p>
            </div>
        `)
        .join("");
}

function shouldUseRemoteApi() {
    return Boolean(API_BASE_URL) && !API_BASE_URL.includes("YOUR-RENDER-BACKEND");
}

function getDemoDashboard() {
    const demo = JSON.parse(JSON.stringify(window.ECOWATCH_DEMO));
    demo.selected_location.radius_km = state.radius;
    if (state.selectedLat !== null && state.selectedLng !== null) {
        demo.selected_location.lat = state.selectedLat;
        demo.selected_location.lng = state.selectedLng;
    }
    return demo;
}

function getDemoRagPreview() {
    return (window.ECOWATCH_DEMO_RAG || []).slice(0, 3);
}

function getDemoRagResponse(question, industry, aqi) {
    const docs = (window.ECOWATCH_DEMO_RAG || [])
        .filter((doc) => doc.industry === "all" || doc.industry === industry)
        .slice(0, 3);
    let answer = `For ${industry}, the grounded guidance suggests focused mitigation. `;
    if (aqi >= 200) {
        answer += "AQI is already in the violation range, so reduce production, review filters, and prepare sensitive-zone alerts. ";
    } else if (aqi >= 130) {
        answer += "AQI is in the warning range, so tighten monitoring and start preventive corrective action. ";
    } else {
        answer += "AQI is currently below the warning threshold, so continue preventive maintenance and routine observation. ";
    }
    answer += docs.map((doc) => doc.content).join(" ");
    return {
        answer,
        citations: docs.map((doc) => ({
            title: doc.title,
            category: doc.category,
            industry: doc.industry,
            excerpt: doc.content
        }))
    };
}

function getDemoPrediction(payload) {
    const predicted = Math.round((payload.co2 * 0.42 + payload.pm25 * 0.9 + payload.pm10 * 0.35 + payload.so2 * 0.4 + payload.no2 * 0.3) / 1.25);
    return {
        predicted_aqi: predicted,
        status: predicted >= 250 ? "Severe" : predicted >= 180 ? "High" : predicted >= 100 ? "Moderate" : "Low"
    };
}

function getDemoAnomaly(payload) {
    const anomaly = payload.aqi > 245 || payload.pm25 > 96 || payload.so2 > 80;
    return {
        anomaly,
        message: anomaly ? "Unusual emission spike detected" : "Emission pattern within expected range"
    };
}

function getDemoSimulationTick() {
    const source = state.dashboard || getDemoDashboard();
    const nextAqi = clamp(source.aqi.value + randomBetween(-9, 14) + (Math.random() < 0.15 ? randomBetween(28, 52) : 0), 88, 286);
    const pollutants = {
        timestamp: new Date().toISOString(),
        aqi: round2(nextAqi),
        co2: round2(clamp(source.pollutants.co2 + randomBetween(-8, 14), 110, 240)),
        so2: round2(clamp(source.pollutants.so2 + randomBetween(-4, 8), 28, 92)),
        no2: round2(clamp(source.pollutants.no2 + randomBetween(-3, 5), 20, 68)),
        pm25: round2(clamp(source.pollutants.pm25 + randomBetween(-6, 10), 42, 118)),
        pm10: round2(clamp(source.pollutants.pm10 + randomBetween(-7, 12), 78, 164))
    };
    const prediction = getDemoPrediction(pollutants);
    const anomaly = getDemoAnomaly(pollutants);
    source.aqi.value = pollutants.aqi;
    source.aqi.status = prediction.status;
    source.aqi.eco_score = Math.max(0, Math.min(100, Math.round(100 - pollutants.aqi / 3)));
    source.aqi.predicted = prediction.predicted_aqi;
    source.pollutants = pollutants;
    state.dashboard = source;
    return {
        current: {
            aqi: pollutants.aqi,
            status: source.aqi.status,
            eco_score: source.aqi.eco_score,
            pollutants
        },
        prediction,
        anomaly,
        alerts: anomaly.anomaly
            ? ["High pollution near JK Tyre Mysuru Plant", "AQI spike under investigation"]
            : ["High pollution near JK Tyre Mysuru Plant", "Real-time demo simulation active"],
        recommendations: pollutants.aqi >= 220
            ? [
                "Reduce production during peak emission windows.",
                "Install or service scrubbers and particulate filters.",
                "Issue public alerts for nearby schools, hospitals, and houses."
            ]
            : [
                "Maintain stack monitoring and optimize scrubber runtime.",
                "Shift heavy operations outside high AQI windows."
            ]
    };
}

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

function severityClass(level) {
    if (typeof level === "string") {
        const l = level.toLowerCase();
        if (l === "high") return "severity-high";
        if (l === "moderate") return "severity-moderate";
        if (l === "low") return "severity-low";
    }
    if (typeof level === "number") {
        if (level >= 200) return "severity-high";
        if (level >= 100) return "severity-moderate";
        return "severity-low";
    }
    return "severity-low";
}

})();

function complianceClass(status) {
    if (status === "Violation") return "severity-high";
    if (status === "Warning") return "severity-moderate";
    return "severity-low";
}

function statusText(status) {
    if (status === "Violation") return "❌ Violation";
    if (status === "Warning") return "⚠ Warning";
    return "✅ Compliant";
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
