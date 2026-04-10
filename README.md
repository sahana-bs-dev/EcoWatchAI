<<<<<<< HEAD
# EcoWatchAI
EcoWatchAI 
=======
# EcoWatch AI

EcoWatch AI is a full-stack demo for AI-based industrial emission monitoring. It combines a Flask API, scikit-learn models, simulated sensor and satellite data, and a deployable vanilla JavaScript dashboard with Mapbox, vis.js, and Chart.js.

## Project Structure

```text
eco-watch-ai/
  backend/
    app.py
    data/
    generate_data.py
    requirements.txt
    render.yaml
  frontend/
    index.html
    app.js
    config.js
    styles.css
    vercel.json
```

## Features

- Interactive map view with industrial markers, public zones, road overlays, radius analysis, and AQI heatmap.
- Network view showing `Industry -> Sensor -> Central Monitoring Station`.
- Real-time AQI simulation updating every 4 seconds.
- Linear Regression AQI prediction with `/predict`.
- Isolation Forest anomaly detection with `/anomaly`.
- Compliance tracking, top polluter ranking, impact analysis, and AI recommendations.
- Pollution spread simulation from source to 10 km.
- 240-row dummy dataset with industry emissions and pollutant values.
- Mysore-based default map center with live OpenWeather air and weather integration when configured.
- RAG-backed compliance Q&A over environmental guidance documents.

## Backend Setup

```bash
cd eco-watch-ai/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

The API runs on `http://127.0.0.1:5000`.

### Live Data Setup

1. Regenerate your OpenWeather API key if you previously exposed it publicly.
2. Add the new key to `backend/.env` or your Render environment variables as `OPENWEATHER_API_KEY`.
3. The backend will then pull live air pollution and weather for the active coordinates, defaulting to Mysore.

### API Endpoints

- `GET /health`
- `GET /dashboard-data?lat=<lat>&lng=<lng>&radius=<5|10|15>`
- `POST /predict`
- `POST /anomaly`
- `GET /simulate`
- `POST /rag-query`

## Frontend Setup

The frontend is static, so it can be opened directly or served with any static host.

1. Update `frontend/config.js`
2. Set `MAPBOX_TOKEN` to your Mapbox public token
3. Set `API_BASE_URL` to your Render backend URL after deployment

For local use, `config.js` already points `localhost` to the Flask API.

## Local Frontend Server (recommended)

To run the frontend with a simple static server and avoid opening files directly, you can use the included npm script which uses `npx http-server`:

1. Ensure you have Node.js installed.
2. From the repository root run:

```bash
npm run start
```

This serves the `frontend/` folder at http://localhost:3000 by default.

If you prefer to install a server globally, run:

```bash
npm install -g http-server
http-server frontend -p 3000
```

## Deploy to Render

1. Create a new Web Service on Render.
2. Set the root directory to `eco-watch-ai/backend`.
3. Render can use the included `render.yaml` or these values:
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn app:app`
4. Add environment variable `OPENWEATHER_API_KEY` in Render.

## Deploy to Vercel

1. Import the repo or the `eco-watch-ai/frontend` folder into Vercel.
2. Deploy as a static site.
3. After the backend is live, update `frontend/config.js` and redeploy.

## Notes

- The backend enables CORS with `Flask-CORS`.
- No production API URL is hardcoded beyond the placeholder in `config.js`.
- `generate_data.py` is included so the dummy dataset can be regenerated where Python is available.
- The frontend falls back to Mysore-based demo data if the backend or live API is unavailable.
- OpenWeather provides live AQI/pollutant and weather context; the app blends this with the existing prediction, anomaly, and RAG layers.
>>>>>>> 05d8514 (Initial commit)
