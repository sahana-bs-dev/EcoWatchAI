from __future__ import annotations

import json
import math
import os
import random
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
DATA_DIR = PROJECT_DIR / "backend" / "data"
EMISSIONS_FILE = DATA_DIR / "emissions_history.json"
LOCATIONS_FILE = DATA_DIR / "locations.json"
KNOWLEDGE_FILE = DATA_DIR / "knowledge_base.json"
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"
OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
MYSORE_CENTER = {"lat": 12.2958, "lng": 76.6394, "name": "Mysore, Karnataka"}
CITY_ENTITY_RADIUS_KM = 18


def load_env_file() -> None:
    env_path = PROJECT_DIR / "backend" / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env_file()
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")


app = Flask(__name__)
CORS(app)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def fetch_remote_json(base_url: str, params: dict[str, Any]) -> Any:
    query = urlencode(params)
    with urlopen(f"{base_url}?{query}", timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_remote_raw(base_url: str, params: dict[str, Any]) -> Any:
    query = urlencode(params)
    request_url = f"{base_url}?{query}"
    request = __import__("urllib.request").request.Request(
        request_url,
        headers={"User-Agent": "EcoWatchAI/1.0"},
    )
    with urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_place_suggestions(query: str, city_hint: str = "Mysore, Karnataka, India") -> list[dict[str, Any]]:
    cleaned = query.strip()
    if not cleaned:
        return []

    try:
        results = fetch_remote_raw(
            NOMINATIM_SEARCH_URL,
            {
                "q": f"{cleaned}, {city_hint}",
                "format": "jsonv2",
                "limit": 8,
                "addressdetails": 1,
            },
        )
    except Exception:
        return []

    suggestions = []
    seen = set()
    for item in results:
        display_name = item.get("display_name", "")
        key = (item.get("lat"), item.get("lon"), display_name)
        if key in seen:
            continue
        seen.add(key)
        suggestions.append(
            {
                "name": display_name.split(",")[0],
                "display_name": display_name,
                "lat": float(item["lat"]),
                "lng": float(item["lon"]),
                "type": item.get("type", "place"),
            }
        )
    return suggestions


EMISSIONS_DATA = load_json(EMISSIONS_FILE)
LOCATION_DATA = load_json(LOCATIONS_FILE)
KNOWLEDGE_DATA = load_json(KNOWLEDGE_FILE)["documents"]
INDUSTRIES = LOCATION_DATA["industries"]
PUBLIC_AREAS = LOCATION_DATA["public_areas"]
MONITORING_STATION = LOCATION_DATA["monitoring_station"]


def aqi_status(aqi: float) -> str:
    if aqi < 100:
        return "Low"
    if aqi < 180:
        return "Moderate"
    if aqi < 250:
        return "High"
    return "Severe"


def compliance_status(aqi: float) -> str:
    if aqi < 130:
        return "Compliant"
    if aqi < 200:
        return "Warning"
    return "Violation"


def recommendation_bundle(aqi: float) -> list[str]:
    recommendations = []
    if aqi >= 90:
        recommendations.append("Reduce production during peak emission windows.")
    if aqi >= 130:
        recommendations.append("Install or service scrubbers and particulate filters.")
    if aqi >= 170:
        recommendations.append("Switch to cleaner fuel mix for the next shift.")
    if aqi >= 220:
        recommendations.append("Issue public alerts for nearby schools, hospitals, and houses.")
    if not recommendations:
        recommendations.append("Maintain current controls and continue monitoring.")
    return recommendations


def eco_score(aqi: float) -> int:
    return max(0, min(100, round(100 - (aqi / 3))))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def normalize_pollution_level(aqi: float) -> str:
    if aqi >= 200:
        return "High"
    if aqi >= 120:
        return "Moderate"
    return "Low"


def build_models() -> tuple[LinearRegression, IsolationForest]:
    rows = EMISSIONS_DATA["records"]
    x_reg = []
    y_reg = []
    x_iso = []

    for idx, row in enumerate(rows):
        x_reg.append(
            [
                idx,
                row["co2"],
                row["so2"],
                row["no2"],
                row["pm25"],
                row["pm10"],
            ]
        )
        y_reg.append(row["aqi"])
        x_iso.append(
            [
                row["aqi"],
                row["co2"],
                row["so2"],
                row["no2"],
                row["pm25"],
                row["pm10"],
            ]
        )

    regression = LinearRegression()
    regression.fit(np.array(x_reg), np.array(y_reg))

    anomaly = IsolationForest(
        contamination=0.08,
        random_state=42,
        n_estimators=120,
    )
    anomaly.fit(np.array(x_iso))
    return regression, anomaly


REGRESSION_MODEL, ANOMALY_MODEL = build_models()


def build_retriever() -> tuple[TfidfVectorizer, Any]:
    corpus = [
        f"{doc['title']} {doc['category']} {doc['industry']} {doc['content']}"
        for doc in KNOWLEDGE_DATA
    ]
    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform(corpus)
    return vectorizer, matrix


RAG_VECTORIZER, RAG_MATRIX = build_retriever()


def latest_industry_snapshot() -> dict[str, dict[str, Any]]:
    snapshot: dict[str, dict[str, Any]] = {}
    for row in EMISSIONS_DATA["records"]:
        snapshot[row["industry"]] = row
    return snapshot


def build_heatmap_points() -> list[dict[str, Any]]:
    snapshot = latest_industry_snapshot()
    points = []
    for industry in INDUSTRIES:
        row = snapshot[industry.get("data_key", industry["name"])]
        points.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [industry["lng"], industry["lat"]],
                },
                "properties": {
                    "name": industry["name"],
                    "aqi": row["aqi"],
                    "level": normalize_pollution_level(row["aqi"]),
                    "intensity": min(1, row["aqi"] / 300),
                },
            }
        )
    return points


def build_timeseries() -> dict[str, Any]:
    grouped = defaultdict(list)
    for row in EMISSIONS_DATA["records"]:
        grouped[row["timestamp"]].append(row)

    ordered_keys = sorted(grouped.keys())
    history = []
    for ts in ordered_keys:
        bucket = grouped[ts]
        history.append(
            {
                "timestamp": ts,
                "aqi": round(sum(item["aqi"] for item in bucket) / len(bucket), 2),
                "co2": round(sum(item["co2"] for item in bucket) / len(bucket), 2),
                "so2": round(sum(item["so2"] for item in bucket) / len(bucket), 2),
                "no2": round(sum(item["no2"] for item in bucket) / len(bucket), 2),
                "pm25": round(sum(item["pm25"] for item in bucket) / len(bucket), 2),
                "pm10": round(sum(item["pm10"] for item in bucket) / len(bucket), 2),
            }
        )
    return {
        "history": history[:-1],
        "current": history[-1],
    }


def predict_aqi_from_payload(payload: dict[str, Any]) -> float:
    history_len = len(EMISSIONS_DATA["records"])
    features = np.array(
        [
            [
                history_len,
                payload["co2"],
                payload["so2"],
                payload["no2"],
                payload["pm25"],
                payload["pm10"],
            ]
        ]
    )
    return float(REGRESSION_MODEL.predict(features)[0])


def anomaly_from_payload(payload: dict[str, Any]) -> bool:
    features = np.array(
        [
            [
                payload["aqi"],
                payload["co2"],
                payload["so2"],
                payload["no2"],
                payload["pm25"],
                payload["pm10"],
            ]
        ]
    )
    return bool(ANOMALY_MODEL.predict(features)[0] == -1)


def nearest_industries(lat: float, lng: float, radius_km: float) -> list[dict[str, Any]]:
    snapshot = latest_industry_snapshot()
    nearby = []
    for industry in INDUSTRIES:
        distance = haversine_km(lat, lng, industry["lat"], industry["lng"])
        if distance <= radius_km:
            row = snapshot[industry.get("data_key", industry["name"])]
            nearby.append(
                {
                    "name": industry["name"],
                    "distance_km": round(distance, 2),
                    "aqi": row["aqi"],
                    "pollution_level": normalize_pollution_level(row["aqi"]),
                    "compliance": compliance_status(row["aqi"]),
                }
            )

    nearby.sort(key=lambda item: item["aqi"], reverse=True)
    return nearby


def affected_zones(lat: float, lng: float, radius_km: float) -> list[dict[str, Any]]:
    return affected_zones_from_areas(PUBLIC_AREAS, lat, lng, radius_km)


def pollution_spread(source_aqi: float) -> list[dict[str, Any]]:
    return [
        {"distance_km": 0, "impact_percent": 100, "estimated_aqi": round(source_aqi, 1)},
        {"distance_km": 2, "impact_percent": 70, "estimated_aqi": round(source_aqi * 0.7, 1)},
        {"distance_km": 5, "impact_percent": 40, "estimated_aqi": round(source_aqi * 0.4, 1)},
        {"distance_km": 10, "impact_percent": 10, "estimated_aqi": round(source_aqi * 0.1, 1)},
    ]


def ranking() -> list[dict[str, Any]]:
    snapshot = latest_industry_snapshot()
    ordered = []
    for industry in INDUSTRIES:
        row = snapshot[industry.get("data_key", industry["name"])]
        ordered.append(
            {
                "name": industry["name"],
                "aqi": row["aqi"],
                "compliance": compliance_status(row["aqi"]),
                "status": normalize_pollution_level(row["aqi"]),
            }
        )
    ordered.sort(key=lambda item: item["aqi"], reverse=True)
    return ordered


def build_network() -> dict[str, Any]:
    return build_network_from_industries(INDUSTRIES)


def build_network_from_industries(industry_list: list[dict[str, Any]]) -> dict[str, Any]:
    nodes = []
    edges = []

    nodes.append(
        {
            "id": "station",
            "label": MONITORING_STATION["name"],
            "group": "station",
            "title": "Central Monitoring Station",
        }
    )

    for industry in industry_list:
        industry_id = industry["id"]
        sensor_id = f"{industry_id}-sensor"
        nodes.append(
            {
                "id": industry_id,
                "label": industry["name"],
                "group": "industry",
                "title": industry["sector"],
            }
        )
        nodes.append(
            {
                "id": sensor_id,
                "label": industry["sensor_name"],
                "group": "sensor",
                "title": "Emission Sensor Node",
            }
        )
        edges.append({"from": industry_id, "to": sensor_id})
        edges.append({"from": sensor_id, "to": "station"})

    return {"nodes": nodes, "edges": edges}


def estimate_industry_risk_score(
    live_aqi: float,
    distance_km: float,
    tags: dict[str, Any],
) -> float:
    name_blob = " ".join(str(value).lower() for value in tags.values())
    sector_weight = 1.0
    if any(keyword in name_blob for keyword in ["chemical", "paint", "tyre", "steel", "cement", "power", "energy", "refinery"]):
        sector_weight = 1.18
    elif any(keyword in name_blob for keyword in ["food", "packaging", "textile", "silk"]):
        sector_weight = 0.9

    distance_weight = max(0.35, 1.4 - (distance_km / 10))
    return round(live_aqi * sector_weight * distance_weight, 2)


def fetch_live_industries(lat: float, lng: float, radius_km: float, live_aqi: float) -> list[dict[str, Any]]:
    radius_m = int(radius_km * 1000)
    overpass_query = f"""
    [out:json][timeout:12];
    (
      node(around:{radius_m},{lat},{lng})["man_made"="works"];
      way(around:{radius_m},{lat},{lng})["man_made"="works"];
      relation(around:{radius_m},{lat},{lng})["man_made"="works"];
      node(around:{radius_m},{lat},{lng})["landuse"="industrial"];
      way(around:{radius_m},{lat},{lng})["landuse"="industrial"];
      relation(around:{radius_m},{lat},{lng})["landuse"="industrial"];
      node(around:{radius_m},{lat},{lng})["industrial"];
      way(around:{radius_m},{lat},{lng})["industrial"];
      relation(around:{radius_m},{lat},{lng})["industrial"];
      node(around:{radius_m},{lat},{lng})["office"="company"];
      way(around:{radius_m},{lat},{lng})["office"="company"];
      relation(around:{radius_m},{lat},{lng})["office"="company"];
    );
    out center tags;
    """

    try:
        payload = fetch_remote_raw(OVERPASS_API_URL, {"data": overpass_query})
    except Exception:
        return []

    seen_names: set[str] = set()
    industries: list[dict[str, Any]] = []
    for element in payload.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name")
        if not name or name in seen_names:
            continue

        element_lat = element.get("lat") or element.get("center", {}).get("lat")
        element_lng = element.get("lon") or element.get("center", {}).get("lon")
        if element_lat is None or element_lng is None:
            continue

        distance = haversine_km(lat, lng, element_lat, element_lng)
        if distance > radius_km:
            continue

        seen_names.add(name)
        estimated_aqi = estimate_industry_risk_score(live_aqi, distance, tags)
        industries.append(
            {
                "id": f"osm-{element.get('type', 'node')}-{element.get('id')}",
                "name": name,
                "lat": element_lat,
                "lng": element_lng,
                "sector": tags.get("industrial") or tags.get("man_made") or tags.get("landuse") or "industrial",
                "sensor_name": f"{name} Sensor",
                "distance_km": round(distance, 2),
                "aqi": estimated_aqi,
                "pollution_level": normalize_pollution_level(estimated_aqi),
                "compliance": compliance_status(estimated_aqi),
                "source": "openstreetmap-overpass",
                "estimated": True,
            }
        )

    industries.sort(key=lambda item: item["aqi"], reverse=True)
    return industries[:10]


def fetch_live_public_entities(lat: float, lng: float, radius_km: float) -> list[dict[str, Any]]:
    radius_m = int(max(radius_km, CITY_ENTITY_RADIUS_KM) * 1000)
    overpass_query = f"""
    [out:json][timeout:14];
    (
      node(around:{radius_m},{lat},{lng})["amenity"~"hospital|clinic|college|university|school|marketplace|bus_station"];
      way(around:{radius_m},{lat},{lng})["amenity"~"hospital|clinic|college|university|school|marketplace|bus_station"];
      relation(around:{radius_m},{lat},{lng})["amenity"~"hospital|clinic|college|university|school|marketplace|bus_station"];
      node(around:{radius_m},{lat},{lng})["leisure"="park"];
      way(around:{radius_m},{lat},{lng})["leisure"="park"];
      relation(around:{radius_m},{lat},{lng})["leisure"="park"];
      node(around:{radius_m},{lat},{lng})["office"="government"];
      way(around:{radius_m},{lat},{lng})["office"="government"];
      relation(around:{radius_m},{lat},{lng})["office"="government"];
      node(around:{radius_m},{lat},{lng})["railway"="station"];
      way(around:{radius_m},{lat},{lng})["railway"="station"];
      relation(around:{radius_m},{lat},{lng})["railway"="station"];
    );
    out center tags;
    """

    try:
        payload = fetch_remote_raw(OVERPASS_API_URL, {"data": overpass_query})
    except Exception:
        return []

    entities: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    for element in payload.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name")
        if not name or name in seen_names:
            continue

        element_lat = element.get("lat") or element.get("center", {}).get("lat")
        element_lng = element.get("lon") or element.get("center", {}).get("lon")
        if element_lat is None or element_lng is None:
            continue

        distance = haversine_km(lat, lng, element_lat, element_lng)
        seen_names.add(name)
        entity_type = (
            tags.get("amenity")
            or tags.get("leisure")
            or tags.get("office")
            or tags.get("railway")
            or "place"
        )
        population = 0
        if entity_type in {"college", "university", "school"}:
            population = 1500
        elif entity_type in {"hospital", "clinic"}:
            population = 2500
        elif entity_type in {"marketplace", "bus_station", "station"}:
            population = 5000
        elif entity_type == "park":
            population = 1000
        else:
            population = 2200

        entities.append(
            {
                "name": name,
                "type": entity_type.replace("_", " ").title(),
                "lat": element_lat,
                "lng": element_lng,
                "distance_km": round(distance, 2),
                "population": population,
                "source": "openstreetmap-overpass",
            }
        )

    entities.sort(key=lambda item: (item["type"], item["name"]))
    return entities[:120]


def affected_zones_from_areas(areas: list[dict[str, Any]], lat: float, lng: float, radius_km: float) -> list[dict[str, Any]]:
    zones = []
    for area in areas:
        distance = haversine_km(lat, lng, area["lat"], area["lng"])
        if distance <= radius_km:
            zones.append(
                {
                    "name": area["name"],
                    "type": area["type"],
                    "distance_km": round(distance, 2),
                    "population": area.get("population", 0),
                }
            )
    zones.sort(key=lambda item: item["distance_km"])
    return zones


def openweather_band_to_aqi(band: int) -> int:
    return {
        1: 55,
        2: 95,
        3: 145,
        4: 215,
        5: 285,
    }.get(band, 120)


def fetch_live_environment(lat: float, lng: float) -> dict[str, Any] | None:
    if not OPENWEATHER_API_KEY:
        return None

    try:
        air_data = fetch_remote_json(
            f"{OPENWEATHER_BASE_URL}/air_pollution",
            {"lat": lat, "lon": lng, "appid": OPENWEATHER_API_KEY},
        )
        weather_data = fetch_remote_json(
            f"{OPENWEATHER_BASE_URL}/weather",
            {"lat": lat, "lon": lng, "appid": OPENWEATHER_API_KEY, "units": "metric"},
        )
        air_point = air_data["list"][0]
        components = air_point["components"]
        band = air_point["main"]["aqi"]
        aqi_value = openweather_band_to_aqi(band)
        return {
            "source": "openweather",
            "aqi": aqi_value,
            "band": band,
            "weather": {
                "temperature_c": weather_data["main"]["temp"],
                "humidity": weather_data["main"]["humidity"],
                "wind_speed": weather_data["wind"].get("speed", 0),
                "wind_deg": weather_data["wind"].get("deg", 0),
                "conditions": weather_data["weather"][0]["description"],
            },
            "pollutants": {
                "timestamp": datetime.utcnow().isoformat(),
                "aqi": aqi_value,
                "co2": round(max(120.0, components.get("co", 0.0) * 0.14), 2),
                "so2": round(components.get("so2", 0.0), 2),
                "no2": round(components.get("no2", 0.0), 2),
                "pm25": round(components.get("pm2_5", 0.0), 2),
                "pm10": round(components.get("pm10", 0.0), 2),
            },
        }
    except Exception:
        return None


def retrieve_documents(question: str, industry: str | None = None, top_k: int = 3) -> list[dict[str, Any]]:
    query = question.strip()
    if industry:
        query = f"{query} {industry}"
    query_vector = RAG_VECTORIZER.transform([query])
    scores = cosine_similarity(query_vector, RAG_MATRIX).flatten()

    scored_docs = []
    for index, score in enumerate(scores):
        doc = KNOWLEDGE_DATA[index]
        industry_match = industry and (doc["industry"] == industry or doc["industry"] == "all")
        adjusted = float(score + (0.15 if industry_match else 0))
        scored_docs.append((adjusted, doc))

    scored_docs.sort(key=lambda item: item[0], reverse=True)
    return [
        {
            "id": doc["id"],
            "title": doc["title"],
            "category": doc["category"],
            "industry": doc["industry"],
            "content": doc["content"],
            "score": round(score, 4),
        }
        for score, doc in scored_docs[:top_k]
    ]


def generate_rag_answer(question: str, industry: str | None, aqi: float | None, docs: list[dict[str, Any]]) -> str:
    focus = industry or "the selected industrial zone"
    opening = f"For {focus}, the retrieved guidance suggests"

    if aqi is not None and aqi >= 250:
        opening += " immediate escalation because AQI is in or near the severe band."
    elif aqi is not None and aqi >= 200:
        opening += " violation-level controls because AQI is already above the intervention threshold."
    elif aqi is not None and aqi >= 130:
        opening += " warning-level controls and tighter observation because AQI is elevated."
    else:
        opening += " continued monitoring with targeted preventive maintenance."

    insights = " ".join(doc["content"] for doc in docs[:2])
    closing = " Use this as grounded decision support for compliance review, mitigation planning, and public communication."
    return f"{opening} {insights}{closing}"


@app.get("/health")
def health() -> Any:
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


@app.get("/places")
def places() -> Any:
    query = request.args.get("query", "").strip()
    city_hint = request.args.get("city", "Mysore, Karnataka, India").strip()
    if not query:
        return jsonify({"places": []})
    return jsonify({"places": fetch_place_suggestions(query, city_hint)})


@app.get("/dashboard-data")
def dashboard_data() -> Any:
    center = LOCATION_DATA.get("map_center", MYSORE_CENTER)
    radius_km = float(request.args.get("radius", 10))
    lat = float(request.args.get("lat", center.get("lat", MYSORE_CENTER["lat"])))
    lng = float(request.args.get("lng", center.get("lng", MYSORE_CENTER["lng"])))

    timeseries = build_timeseries()
    current = dict(timeseries["current"])
    live_environment = fetch_live_environment(lat, lng)
    if live_environment:
        current.update(live_environment["pollutants"])
    predicted = predict_aqi_from_payload(current)
    live_industries = fetch_live_industries(lat, lng, radius_km, current["aqi"])
    use_live_industries = len(live_industries) > 0
    nearby = live_industries if use_live_industries else nearest_industries(lat, lng, radius_km)
    live_public_areas = fetch_live_public_entities(lat, lng, radius_km)
    use_live_public_areas = len(live_public_areas) > 0
    display_public_areas = live_public_areas if use_live_public_areas else PUBLIC_AREAS
    impacted = affected_zones_from_areas(display_public_areas, lat, lng, radius_km)
    ranked = (
        [
            {
                "name": item["name"],
                "aqi": item["aqi"],
                "compliance": item["compliance"],
                "status": item["pollution_level"],
            }
            for item in live_industries
        ]
        if use_live_industries
        else ranking()
    )
    highest = ranked[0]
    display_industries = (
        [
            {
                "id": item["id"],
                "name": item["name"],
                "sector": item["sector"],
                "lat": item["lat"],
                "lng": item["lng"],
                "sensor_name": item["sensor_name"],
            }
            for item in live_industries
        ]
        if use_live_industries
        else INDUSTRIES
    )
    display_network = (
        build_network_from_industries(display_industries)
        if use_live_industries
        else build_network()
    )
    display_heatmap = (
        [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [item["lng"], item["lat"]],
                },
                "properties": {
                    "name": item["name"],
                    "aqi": item["aqi"],
                    "level": item["pollution_level"],
                    "intensity": min(1, item["aqi"] / 300),
                    "estimated": True,
                },
            }
            for item in live_industries
        ]
        if use_live_industries
        else build_heatmap_points()
    )

    return jsonify(
        {
            "map_center": center,
            "monitoring_station": MONITORING_STATION,
            "selected_location": {"lat": lat, "lng": lng, "radius_km": radius_km},
            "aqi": {
                "value": current["aqi"],
                "status": aqi_status(current["aqi"]),
                "eco_score": eco_score(current["aqi"]),
                "predicted": round(predicted, 2),
            },
            "pollutants": current,
            "history": timeseries["history"][-12:],
            "heatmap": display_heatmap,
            "industries": display_industries,
            "public_areas": display_public_areas,
            "roads": LOCATION_DATA["roads"],
            "network": display_network,
            "nearby_industries": nearby,
            "highest_polluter": highest,
            "pollution_spread": pollution_spread(highest["aqi"]),
            "recommendations": recommendation_bundle(current["aqi"]),
            "ranking": ranked[:5],
            "compliance": [
                {
                    "name": item["name"],
                    "status": item["compliance"],
                    "aqi": item["aqi"],
                }
                for item in ranked
            ],
            "alerts": [
                f"High pollution near {highest['name']}",
                (
                    f"AQI will exceed 250 soon"
                    if predicted >= 250
                    else f"Predicted AQI is trending toward {round(predicted)}"
                ),
            ],
            "impact_analysis": impacted,
            "live_environment": live_environment,
            "industry_data_mode": "live_osm_estimated" if use_live_industries else "curated_demo",
            "place_data_mode": "live_osm" if use_live_public_areas else "curated_demo",
            "rag_preview": retrieve_documents(
                f"compliance and mitigation guidance for {highest['name']}",
                highest["name"],
                top_k=2,
            ),
        }
    )


@app.post("/predict")
def predict() -> Any:
    payload = request.get_json(silent=True) or {}
    defaults = {
        "co2": 168.0,
        "so2": 62.0,
        "no2": 48.0,
        "pm25": 82.0,
        "pm10": 128.0,
    }
    merged = {**defaults, **payload}
    predicted = predict_aqi_from_payload(merged)
    return jsonify(
        {
            "predicted_aqi": round(predicted, 2),
            "status": aqi_status(predicted),
        }
    )


@app.post("/anomaly")
def anomaly() -> Any:
    payload = request.get_json(silent=True) or {}
    defaults = {
        "aqi": 168.0,
        "co2": 168.0,
        "so2": 62.0,
        "no2": 48.0,
        "pm25": 82.0,
        "pm10": 128.0,
    }
    merged = {**defaults, **payload}
    is_anomaly = anomaly_from_payload(merged)
    return jsonify(
        {
            "anomaly": is_anomaly,
            "message": "Unusual emission spike detected" if is_anomaly else "Emission pattern within expected range",
        }
    )


@app.get("/simulate")
def simulate() -> Any:
    timeseries = build_timeseries()
    current = dict(timeseries["current"])
    live_environment = fetch_live_environment(MYSORE_CENTER["lat"], MYSORE_CENTER["lng"])
    if live_environment:
        current.update(live_environment["pollutants"])
    spike = random.random() < 0.18
    variation = random.uniform(3, 11)

    if spike:
        current["aqi"] += random.uniform(40, 85)
        current["pm25"] += random.uniform(12, 28)
        current["pm10"] += random.uniform(15, 36)
        current["so2"] += random.uniform(8, 22)
        current["co2"] += random.uniform(20, 45)
    else:
        current["aqi"] += random.uniform(-variation, variation)
        current["pm25"] += random.uniform(-5, 8)
        current["pm10"] += random.uniform(-6, 10)
        current["so2"] += random.uniform(-3, 6)
        current["no2"] += random.uniform(-3, 5)
        current["co2"] += random.uniform(-8, 15)

    current["aqi"] = round(max(52, current["aqi"]), 2)
    current["co2"] = round(max(70, current["co2"]), 2)
    current["so2"] = round(max(12, current["so2"]), 2)
    current["no2"] = round(max(10, current["no2"]), 2)
    current["pm25"] = round(max(18, current["pm25"]), 2)
    current["pm10"] = round(max(30, current["pm10"]), 2)

    predicted = predict_aqi_from_payload(current)
    anomaly_flag = anomaly_from_payload(current)
    ranked = ranking()
    highest = ranked[0]

    return jsonify(
        {
            "current": {
                "aqi": current["aqi"],
                "status": aqi_status(current["aqi"]),
                "eco_score": eco_score(current["aqi"]),
                "pollutants": current,
            },
            "prediction": {
                "predicted_aqi": round(predicted, 2),
                "status": aqi_status(predicted),
            },
            "anomaly": {
                "anomaly": anomaly_flag,
                "message": "Unusual emission spike detected" if anomaly_flag else "",
            },
            "alerts": [
                f"High pollution near {highest['name']}",
                "AQI will exceed 250 soon" if predicted >= 250 else "Monitoring remains active across the ring road belt",
            ],
            "recommendations": recommendation_bundle(current["aqi"]),
            "timestamp": datetime.utcnow().isoformat(),
            "spike": spike,
            "live_environment": live_environment,
        }
    )


@app.post("/rag-query")
def rag_query() -> Any:
    payload = request.get_json(silent=True) or {}
    question = payload.get("question", "").strip()
    industry = payload.get("industry")
    aqi = payload.get("aqi")

    if not question:
        return jsonify({"error": "question is required"}), 400

    docs = retrieve_documents(question, industry, top_k=3)
    answer = generate_rag_answer(question, industry, aqi, docs)
    return jsonify(
        {
            "answer": answer,
            "citations": [
                {
                    "title": doc["title"],
                    "category": doc["category"],
                    "industry": doc["industry"],
                    "excerpt": doc["content"],
                }
                for doc in docs
            ],
        }
    )


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
