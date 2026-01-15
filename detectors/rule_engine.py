"""
Core detection engine - orchestrates all detection algorithms.
This module acts as the central brain that aggregates results from 
specialized analyzers (Mouse, Honeypot, etc.).
"""

from typing import Dict, Any, List
from datetime import datetime
from models.session import LoginRequest
from .mouse_analyzer import MouseAnalyzer
from .honeypot_detector import HoneypotDetector
from .fingerprint_analyzer import FingerprintAnalyzer
from storage.jsonl_handler import JSONLHandler

# Detection Thresholds
MIN_SUBMIT_TIME_MS = 2000  # 2 seconds minimum for human interaction

class BotDetectionEngine:
    """
    The main orchestrator class that runs a sequence of detection rules
    against a user session and aggregates the results.
    """

    def __init__(self, storage=None):
        """Initialize specialized sub-detectors."""
        # Shared storage for all detectors
        self.storage = storage or JSONLHandler()

        # Initialize sub-detectors with shared storage
        self.mouse_analyzer = MouseAnalyzer(storage=self.storage)
        self.honeypot_detector = HoneypotDetector(storage=self.storage)
        self.fingerprint_analyzer = FingerprintAnalyzer()
    
    async def analyze_session(self, session_id: str, login_data: LoginRequest) -> Dict[str, Any]:
        """
        Run all detection checks in parallel or sequence and aggregate results.
        
        Args:
            session_id: The unique session identifier.
            login_data: The data submitted during login (form fields + timing).
            
        Returns:
            Dictionary containing the final verdict (is_bot), confidence score,
            and a list of specific flags triggered.
        """
        flags: List[Dict[str, Any]] = []
        
        # 1. Honeypot Check (High Confidence)
        # Checks if hidden fields were filled or traps triggered
        honeypot_result = self.honeypot_detector.check_form(login_data)
        if honeypot_result['is_bot']:
            flags.append(honeypot_result)
        
        # 2. Honeypot Interaction Events (High Confidence)
        honeypot_event_result = await self.honeypot_detector.check_interactions(session_id)
        if honeypot_event_result['is_bot']:
            flags.append(honeypot_event_result)
        
        # 2. Mouse Behavior Analysis (Medium/High Confidence)
        # Checks for linear movement, teleportation, or lack of movement
        # Awaited because it likely involves reading event logs asynchronously
        mouse_result = await self.mouse_analyzer.analyze(session_id)
        if mouse_result['is_bot']:
            flags.append(mouse_result)
        
        # 3. Submit Time Check (Medium Confidence)
        # Checks if the form was submitted inhumanly fast
        time_result = self.check_submit_time(login_data)
        if time_result['is_bot']:
            flags.append(time_result)
        

        # 4. Fingerprint Analysis (Low/Medium Confidence)
        # Take fingerprint data from sessions (need querying storage)
        sessions = await self.storage.read_all('sessions')
        session_data = next((s for s in sessions if s.get('session_id') == session_id), None)
        
        if session_data and 'fingerprint' in session_data:
            fingerprint_result = self.fingerprint_analyzer.analyze(session_data['fingerprint'])
            if fingerprint_result['is_bot']:
                flags.append(fingerprint_result)
        
        # --- Result Aggregation ---
        
        # If any flag is raised, consider it a bot
        is_bot = len(flags) > 0
        
        # Calculate maximum confidence among all triggered rules
        max_confidence = max([f['confidence'] for f in flags]) if flags else 0.0
        
        # Determine the primary reason (prioritize high confidence flags)
        if flags:
            # Sort flags by confidence descending to get the most significant reason
            flags.sort(key=lambda x: x['confidence'], reverse=True)
            primary_reason = flags[0]['reason']
        else:
            primary_reason = "Human behavior detected"
        
        return {
            "is_bot": is_bot,
            "confidence": max_confidence,
            "flags": flags,
            "reason": primary_reason,
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
    
    def check_submit_time(self, login_data: LoginRequest) -> Dict[str, Any]:
        """
        Check if the form was submitted too quickly (Superhuman speed).
        
        Args:
            login_data: The login request containing 'time_to_submit'.
            
        Returns:
            Detection result dictionary.
        """
        time_to_submit = login_data.time_to_submit
        
        if time_to_submit < MIN_SUBMIT_TIME_MS:
            # Calculate dynamic confidence: 
            # 0ms = 100% confidence, 1999ms = low confidence
            # Formula: 1.0 - (current_time / threshold)
            confidence = 1.0 - (time_to_submit / MIN_SUBMIT_TIME_MS)
            
            return {
                "is_bot": True,
                "rule": "submit_time",
                "reason": f"Form submitted too quickly: {time_to_submit}ms (Threshold: {MIN_SUBMIT_TIME_MS}ms)",
                "confidence": round(confidence, 2)
            }
        
        return {
            "is_bot": False,
            "rule": "submit_time",
            "reason": "Normal submission time",
            "confidence": 0.0
        }