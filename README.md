# AirAware — Climate Resilience & Clean Air Intelligence Platform

> *"Breathe Smarter. Stay Safer. Build Climate Resilience."*
> **Hack2Skill Hackathon — Track 2: Clean Air & Climate Resilience**

---

## 1. Product Vision & Overview

**AirAware** is an AI-powered, federated climate action and clean air intelligence platform specifically built to solve the **BRICS trans-boundary and hyper-local pollution blindspot**:

- **The Problem in BRICS Nations**: Major cities (Delhi, Gurugram, São Paulo, Beijing, Johannesburg, Dubai) monitor regional macro indicators but consistently miss hyper-local, clandestine, and cross-border pollution events—unreported agricultural stubble burning, night-time industrial smelter flares, illegal municipal polymer incineration, and trans-boundary aerosol smog plumes. The absence of real-time granular data paralyzes coordinated climate action.
- **The AirAware Solution**:
  1. **Citizen-Sourced Ground Truth + Gemini Vision AI**: Enables citizens and community scouts to submit hyper-local pollution observations with photos. Google Gemini 3.8 Flash classifies the combustion plume type, calculates visual opacity (%), calculates the local PM2.5 delta contribution, and triggers an automated rapid intervention dispatch ticket.
  2. **Satellite Thermal Anomaly Detection**: Integrates VIIRS (375m high-resolution) and Sentinel-5P TROPOMI satellite feeds to pinpoint crop burning clusters and industrial flare hotspots with Thermal Radiative Power (MW) and hourly particulate flux rates.
  3. **Trans-Boundary Atmospheric Trajectory Modeling**: Calculates wind dispersion vectors demonstrating how agricultural fires in Punjab and Haryana blow southeast directly into the Gurugram, Delhi NCR, and Western UP economic corridors.
  4. **BRICS Federated Interoperability Network**: A decentralized interoperability framework connecting national environmental agencies (CPCB in India, INPE in Brazil, SAWS in South Africa, CNEMC in China, and EAD in the UAE) to share predictive dispersion weights and coordinate regional enforcement without raw private data transfer.

### Unique Selling Proposition (USP)
**The AirAware Environmental Risk Intelligence Engine**: A transparent, rules-based synthesis system that combines real-time atmospheric chemistry (Copernicus CAMS models), numerical weather predictions (ECMWF), and verified official emergency bulletins (India Meteorological Department / NDMA) into one actionable, explainable safety index.

Every risk score explains its source, formula, and limitations—never generating opaque numbers or fabricating live sensor measurements.

---

## 2. Architecture & Project Structure

AirAware provides two complete, production-ready execution paths:
- **Full-Stack Node.js / Express & React / Vite** (`server.ts`): Powers the unified web application with zero configuration on port 3000.
- **Python 3.12 FastAPI Backend** (`backend/`): A complete standalone Python service with SQLAlchemy, SQLite, Pydantic schemas, and Pytest test suite tailored for Windows VS Code development.

```
airaware/
├── server.ts                       # Express full-stack API server + Vite middlewares
├── server/                         # TypeScript backend services
│   ├── db.ts                       # Persistent JSON/SQLite database layer (Users, Alerts, Events)
│   ├── services/
│   │   ├── airQuality.ts           # Open-Meteo CAMS atmospheric chemistry integration
│   │   ├── weather.ts              # Open-Meteo ECMWF/GFS weather integration
│   │   ├── geocoding.ts            # Open-Meteo global places gazetteer & reverse geocode
│   │   ├── disasterAlerts.ts       # IMD & NDMA official emergency bulletin service
│   │   ├── riskEngine.ts           # AirAware Risk Intelligence rules engine
│   │   ├── gemini.ts               # Google Gemini 3.8 Flash AI assistant
│   │   └── alertWorker.ts          # Background evaluation worker for alert rules
├── src/                            # React 19 + TypeScript + Tailwind CSS Frontend
│   ├── components/
│   │   ├── Navbar.tsx              # Top navigation, global search, Demo Mode switcher
│   │   ├── DashboardView.tsx       # Environmental intelligence dashboard & gauges
│   │   ├── MapView.tsx             # Interactive Leaflet map with coordinates inspect
│   │   ├── AlertsCenterView.tsx    # Official warnings, checklists & custom rules manager
│   │   ├── AiAssistantView.tsx     # Gemini-powered contextual AI environmental advisor
│   │   ├── ProfileSettingsView.tsx # Saved favorites & user settings
│   │   ├── AboutSourcesView.tsx    # Transparency, data sources & CAMS modeling disclaimers
│   │   └── AuthModal.tsx           # Salted & hashed JWT registration and login
│   ├── contexts/
│   │   ├── AuthContext.tsx         # User authentication & session state
│   │   └── DemoContext.tsx         # Controlled Hackathon Demo Mode scenarios
│   ├── services/
│   │   └── api.ts                  # Centralized API client with demo fallback
│   ├── types/
│   │   └── index.ts                # TypeScript domain models
│   ├── App.tsx                     # Core application orchestrator
│   └── main.tsx                    # React DOM entry point
├── backend/                        # Standalone Python 3.12 FastAPI Backend
│   ├── app/
│   │   ├── main.py                 # FastAPI application entry point with CORS & routes
│   │   ├── core/                   # Security, bcrypt password hashing & JWT config
│   │   ├── database/               # SQLAlchemy SQLite engine & database models
│   │   ├── models/schemas.py       # Pydantic request & response validation schemas
│   │   ├── services/               # Python implementations of Air, Weather, Risk & Gemini
│   │   └── api/deps.py             # OAuth2 token authentication dependencies
│   ├── tests/test_api.py           # Automated test suite
│   ├── run_windows.ps1             # 1-click Windows PowerShell launch script
│   └── requirements.txt            # Python dependencies
├── .env.example                    # Environment variables template
├── metadata.json                   # Applet configuration & permissions
├── package.json                    # Node dependencies & launch scripts
└── README.md                       # Comprehensive guide
```

---

## 3. Quick Start (Web Application on Port 3000)

### Prerequisites
- Node.js LTS (v18, v20, or v22)
- npm or bun

### Step 1: Clone & Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional: If you have a Google Gemini API Key, set `GEMINI_API_KEY="your-key"`. If omitted, AirAware automatically uses its intelligent deterministic rules fallback).*

### Step 3: Run the Application
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 4. Beginner Windows & VS Code Guide (Python 3.12 Backend)

If you are developing locally on Windows using VS Code and Python 3.12:

### Step 1: Open VS Code in the Project Folder
1. Launch **VS Code**.
2. Go to **File → Open Folder...** and select the `airaware` repository folder.
3. Open the integrated terminal (`Ctrl + \`` or **Terminal → New Terminal**).

### Step 2: Run via PowerShell Script
In the terminal, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd backend
.\run_windows.ps1
```

### Or Step 2 (Manual Setup):
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 3: Explore Interactive Swagger API Docs
Navigate to:
- **`http://127.0.0.1:8000/docs`** (FastAPI Swagger UI)
- **`http://127.0.0.1:8000/redoc`** (ReDoc API documentation)

---

## 5. Pre-Seeded Demo Account

For quick testing and evaluation without manual signup:

- **Email**: `demo@airaware.org`
- **Password**: `AirAware2026!`
- **Role**: Primary Evaluator / Dr. Tarun Yadav
- **Pre-configured City**: Gurugram, Haryana

*Or click the **"Prefill Demo User"** button directly inside the Sign In modal.*

---

## 6. Hackathon Presentation Scenarios for Judges

AirAware features a dedicated **Demo Mode** button in the header. Judges can toggle between **Live Real-World Data** (from Open-Meteo) and 4 curated **Presentation Scenarios**:

1. **Scenario 1 — Gurugram Winter Smog**:
   - High AQI (265), elevated PM2.5 (148.6 µg/m³; ~10x WHO guideline).
   - Inversion layer advisory with certified N95 respirator recommendation.
   - Outdoor cardio warned against; indoor HEPA purification checklist.
2. **Scenario 2 — Coastal Cyclone Emergency (Odisha / East Coast)**:
   - Landfall wind gusts (95–125 km/h), storm surge alert, and monsoonal inundation warning.
   - Survival kit checklist (potable water, battery radio, waterproof document pouch).
3. **Scenario 3 — North India Extreme Heatwave (Jaipur / NCR)**:
   - Ambient 44.2°C with Heat Index reaching 49°C.
   - Wet-bulb radiation warning and oral rehydration salt protocol.
4. **Scenario 4 — Clean Mountain Baseline (Shimla)**:
   - Pristine AQI (28), PM2.5 (7.2 µg/m³), ideal outdoor recreational conditions.

---

## 7. API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | System health, uptime & Gemini status | No |
| `GET` | `/api/sources` | Data provider disclosures & limitations | No |
| `POST` | `/api/auth/register` | Register new user with bcrypt password hash | No |
| `POST` | `/api/auth/login` | Login and receive signed JWT token | No |
| `GET` | `/api/auth/me` | Current user profile | Yes |
| `PATCH` | `/api/users/me` | Update default city or metric/imperial units | Yes |
| `GET` | `/api/users/locations` | List user's saved favorite locations | Yes |
| `POST` | `/api/users/locations` | Save a new favorite location | Yes |
| `DELETE` | `/api/users/locations/:id` | Remove a saved location | Yes |
| `GET` | `/api/environmental/current` | Real-time atmospheric chemistry (CAMS) | No |
| `GET` | `/api/weather/current` | Real-time weather, heat index, and rain | No |
| `GET` | `/api/environmental/risk` | AirAware multi-vector Risk Intelligence | No |
| `GET` | `/api/geocoding/search` | Search places, cities, and coordinates | No |
| `GET` | `/api/geocoding/reverse` | Reverse geocode coordinates to place name | No |
| `GET` | `/api/emergency/alerts` | Official IMD & NDMA disaster bulletins | No |
| `GET` | `/api/alerts` | User custom alert trigger rules | Yes |
| `POST` | `/api/alerts` | Create custom alert rule (AQI, temp, etc.) | Yes |
| `DELETE` | `/api/alerts/:id` | Delete custom alert rule | Yes |
| `GET` | `/api/alerts/events` | Notification events history | Yes |
| `POST` | `/api/alerts/evaluate` | Trigger on-demand rule evaluation | Yes |
| `POST` | `/api/ai/chat` | Gemini 3.8 Flash environmental reasoning | No |

---

## 8. Data Sources & Transparency Disclosure

- **Air Quality**: Model forecasts from the Copernicus Atmosphere Monitoring Service (CAMS) & SILAM via Open-Meteo. Values represent regional atmospheric chemistry simulations, not statutory municipal ground stations.
- **Weather**: Global Numerical Weather Prediction models from ECMWF and NOAA.
- **Emergency Feeds**: Structured bulletins modeled after India Meteorological Department (IMD) and National Disaster Management Authority (NDMA) protocols.
- **AI Engine**: Google Gemini 3.8 Flash (`@google/genai`).

---




## 9. License

Developed under Track 2 (Clean Air & Climate Resilience) for Hack2Skill. Open source under the Apache 2.0 License.
