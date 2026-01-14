"""
Input validation utilities
"""
from typing import Any, Dict
import re

def is_valid_session_id(session_id: str) -> bool:
    """Validate session ID format"""
    pattern = r'^session_\d+_[a-z0-9]{9}$'
    return bool(re.match(pattern, session_id))

def is_valid_username(username: str) -> bool:
    """Validate username"""
    if not username or len(username) < 3:
        return False
    if len(username) > 50:
        return False
    return bool(re.match(r'^[a-zA-Z0-9_]+$', username))

def sanitize_string(text: str, max_length: int = 1000) -> str:
    """Sanitize input string"""
    return text[:max_length].strip()

def validate_fingerprint(fingerprint: Dict[str, Any]) -> bool:
    """Validate fingerprint structure"""
    required_keys = ['user_agent', 'screen', 'timezone']
    return all(key in fingerprint for key in required_keys)