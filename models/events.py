from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class BehaviorEvent(BaseModel):
    """
    Represents a single user interaction event captured by the frontend tracker.
    Includes mouse movements, keystrokes, clicks, and touch events.
    """
    session_id: str = Field(..., description="Unique identifier for the user session")
    timestamp: int = Field(..., description="Client-side timestamp (Date.now())")
    precise_time: float = Field(..., description="High-precision timestamp (performance.now())")
    event_type: str = Field(..., description="Type of event (mousemove, click, keydown, etc.)")
    
    # Optional fields (depending on event type)
    x: Optional[int] = None
    y: Optional[int] = None
    page_x: Optional[int] = None
    page_y: Optional[int] = None
    velocity: Optional[float] = None
    movement_x: Optional[int] = None
    movement_y: Optional[int] = None
    buttons: Optional[int] = None
    button: Optional[int] = None
    target: Optional[Dict[str, Any]] = None
    is_honeypot: Optional[bool] = Field(False, description="True if interaction occurred on a hidden field")
    key: Optional[str] = None
    code: Optional[str] = None
    flight_time: Optional[float] = None
    scroll_x: Optional[int] = None
    scroll_y: Optional[int] = None
    page_url: Optional[str] = None
    time_since_load: Optional[int] = None


class EventBatch(BaseModel):
    """
    Represents a batch of events sent from the client to reduce network overhead.
    """
    session_id: str
    events: List[BehaviorEvent]
    fingerprint: Optional[Dict[str, Any]] = None


class DetectionFlag(BaseModel):
    """
    Represents a specific rule violation triggered during analysis.
    Stored in flags.jsonl.
    """
    session_id: str
    timestamp: int
    rule_triggered: str = Field(..., description="Name of the detection rule (e.g., 'linear_movement')")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    details: Dict[str, Any] = Field(..., description="Contextual data explaining why the flag was raised")