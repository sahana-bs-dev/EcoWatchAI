window.ECOWATCH_CONFIG = {
    API_BASE_URL:
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://127.0.0.1:5000"
            : "https://YOUR-RENDER-BACKEND.onrender.com",
    MAPBOX_TOKEN: "YOUR_MAPBOX_PUBLIC_TOKEN"
};
