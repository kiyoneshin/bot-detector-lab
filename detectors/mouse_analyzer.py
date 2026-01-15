"""
Mouse behavior analysis - detect bot-like movement patterns
"""
import statistics
from typing import List, Dict, Any, Tuple
from storage.jsonl_handler import JSONLHandler

class MouseAnalyzer:
    def __init__(self, storage = None):
        self.storage = storage or JSONLHandler()
        self.thresholds = {
            'min_movements': 5,
            'perfect_line_angle_variance': 5.0,
            'teleport_velocity': 0.1,
            'impossible_speed': 3000
        }
    
    async def analyze(self, session_id: str) -> Dict[str, Any]:
        """Analyze mouse behavior for bot patterns"""
        mouse_events = await self.storage.get_session_events(session_id, 'mousemove')
        
        if not mouse_events:
            return self._create_result(True, 'No mouse movements', 0.9)
        
        # Check 1: Minimum movements
        if len(mouse_events) < self.thresholds['min_movements']:
            return self._create_result(True, f'Only {len(mouse_events)} movements', 0.8)
        
        # Check 2: Perfect line detection
        line_result = self._check_perfect_line(mouse_events)
        if line_result['is_bot']:
            return line_result
        
        # Check 3: Teleporting
        teleport_result = self._check_teleporting(mouse_events)
        if teleport_result['is_bot']:
            return teleport_result
        
        # Check 4: Impossible speed
        speed_result = self._check_impossible_speed(mouse_events)
        if speed_result['is_bot']:
            return speed_result
        
        return self._create_result(False, '', 0.0)
    
    def _check_perfect_line(self, events: List[Dict]) -> Dict[str, Any]:
        """Check for perfect straight line movement"""
        points = [(e['x'], e['y']) for e in events if 'x' in e and 'y' in e]
        
        if len(points) < 10:
            return self._create_result(False, '', 0.0)
        
        angle_variance = self._calculate_angle_variance(points)
        
        if angle_variance < self.thresholds['perfect_line_angle_variance']:
            return self._create_result(
                True, 
                f'Perfect line movement (variance: {angle_variance:.2f}°)',
                0.9
            )
        
        return self._create_result(False, '', 0.0)
    
    def _check_teleporting(self, events: List[Dict]) -> Dict[str, Any]:
        """Check for teleporting cursor (zero velocity)"""
        velocities = [e.get('velocity', 0) for e in events if 'velocity' in e]
        
        if not velocities:
            return self._create_result(False, '', 0.0)
        
        zero_count = sum(1 for v in velocities if v < self.thresholds['teleport_velocity'])
        zero_ratio = zero_count / len(velocities)
        
        if zero_ratio > 0.5:
            return self._create_result(
                True,
                f'Teleporting cursor ({zero_ratio*100:.1f}% zero velocity)',
                0.85
            )
        
        return self._create_result(False, '', 0.0)
    
    def _check_impossible_speed(self, events: List[Dict]) -> Dict[str, Any]:
        """Check for impossibly fast movements"""
        for i in range(len(events) - 1):
            e1, e2 = events[i], events[i + 1]
            
            time_delta = e2.get('timestamp', 0) - e1.get('timestamp', 0)
            if time_delta >= 100 or time_delta <= 0:
                continue
            
            x1, y1 = e1.get('x', 0), e1.get('y', 0)
            x2, y2 = e2.get('x', 0), e2.get('y', 0)
            
            distance = ((x2 - x1)**2 + (y2 - y1)**2)**0.5
            
            if distance > self.thresholds['impossible_speed']:
                return self._create_result(
                    True,
                    f'Impossible speed: {distance:.0f}px in {time_delta}ms',
                    0.95
                )
        
        return self._create_result(False, '', 0.0)
    
    @staticmethod
    def _calculate_angle_variance(points: List[Tuple[int, int]]) -> float:
        """Calculate angle variance between consecutive points"""
        import math
        
        if len(points) < 3:
            return 100.0
        
        angles = []
        for i in range(len(points) - 1):
            dx = points[i+1][0] - points[i][0]
            dy = points[i+1][1] - points[i][1]
            angle = math.degrees(math.atan2(dy, dx))
            angles.append(angle)
        
        try:
            return statistics.stdev(angles)
        except:
            return 100.0
    
    @staticmethod
    def _create_result(is_bot: bool, reason: str, confidence: float) -> Dict[str, Any]:
        """Create standardized result"""
        return {
            'is_bot': is_bot,
            'reason': reason,
            'confidence': confidence,
            'rule': 'mouse_behavior'
        }