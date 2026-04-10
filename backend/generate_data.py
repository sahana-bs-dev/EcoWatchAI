from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from random import Random


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

rng = Random(42)

industries = [
    {"id": "ind-1", "name": "ABC Steel Plant", "sector": "Steel", "lat": 28.6112, "lng": 77.2450, "base_aqi": 228},
    {"id": "ind-2", "name": "Green Cement Works", "sector": "Cement", "lat": 28.6030, "lng": 77.2282, "base_aqi": 182},
    {"id": "ind-3", "name": "Chemical Plant", "sector": "Chemicals", "lat": 28.6175, "lng": 77.2681, "base_aqi": 219},
    {"id": "ind-4", "name": "Thermal Power Plant", "sector": "Power", "lat": 28.5901, "lng": 77.2614, "base_aqi": 224},
    {"id": "ind-5", "name": "Oil Refinery", "sector": "Energy", "lat": 28.5837, "lng": 77.2359, "base_aqi": 205},
    {"id": "ind-6", "name": "Textile Industry", "sector": "Textile", "lat": 28.6288, "lng": 77.2196, "base_aqi": 149},
    {"id": "ind-7", "name": "Mining Industry", "sector": "Mining", "lat": 28.6320, "lng": 77.2533, "base_aqi": 191},
    {"id": "ind-8", "name": "Pharmaceutical Plant", "sector": "Pharma", "lat": 28.6002, "lng": 77.2748, "base_aqi": 164},
    {"id": "ind-9", "name": "Paper Mill", "sector": "Paper", "lat": 28.5739, "lng": 77.2178, "base_aqi": 156},
    {"id": "ind-10", "name": "Food Processing Unit", "sector": "Food", "lat": 28.6201, "lng": 77.2030, "base_aqi": 121},
]

for industry in industries:
    industry["sensor_name"] = f"{industry['name']} Sensor"

public_areas = [
    {"name": "Residential Area", "type": "Residential", "lat": 28.6107, "lng": 77.2137, "population": 24000},
    {"name": "Houses", "type": "Residential", "lat": 28.5955, "lng": 77.2144, "population": 13000},
    {"name": "Market", "type": "Commercial", "lat": 28.6070, "lng": 77.2295, "population": 6800},
    {"name": "Park", "type": "Recreation", "lat": 28.6150, "lng": 77.2320, "population": 2200},
    {"name": "School", "type": "Education", "lat": 28.5998, "lng": 77.2206, "population": 1800},
    {"name": "College", "type": "Education", "lat": 28.6234, "lng": 77.2267, "population": 3500},
    {"name": "Mall", "type": "Commercial", "lat": 28.6042, "lng": 77.2416, "population": 5200},
    {"name": "Hospital", "type": "Healthcare", "lat": 28.5937, "lng": 77.2478, "population": 2600},
    {"name": "Playground", "type": "Recreation", "lat": 28.6182, "lng": 77.2402, "population": 1200},
    {"name": "Government Office", "type": "Civic", "lat": 28.6088, "lng": 77.2514, "population": 4100},
    {"name": "Railway Station", "type": "Transport", "lat": 28.5874, "lng": 77.2287, "population": 9600},
]

roads = [
    {"name": "Main Road", "coordinates": [[77.197, 28.599], [77.275, 28.599]]},
    {"name": "Highway", "coordinates": [[77.204, 28.582], [77.282, 28.632]]},
    {"name": "Ring Road", "coordinates": [[77.212, 28.575], [77.274, 28.575], [77.274, 28.631], [77.212, 28.631], [77.212, 28.575]]},
    {"name": "Bypass", "coordinates": [[77.190, 28.612], [77.278, 28.612]]},
    {"name": "Industrial Road", "coordinates": [[77.223, 28.581], [77.255, 28.625]]},
    {"name": "Service Road", "coordinates": [[77.214, 28.585], [77.238, 28.621]]},
]

records = []
start = datetime(2026, 4, 1, 0, 0, 0)
for hour in range(24):
    ts = (start + timedelta(hours=hour)).isoformat()
    cycle = 1 + ((hour - 13) ** 2 / 60)
    for industry in industries:
        base = industry["base_aqi"]
        drift = rng.uniform(-12, 14)
        surge = 22 if (industry["name"] in {"ABC Steel Plant", "Thermal Power Plant", "Chemical Plant"} and hour in {8, 14, 19}) else 0
        aqi = max(58, round(base - cycle * 5 + drift + surge, 2))
        co2 = round(80 + aqi * 0.48 + rng.uniform(-8, 10), 2)
        so2 = round(18 + aqi * 0.21 + rng.uniform(-5, 6), 2)
        no2 = round(14 + aqi * 0.17 + rng.uniform(-4, 5), 2)
        pm25 = round(22 + aqi * 0.31 + rng.uniform(-6, 8), 2)
        pm10 = round(35 + aqi * 0.44 + rng.uniform(-8, 10), 2)
        records.append(
            {
                "timestamp": ts,
                "industry": industry["name"],
                "aqi": aqi,
                "co2": co2,
                "so2": so2,
                "no2": no2,
                "pm25": pm25,
                "pm10": pm10,
            }
        )

locations = {
    "map_center": {"lat": 28.6037, "lng": 77.2394},
    "monitoring_station": {
        "name": "Central Monitoring Station",
        "lat": 28.6064,
        "lng": 77.2381,
    },
    "industries": industries,
    "public_areas": public_areas,
    "roads": roads,
}

with (DATA_DIR / "emissions_history.json").open("w", encoding="utf-8") as file:
    json.dump({"records": records}, file, indent=2)

with (DATA_DIR / "locations.json").open("w", encoding="utf-8") as file:
    json.dump(locations, file, indent=2)
