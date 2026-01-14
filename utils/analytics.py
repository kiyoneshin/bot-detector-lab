"""
Statistical analysis, geometry helpers, and reporting aggregations.
"""
import math
import statistics
from typing import List, Dict, Any, Tuple

# 1. Geometry & Physics Helpers (For Detectors)

def calculate_distance(p1: Tuple[int, int], p2: Tuple[int, int]) -> float:
    """Calculate Euclidean distance between two points (x, y)."""
    return math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)

def calculate_angle(p1: Tuple[int, int], p2: Tuple[int, int]) -> float:
    """Calculate the angle in degrees between two points."""
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    return math.degrees(math.atan2(dy, dx))

def calculate_velocity(p1: Tuple[int, int], p2: Tuple[int, int], time_delta: float) -> float:
    """Calculate velocity (pixels per ms)."""
    if time_delta <= 0:
        return 0.0
    distance = calculate_distance(p1, p2)
    return distance / time_delta

def calculate_variance(values: List[float]) -> float:
    """Calculate variance safely."""
    if len(values) < 2:
        return 0.0
    try:
        return statistics.variance(values)
    except statistics.StatisticsError:
        return 0.0

# 2. Reporting & Dashboard Helpers (For API)

def calculate_detection_rate(total: int, bots: int) -> float:
    """Calculate bot detection rate percentage."""
    if total == 0:
        return 0.0
    return (bots / total) * 100

def calculate_confidence_stats(flags: List[Dict[str, Any]]) -> Dict[str, float]:
    """Calculate min/max/avg confidence stats from a list of flags."""
    confidences = [f.get('confidence', 0) for f in flags if f.get('confidence') is not None]
    
    if not confidences:
        return {'mean': 0.0, 'median': 0.0, 'max': 0.0, 'min': 0.0}
    
    return {
        'mean': statistics.mean(confidences),
        'median': statistics.median(confidences),
        'max': max(confidences),
        'min': min(confidences)
    }

def aggregate_detection_rules(flags: List[Dict]) -> Dict[str, int]:
    """Count triggers by rule type (e.g., {'linear_movement': 5, 'honeypot': 2})."""
    from collections import Counter
    rules = [f.get('rule_triggered') for f in flags if f.get('rule_triggered')]
    return dict(Counter(rules))