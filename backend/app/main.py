import uuid
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.app.core.config import settings
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.database.db import init_db, get_db
from backend.app.database.models import User, SavedLocation, AlertRule, AlertEvent
from backend.app.models.schemas import (
    UserRegister, UserLogin, UserResponse, UserUpdate, TokenResponse,
    LocationCreate, LocationResponse, AlertRuleCreate, AlertRuleResponse,
    AlertEventResponse, AIChatRequest, AIChatResponse
)
from backend.app.services.air_quality import fetch_air_quality
from backend.app.services.weather import fetch_weather
from backend.app.services.geocoding import search_locations
from backend.app.services.risk_engine import evaluate_risk
from backend.app.services.disaster_alerts import get_alerts
from backend.app.services.gemini import generate_ai_advice
from backend.app.api.deps import get_current_user

app = FastAPI(
    title="AirAware API",
    description="Full-Stack Climate Resilience & Clean Air Intelligence Platform Backend",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    # Seed default demo account if absent
    db = next(get_db())
    demo = db.query(User).filter(User.email == "demo@airaware.org").first()
    if not demo:
        new_demo = User(
            id="usr_demo_gurugram_01",
            name="Dr. Tarun Yadav",
            email="demo@airaware.org",
            hashed_password=get_password_hash("AirAware2026!"),
            preferred_city="Gurugram",
            preferred_lat=28.4595,
            preferred_lon=77.0266,
            units="metric"
        )
        db.add(new_demo)
        db.commit()
    db.close()

# ----------------- System Endpoints -----------------
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AirAware Python FastAPI Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "gemini_configured": bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "MY_GEMINI_API_KEY")
    }

@app.get("/api/sources")
def get_sources():
    return {
        "sources": [
            {
                "name": "Open-Meteo Air Quality API",
                "type": "Atmospheric Chemistry Forecast",
                "models": "CAMS & SILAM",
                "disclaimer": "Atmospheric model forecast, not ground regulatory sensor."
            },
            {
                "name": "Open-Meteo Weather API",
                "type": "Global Numerical Weather Prediction",
                "models": "ECMWF & GFS"
            },
            {
                "name": "India Meteorological Department (IMD)",
                "type": "Official Weather & Cyclone Warnings"
            }
        ]
    }

# ----------------- Auth Endpoints -----------------
@app.post("/api/auth/register", response_model=TokenResponse)
def register(req: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    new_user = User(
        id=f"usr_{uuid.uuid4().hex[:10]}",
        name=req.name.strip(),
        email=req.email.lower(),
        hashed_password=get_password_hash(req.password),
        preferred_city="Gurugram",
        preferred_lat=28.4595,
        preferred_lon=77.0266,
        units="metric"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.id, "email": new_user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "preferred_city": new_user.preferred_city,
            "preferred_lat": new_user.preferred_lat,
            "preferred_lon": new_user.preferred_lon,
            "units": new_user.units,
            "created_at": new_user.created_at
        }
    }

@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": user.id, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "preferred_city": user.preferred_city,
            "preferred_lat": user.preferred_lat,
            "preferred_lon": user.preferred_lon,
            "units": user.units,
            "created_at": user.created_at
        }
    }

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "preferred_city": current_user.preferred_city,
        "preferred_lat": current_user.preferred_lat,
        "preferred_lon": current_user.preferred_lon,
        "units": current_user.units,
        "created_at": current_user.created_at
    }

# ----------------- User Preferences & Locations -----------------
@app.patch("/api/users/me")
def update_profile(updates: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if updates.name: current_user.name = updates.name.strip()
    if updates.preferred_city: current_user.preferred_city = updates.preferred_city.strip()
    if updates.preferred_lat is not None: current_user.preferred_lat = updates.preferred_lat
    if updates.preferred_lon is not None: current_user.preferred_lon = updates.preferred_lon
    if updates.units in ["metric", "imperial"]: current_user.units = updates.units
    db.commit()
    return {"message": "Profile updated successfully"}

@app.get("/api/users/locations", response_model=list[LocationResponse])
def get_saved_locations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SavedLocation).filter(SavedLocation.user_id == current_user.id).all()

@app.post("/api/users/locations", response_model=LocationResponse)
def add_saved_location(loc: LocationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_loc = SavedLocation(
        id=f"loc_{uuid.uuid4().hex[:10]}",
        user_id=current_user.id,
        name=loc.name.strip(),
        latitude=loc.latitude,
        longitude=loc.longitude,
        admin_region=loc.admin_region,
        country=loc.country
    )
    db.add(new_loc)
    db.commit()
    db.refresh(new_loc)
    return new_loc

@app.delete("/api/users/locations/{location_id}")
def delete_saved_location(location_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loc = db.query(SavedLocation).filter(SavedLocation.id == location_id, SavedLocation.user_id == current_user.id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(loc)
    db.commit()
    return {"success": True}

# ----------------- Environmental & Weather -----------------
@app.get("/api/environmental/current")
async def get_air_quality(latitude: float = 28.4595, longitude: float = 77.0266):
    try:
        return await fetch_air_quality(latitude, longitude)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/weather/current")
async def get_current_weather(latitude: float = 28.4595, longitude: float = 77.0266):
    try:
        return await fetch_weather(latitude, longitude)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/environmental/risk")
async def get_risk_report(latitude: float = 28.4595, longitude: float = 77.0266):
    try:
        air = await fetch_air_quality(latitude, longitude)
        weather = await fetch_weather(latitude, longitude)
        return evaluate_risk(air, weather)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

# ----------------- Geocoding -----------------
@app.get("/api/geocoding/search")
async def search_places(q: str = Query(..., min_length=2)):
    try:
        return {"results": await search_locations(q)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- Emergency Alerts -----------------
@app.get("/api/emergency/alerts")
def get_emergency_alerts():
    return {"alerts": get_alerts()}

# ----------------- Alerts Rules & Events -----------------
@app.get("/api/alerts", response_model=list[AlertRuleResponse])
def get_alert_rules(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(AlertRule).filter(AlertRule.user_id == current_user.id).all()

@app.post("/api/alerts", response_model=AlertRuleResponse)
def create_alert_rule(rule: AlertRuleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_rule = AlertRule(
        id=f"rule_{uuid.uuid4().hex[:10]}",
        user_id=current_user.id,
        location_name=rule.location_name,
        latitude=rule.latitude,
        longitude=rule.longitude,
        alert_type=rule.alert_type,
        threshold=rule.threshold,
        comparison=rule.comparison or "above",
        enabled=True
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule

@app.delete("/api/alerts/{rule_id}")
def delete_alert_rule(rule_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id, AlertRule.user_id == current_user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    db.delete(rule)
    db.commit()
    return {"success": True}

@app.get("/api/alerts/events", response_model=list[AlertEventResponse])
def get_alert_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(AlertEvent).filter(AlertEvent.user_id == current_user.id).order_by(AlertEvent.created_at.desc()).all()

@app.patch("/api/alerts/events/{event_id}/read")
def mark_event_read(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(AlertEvent).filter(AlertEvent.id == event_id, AlertEvent.user_id == current_user.id).first()
    if event:
        event.is_read = True
        db.commit()
    return {"success": True}

# ----------------- AI Chat Endpoint -----------------
@app.post("/api/ai/chat", response_model=AIChatResponse)
async def chat_with_assistant(req: AIChatRequest):
    return await generate_ai_advice(req.question, req.context)
