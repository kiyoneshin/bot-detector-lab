"""
Honeypot detection - detect interaction with hidden fields
"""
from typing import Dict, Any, List
from models.session import LoginRequest
from storage.jsonl_handler import JSONLHandler

class HoneypotDetector:
    def __init__(self, storage = None):
        self.storage = storage or JSONLHandler()
        self.honeypot_fields = ['website', 'email_confirm', 'bot_field', 'verify']
    
    def check_form(self, login_data: LoginRequest) -> Dict[str, Any]:
        """Check if honeypot form fields were filled"""
        for field in self.honeypot_fields:
            value = getattr(login_data, field, '')
            if value and value.strip():
                return {
                    'is_bot': True,
                    'reason': f"Honeypot field '{field}' was filled",
                    'confidence': 1.0,
                    'rule': 'honeypot_form',
                    'field': field,
                    'value_length': len(value)
                }
        
        return {
            'is_bot': False,
            'reason': '',
            'confidence': 0.0,
            'rule': 'honeypot_form'
        }
    
    async def check_interactions(self, session_id: str) -> Dict[str, Any]:
        """Check for honeypot interaction events"""
        events = await self.storage.get_session_events(session_id)
        
        honeypot_events = [
            e for e in events 
            if e.get('is_honeypot') or 
               e.get('event_type') in ['honeypot_focus', 'honeypot_filled', 'honeypot_link_clicked']
        ]
        
        if honeypot_events:
            first_event = honeypot_events[0]
            return {
                'is_bot': True,
                'reason': f"Honeypot interaction: {first_event.get('event_type')}",
                'confidence': 1.0,
                'rule': 'honeypot_interaction',
                'event': first_event
            }
        
        return {
            'is_bot': False,
            'reason': '',
            'confidence': 0.0,
            'rule': 'honeypot_interaction'
        }