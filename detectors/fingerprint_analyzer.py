"""
Device fingerprint analysis - detect suspicious fingerprints
"""
from typing import Dict, Any

class FingerprintAnalyzer:
    def __init__(self):
        self.suspicious_patterns = {
            'headless_chrome': ['HeadlessChrome', 'Headless'],
            'automation': ['PhantomJS', 'Selenium', 'WebDriver'],
            'impossible_hardware': {
                'min_cores': 1,
                'max_cores': 128
            }
        }
    
    def analyze(self, fingerprint: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze device fingerprint for bot signatures"""
        
        # Check user agent
        user_agent = fingerprint.get('user_agent', '')
        for pattern_name, patterns in [
            ('headless', self.suspicious_patterns['headless_chrome']),
            ('automation', self.suspicious_patterns['automation'])
        ]:
            for pattern in patterns:
                if pattern.lower() in user_agent.lower():
                    return {
                        'is_bot': True,
                        'reason': f'Suspicious user agent: {pattern}',
                        'confidence': 0.95,
                        'rule': 'fingerprint_user_agent'
                    }
        
        # Check hardware
        cores = fingerprint.get('hardware_concurrency', 0)
        if cores < self.suspicious_patterns['impossible_hardware']['min_cores']:
            return {
                'is_bot': True,
                'reason': f'Impossible hardware: {cores} CPU cores',
                'confidence': 0.9,
                'rule': 'fingerprint_hardware'
            }
        
        # Check canvas
        canvas = fingerprint.get('canvas_hash', '')
        if canvas == 'canvas_unavailable':
            return {
                'is_bot': True,
                'reason': 'Canvas fingerprint unavailable',
                'confidence': 0.7,
                'rule': 'fingerprint_canvas'
            }
        
        return {
            'is_bot': False,
            'reason': '',
            'confidence': 0.0,
            'rule': 'fingerprint'
        }