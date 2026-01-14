"""
JSONL file operations with async I/O - Optimized Version
"""
import aiofiles
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional

class JSONLHandler:
    def __init__(self, data_dir: Path = Path('data')):
        self.data_dir = data_dir
        self.data_dir.mkdir(exist_ok=True)
        
        # Mapping key -> filepath
        self.files = {
            'events': self.data_dir / 'events.jsonl',
            'sessions': self.data_dir / 'sessions.jsonl',
            'logins': self.data_dir / 'logins.jsonl',
            'flags': self.data_dir / 'flags.jsonl'
        }
        
        self.lock = asyncio.Lock()

    async def append(self, file_key: str, data: Dict[str, Any]) -> bool:
        """Append data to JSONL file asynchronously"""
        if file_key not in self.files:
            raise ValueError(f"Invalid file key: {file_key}")
        
        filepath = self.files[file_key]
        
        async with self.lock:
            try:
                async with aiofiles.open(filepath, mode='a', encoding='utf-8') as f:
                    await f.write(json.dumps(data) + '\n')
                return True
            except Exception as e:
                print(f"Error writing to {filepath}: {e}")
                return False

    async def read_all(self, file_key: str, limit: Optional[int] = None) -> List[Dict]:
        """Read all records from JSONL file"""
        if file_key not in self.files:
            raise ValueError(f"Invalid file key: {file_key}")
        
        filepath = self.files[file_key]
        if not filepath.exists():
            return []
        
        records = []
        async with aiofiles.open(filepath, mode='r', encoding='utf-8') as f:
            async for line in f:
                if line.strip():
                    try:
                        records.append(json.loads(line))
                        if limit and len(records) >= limit:
                            break
                    except json.JSONDecodeError:
                        continue
        return records

    async def get_session_events(self, session_id: str, event_type: Optional[str] = None) -> List[Dict]:
        """
        Get events for specific session.
        OPTIMIZED: Reads line-by-line instead of loading whole file to RAM.
        """
        filepath = self.files['events']
        if not filepath.exists():
            return []
        
        filtered_events = []
        async with aiofiles.open(filepath, mode='r', encoding='utf-8') as f:
            async for line in f:
                if line.strip():
                    try:
                        event = json.loads(line)
                        if event.get('session_id') == session_id:
                            if event_type is None or event.get('event_type') == event_type:
                                filtered_events.append(event)
                    except json.JSONDecodeError:
                        continue
        
        return filtered_events

    async def count_records(self, file_key: str) -> int:
        """Count total records in file efficiently"""
        if file_key not in self.files:
            return 0
            
        filepath = self.files[file_key]
        if not filepath.exists():
            return 0
            
        count = 0
        async with aiofiles.open(filepath, mode='r', encoding='utf-8') as f:
            async for line in f:
                if line.strip():
                    count += 1
        return count