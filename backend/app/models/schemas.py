from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime

# Auth & User Schemas
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    preferred_city: Optional[str] = "Gurugram"
    preferred_lat: Optional[float] = 28.4595
    preferred_lon: Optional[float] = 77.0266
    units: Optional[str] = "metric"
    created_at: Optional[datetime] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    preferred_city: Optional[str] = None
    preferred_lat: Optional[float] = None
    preferred_lon: Optional[float] = None
    units: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Location Schemas
class LocationCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    admin_region: Optional[str] = None
    country: Optional[str] = None

class LocationResponse(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    admin_region: Optional[str] = None
    country: Optional[str] = None
    created_at: datetime

# Alert Schemas
class AlertRuleCreate(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    alert_type: str # aqi, pm25, temperature, precipitation, disaster
    threshold: float
    comparison: Optional[str] = "above"

class AlertRuleResponse(BaseModel):
    id: str
    location_name: str
    latitude: float
    longitude: float
    alert_type: str
    threshold: float
    comparison: str
    enabled: bool
    last_evaluated_at: Optional[datetime] = None
    created_at: datetime

class AlertEventResponse(BaseModel):
    id: str
    location_name: str
    event_type: str
    severity: str
    title: str
    message: str
    source: str
    source_url: Optional[str] = None
    is_read: bool
    created_at: datetime

# AI Schemas
class AIChatRequest(BaseModel):
    question: str
    context: Optional[dict[str, Any]] = None

class AIChatResponse(BaseModel):
    text: str
    source: str
    model: str
