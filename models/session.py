from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any

class SessionMetadata(BaseModel):
    """
    Initial metadata sent when a user first visits the page.
    Used to establish the baseline for the session.
    """
    session_id: str
    fingerprint: Dict[str, Any]
    page_load_time: int
    referrer: Optional[str] = ""
    page_url: str


class LoginRequest(BaseModel):
    """
    Data payload submitted during the login process.
    Includes form data, timing metrics, and honeypot field values.
    """
    username: str
    password: str
    session_id: str
    time_to_submit: int = Field(..., description="Time in ms from page load to form submission")
    form_time: str = Field(..., description="Timestamp when the form was rendered")
    
    # Honeypot fields (Should be empty for legitimate users)
    website: Optional[str] = ""
    email_confirm: Optional[str] = ""
    bot_field: Optional[str] = ""
    verify: Optional[str] = ""

    @field_validator('time_to_submit')
    @classmethod
    def validate_submission_time(cls, v):
        """Ensure submission time is physically possible (non-negative)"""
        if v < 0:
            raise ValueError('Time to submit cannot be negative')
        return v

    @field_validator('username', 'password')
    @classmethod
    def validate_credentials(cls, v):
        """Basic credential validation"""
        if not v or not v.strip():
            raise ValueError('Credentials cannot be empty')
        return v