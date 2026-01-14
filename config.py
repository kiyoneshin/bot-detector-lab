"""
Configuration settings and detection thresholds
"""
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

# Detection Thresholds
THRESHOLDS = {
    "min_submit_time_ms": 2000,      # Form submit < 2s -> Bot
    "min_mouse_movements": 5,        # < 5 movements -> Bot
    "perfect_line_variance": 5.0,    # Angle variance < 5.0 -> Bot (Linear movement)
    "teleport_velocity": 0.1,        # Velocity < 0.1 -> Bot (Teleport)
    "impossible_speed": 3000,        # > 3000px/100ms -> Bot
    "max_zero_velocity_ratio": 0.5   # > 50% movements are static -> Bot
}

# Feature Toggles
FEATURES = {
    "enable_honeypot": True,
    "enable_mouse_analysis": True,
    "enable_fingerprinting": True
}