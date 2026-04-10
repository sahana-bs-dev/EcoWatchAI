window.ECOWATCH_DEMO = {
    map_center: { lat: 12.2958, lng: 76.6394 },
    monitoring_station: { name: "Central Monitoring Station", lat: 12.3005, lng: 76.6440 },
    selected_location: { lat: 12.2958, lng: 76.6394, radius_km: 10 },
    aqi: { value: 214, status: "High", eco_score: 29, predicted: 247 },
    pollutants: {
        timestamp: "2026-04-01T23:00:00",
        aqi: 214,
        co2: 186,
        so2: 63,
        no2: 47,
        pm25: 84,
        pm10: 129
    },
    history: [
        { timestamp: "2026-04-01T11:00:00", aqi: 173, co2: 156, so2: 50, no2: 39, pm25: 70, pm10: 108 },
        { timestamp: "2026-04-01T12:00:00", aqi: 178, co2: 159, so2: 52, no2: 41, pm25: 72, pm10: 110 },
        { timestamp: "2026-04-01T13:00:00", aqi: 182, co2: 161, so2: 53, no2: 42, pm25: 74, pm10: 114 },
        { timestamp: "2026-04-01T14:00:00", aqi: 191, co2: 167, so2: 56, no2: 43, pm25: 77, pm10: 119 },
        { timestamp: "2026-04-01T15:00:00", aqi: 196, co2: 171, so2: 58, no2: 44, pm25: 78, pm10: 121 },
        { timestamp: "2026-04-01T16:00:00", aqi: 188, co2: 168, so2: 57, no2: 43, pm25: 76, pm10: 117 },
        { timestamp: "2026-04-01T17:00:00", aqi: 192, co2: 170, so2: 58, no2: 44, pm25: 79, pm10: 119 },
        { timestamp: "2026-04-01T18:00:00", aqi: 201, co2: 174, so2: 60, no2: 45, pm25: 81, pm10: 124 },
        { timestamp: "2026-04-01T19:00:00", aqi: 223, co2: 183, so2: 65, no2: 49, pm25: 88, pm10: 135 },
        { timestamp: "2026-04-01T20:00:00", aqi: 216, co2: 180, so2: 63, no2: 48, pm25: 85, pm10: 131 },
        { timestamp: "2026-04-01T21:00:00", aqi: 209, co2: 177, so2: 61, no2: 47, pm25: 82, pm10: 127 },
        { timestamp: "2026-04-01T22:00:00", aqi: 211, co2: 179, so2: 62, no2: 47, pm25: 83, pm10: 128 }
    ],
    heatmap: [
        { type: "Feature", geometry: { type: "Point", coordinates: [76.6762, 12.3321] }, properties: { name: "ABC Steel Plant", aqi: 241, level: "High", intensity: 0.8 } },
        { type: "Feature", geometry: { type: "Point", coordinates: [76.6581, 12.3194] }, properties: { name: "Green Cement Works", aqi: 198, level: "Moderate", intensity: 0.66 } },
        { type: "Feature", geometry: { type: "Point", coordinates: [76.6893, 12.3126] }, properties: { name: "Chemical Plant", aqi: 233, level: "High", intensity: 0.78 } },
        { type: "Feature", geometry: { type: "Point", coordinates: [76.6885, 12.2638] }, properties: { name: "Thermal Power Plant", aqi: 238, level: "High", intensity: 0.79 } },
        { type: "Feature", geometry: { type: "Point", coordinates: [76.6468, 12.2529] }, properties: { name: "Oil Refinery", aqi: 214, level: "High", intensity: 0.71 } },
        { type: "Feature", geometry: { type: "Point", coordinates: [76.6161, 12.3382] }, properties: { name: "Textile Industry", aqi: 154, level: "Moderate", intensity: 0.51 } },
        { type: "Feature", geometry: { type: "Point", coordinates: [76.6657, 12.3444] }, properties: { name: "Mining Industry", aqi: 193, level: "Moderate", intensity: 0.64 } },
        { type: "Feature", geometry: { type: "Point", coordinates: [76.7008, 12.2871] }, properties: { name: "Pharmaceutical Plant", aqi: 169, level: "Moderate", intensity: 0.56 } },
        { type: "Feature", geometry: { type: "Point", coordinates: [76.6128, 12.2479] }, properties: { name: "Paper Mill", aqi: 161, level: "Moderate", intensity: 0.54 } },
        { type: "Feature", geometry: { type: "Point", coordinates: [76.5944, 12.3275] }, properties: { name: "Food Processing Unit", aqi: 126, level: "Moderate", intensity: 0.42 } }
    ],
    industries: [
        { id: "ind-1", name: "ABC Steel Plant", sector: "Steel", lat: 12.3321, lng: 76.6762, sensor_name: "ABC Steel Plant Sensor" },
        { id: "ind-2", name: "Green Cement Works", sector: "Cement", lat: 12.3194, lng: 76.6581, sensor_name: "Green Cement Works Sensor" },
        { id: "ind-3", name: "Chemical Plant", sector: "Chemicals", lat: 12.3126, lng: 76.6893, sensor_name: "Chemical Plant Sensor" },
        { id: "ind-4", name: "Thermal Power Plant", sector: "Power", lat: 12.2638, lng: 76.6885, sensor_name: "Thermal Power Plant Sensor" },
        { id: "ind-5", name: "Oil Refinery", sector: "Energy", lat: 12.2529, lng: 76.6468, sensor_name: "Oil Refinery Sensor" },
        { id: "ind-6", name: "Textile Industry", sector: "Textile", lat: 12.3382, lng: 76.6161, sensor_name: "Textile Industry Sensor" },
        { id: "ind-7", name: "Mining Industry", sector: "Mining", lat: 12.3444, lng: 76.6657, sensor_name: "Mining Industry Sensor" },
        { id: "ind-8", name: "Pharmaceutical Plant", sector: "Pharma", lat: 12.2871, lng: 76.7008, sensor_name: "Pharmaceutical Plant Sensor" },
        { id: "ind-9", name: "Paper Mill", sector: "Paper", lat: 12.2479, lng: 76.6128, sensor_name: "Paper Mill Sensor" },
        { id: "ind-10", name: "Food Processing Unit", sector: "Food", lat: 12.3275, lng: 76.5944, sensor_name: "Food Processing Unit Sensor" }
    ],
    public_areas: [
        { name: "Residential Area", type: "Residential", lat: 12.3074, lng: 76.6402, population: 24000 },
        { name: "Houses", type: "Residential", lat: 12.3137, lng: 76.6248, population: 13000 },
        { name: "Devaraja Market", type: "Commercial", lat: 12.3093, lng: 76.6511, population: 6800 },
        { name: "Park", type: "Recreation", lat: 12.3148, lng: 76.6266, population: 2200 },
        { name: "School", type: "Education", lat: 12.2994, lng: 76.6199, population: 1800 },
        { name: "College", type: "Education", lat: 12.3079, lng: 76.6218, population: 3500 },
        { name: "Mall", type: "Commercial", lat: 12.2981, lng: 76.6682, population: 5200 },
        { name: "Hospital", type: "Healthcare", lat: 12.3059, lng: 76.6554, population: 2600 },
        { name: "Playground", type: "Recreation", lat: 12.2875, lng: 76.6519, population: 1200 },
        { name: "Government Office", type: "Civic", lat: 12.3126, lng: 76.6484, population: 4100 },
        { name: "Mysore Railway Station", type: "Transport", lat: 12.3052, lng: 76.6559, population: 9600 }
    ],
    roads: [
        { name: "Main Road", coordinates: [[76.593, 12.302], [76.699, 12.302]] },
        { name: "Highway", coordinates: [[76.604, 12.244], [76.704, 12.342]] },
        { name: "Ring Road", coordinates: [[76.603, 12.252], [76.692, 12.252], [76.692, 12.339], [76.603, 12.339], [76.603, 12.252]] },
        { name: "Bypass", coordinates: [[76.59, 12.291], [76.7, 12.291]] },
        { name: "Industrial Road", coordinates: [[76.625, 12.252], [76.682, 12.333]] },
        { name: "Service Road", coordinates: [[76.614, 12.268], [76.652, 12.327]] }
    ],
    network: {
        nodes: [
            { id: "station", label: "Central Monitoring Station", group: "station", title: "Central Monitoring Station" },
            { id: "ind-1", label: "ABC Steel Plant", group: "industry", title: "Steel" },
            { id: "ind-1-sensor", label: "ABC Steel Plant Sensor", group: "sensor", title: "Emission Sensor Node" },
            { id: "ind-2", label: "Green Cement Works", group: "industry", title: "Cement" },
            { id: "ind-2-sensor", label: "Green Cement Works Sensor", group: "sensor", title: "Emission Sensor Node" },
            { id: "ind-3", label: "Chemical Plant", group: "industry", title: "Chemicals" },
            { id: "ind-3-sensor", label: "Chemical Plant Sensor", group: "sensor", title: "Emission Sensor Node" },
            { id: "ind-4", label: "Thermal Power Plant", group: "industry", title: "Power" },
            { id: "ind-4-sensor", label: "Thermal Power Plant Sensor", group: "sensor", title: "Emission Sensor Node" },
            { id: "ind-5", label: "Oil Refinery", group: "industry", title: "Energy" },
            { id: "ind-5-sensor", label: "Oil Refinery Sensor", group: "sensor", title: "Emission Sensor Node" },
            { id: "ind-6", label: "Textile Industry", group: "industry", title: "Textile" },
            { id: "ind-6-sensor", label: "Textile Industry Sensor", group: "sensor", title: "Emission Sensor Node" },
            { id: "ind-7", label: "Mining Industry", group: "industry", title: "Mining" },
            { id: "ind-7-sensor", label: "Mining Industry Sensor", group: "sensor", title: "Emission Sensor Node" },
            { id: "ind-8", label: "Pharmaceutical Plant", group: "industry", title: "Pharma" },
            { id: "ind-8-sensor", label: "Pharmaceutical Plant Sensor", group: "sensor", title: "Emission Sensor Node" },
            { id: "ind-9", label: "Paper Mill", group: "industry", title: "Paper" },
            { id: "ind-9-sensor", label: "Paper Mill Sensor", group: "sensor", title: "Emission Sensor Node" },
            { id: "ind-10", label: "Food Processing Unit", group: "industry", title: "Food" },
            { id: "ind-10-sensor", label: "Food Processing Unit Sensor", group: "sensor", title: "Emission Sensor Node" }
        ],
        edges: [
            { from: "ind-1", to: "ind-1-sensor" }, { from: "ind-1-sensor", to: "station" },
            { from: "ind-2", to: "ind-2-sensor" }, { from: "ind-2-sensor", to: "station" },
            { from: "ind-3", to: "ind-3-sensor" }, { from: "ind-3-sensor", to: "station" },
            { from: "ind-4", to: "ind-4-sensor" }, { from: "ind-4-sensor", to: "station" },
            { from: "ind-5", to: "ind-5-sensor" }, { from: "ind-5-sensor", to: "station" },
            { from: "ind-6", to: "ind-6-sensor" }, { from: "ind-6-sensor", to: "station" },
            { from: "ind-7", to: "ind-7-sensor" }, { from: "ind-7-sensor", to: "station" },
            { from: "ind-8", to: "ind-8-sensor" }, { from: "ind-8-sensor", to: "station" },
            { from: "ind-9", to: "ind-9-sensor" }, { from: "ind-9-sensor", to: "station" },
            { from: "ind-10", to: "ind-10-sensor" }, { from: "ind-10-sensor", to: "station" }
        ]
    },
    nearby_industries: [
        { name: "ABC Steel Plant", distance_km: 2.4, aqi: 241, pollution_level: "High", compliance: "Violation" },
        { name: "Thermal Power Plant", distance_km: 4.9, aqi: 238, pollution_level: "High", compliance: "Violation" },
        { name: "Chemical Plant", distance_km: 5.8, aqi: 233, pollution_level: "High", compliance: "Violation" },
        { name: "Oil Refinery", distance_km: 3.1, aqi: 214, pollution_level: "High", compliance: "Violation" },
        { name: "Green Cement Works", distance_km: 1.8, aqi: 198, pollution_level: "Moderate", compliance: "Warning" }
    ],
    highest_polluter: { name: "ABC Steel Plant", aqi: 241, compliance: "Violation", status: "High" },
    pollution_spread: [
        { distance_km: 0, impact_percent: 100, estimated_aqi: 241 },
        { distance_km: 2, impact_percent: 70, estimated_aqi: 168.7 },
        { distance_km: 5, impact_percent: 40, estimated_aqi: 96.4 },
        { distance_km: 10, impact_percent: 10, estimated_aqi: 24.1 }
    ],
    recommendations: [
        "Reduce production during peak emission windows.",
        "Install or service scrubbers and particulate filters.",
        "Switch to cleaner fuel mix for the next shift.",
        "Issue public alerts for nearby schools, hospitals, and houses."
    ],
    ranking: [
        { name: "ABC Steel Plant", aqi: 241, compliance: "Violation", status: "High" },
        { name: "Thermal Power Plant", aqi: 238, compliance: "Violation", status: "High" },
        { name: "Chemical Plant", aqi: 233, compliance: "Violation", status: "High" },
        { name: "Oil Refinery", aqi: 214, compliance: "Violation", status: "High" },
        { name: "Green Cement Works", aqi: 198, compliance: "Warning", status: "Moderate" }
    ],
    compliance: [
        { name: "ABC Steel Plant", status: "Violation", aqi: 241 },
        { name: "Thermal Power Plant", status: "Violation", aqi: 238 },
        { name: "Chemical Plant", status: "Violation", aqi: 233 },
        { name: "Oil Refinery", status: "Violation", aqi: 214 },
        { name: "Green Cement Works", status: "Warning", aqi: 198 },
        { name: "Mining Industry", status: "Warning", aqi: 193 },
        { name: "Pharmaceutical Plant", status: "Warning", aqi: 169 },
        { name: "Paper Mill", status: "Warning", aqi: 161 },
        { name: "Textile Industry", status: "Warning", aqi: 154 },
        { name: "Food Processing Unit", status: "Compliant", aqi: 126 }
    ],
    alerts: [
        "High pollution near ABC Steel Plant",
        "AQI will exceed 250 soon"
    ],
    impact_analysis: [
        { name: "Residential Area", type: "Residential", distance_km: 2.8, population: 24000 },
        { name: "School", type: "Education", distance_km: 2.1, population: 1800 },
        { name: "College", type: "Education", distance_km: 3.5, population: 3500 },
        { name: "Hospital", type: "Healthcare", distance_km: 2.7, population: 2600 },
        { name: "Houses", type: "Residential", distance_km: 3.2, population: 13000 },
        { name: "Railway Station", type: "Transport", distance_km: 4.1, population: 9600 }
    ]
};

window.ECOWATCH_DEMO_RAG = [
    {
        title: "AQI Escalation Bands",
        category: "regulation",
        industry: "all",
        content: "AQI below 130 is treated as compliant, AQI from 130 to 199 is a warning band, and AQI 200 or above is a violation band requiring intervention and public risk review."
    },
    {
        title: "Steel Plant Emission Controls",
        category: "mitigation",
        industry: "ABC Steel Plant",
        content: "Steel facilities with elevated PM10 and SO2 should inspect bag filters, sinter dust capture systems, reduce furnace throughput during peaks, and increase dust suppression on material handling routes."
    },
    {
        title: "Thermal Power Plant Guidance",
        category: "mitigation",
        industry: "Thermal Power Plant",
        content: "Thermal power units showing high SO2 should prioritize flue gas desulfurization checks, fuel sulfur review, combustion optimization, and output curtailment when predictive AQI remains elevated."
    },
    {
        title: "Chemical Plant Anomaly Review",
        category: "investigation",
        industry: "Chemical Plant",
        content: "Chemical facilities with anomaly spikes should inspect vent scrubbers, fugitive leak points, storage transfer events, and emergency flaring logs before normal operations resume."
    },
    {
        title: "Sensitive Zone Protection",
        category: "impact",
        industry: "all",
        content: "Schools, hospitals, and dense residential clusters inside the active radius should receive priority notifications and faster operational mitigation."
    }
];
