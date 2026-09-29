from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    preferred_city = Column(String, default="Gurugram")
    preferred_lat = Column(Float, default=28.4595)
    preferred_lon = Column(Float, default=77.0266)
    units = Column(String, default="metric")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    saved_locations = relationship("SavedLocation", back_populates="user", cascade="all, delete-orphan")
    alert_rules = relationship("AlertRule", back_populates="user", cascade="all, delete-orphan")
    alert_events = relationship("AlertEvent", back_populates="user", cascade="all, delete-orphan")

class SavedLocation(Base):
    __tablename__ = "saved_locations"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    admin_region = Column(String, nullable=True)
    country = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="saved_locations")

class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    location_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    alert_type = Column(String, nullable=False) # aqi, pm25, temperature, precipitation, disaster
    threshold = Column(Float, nullable=False)
    comparison = Column(String, default="above")
    enabled = Column(Boolean, default=True)
    last_evaluated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="alert_rules")

class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    alert_rule_id = Column(String, nullable=True)
    location_name = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    severity = Column(String, default="moderate")
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    source = Column(String, nullable=False)
    source_url = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="alert_events")
