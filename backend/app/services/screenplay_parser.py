import re
import hashlib
from typing import List, Dict, Any

class ScreenplayScene(BaseModel := type('BaseModel', (), {})):
    pass

class ParsedScene:
    def __init__(self, scene_id: str, header: str, number: int, start_line: int, text: str, page_number: int):
        self.scene_id = scene_id
        self.header = header
        self.number = number
        self.start_line = start_line
        self.text = text
        self.page_number = page_number

class ScreenplayParseResult:
    def __init__(self, title: str, sha256: str, scenes: List[ParsedScene], raw_text: str, total_pages: int):
        self.title = title
        self.sha256 = sha256
        self.scenes = scenes
        self.raw_text = raw_text
        self.total_pages = total_pages

class ScreenplayParser:
    """Parses plain text / Fountain / FDX screenplays into structured scenes with page & line offsets."""
    
    @staticmethod
    def parse_text(text: str, title: str = "Untitled Script") -> ScreenplayParseResult:
        sha256 = hashlib.sha256(text.encode('utf-8')).hexdigest()
        lines = text.splitlines()
        scenes: List[ParsedScene] = []
        
        scene_pattern = re.compile(r'^\s*(?:INT\.|EXT\.|INT/EXT\.|EXT/INT\.)\s+(.+)', re.IGNORECASE)
        
        current_scene_header = "START / PROLOGUE"
        current_scene_lines = []
        current_scene_start = 1
        scene_count = 0
        current_page = 1
        lines_per_page = 55  # Standard screenplay estimate
        
        for i, line in enumerate(lines, start=1):
            if (i // lines_per_page) + 1 > current_page:
                current_page = (i // lines_per_page) + 1

            match = scene_pattern.match(line)
            if match:
                if current_scene_lines:
                    scene_id = f"SC_{scene_count:03d}"
                    scene_text = "\n".join(current_scene_lines)
                    scenes.append(ParsedScene(
                        scene_id=scene_id,
                        header=current_scene_header,
                        number=scene_count,
                        start_line=current_scene_start,
                        text=scene_text,
                        page_number=max(1, (current_scene_start // lines_per_page) + 1)
                    ))
                scene_count += 1
                current_scene_header = line.strip()
                current_scene_lines = [line]
                current_scene_start = i
            else:
                current_scene_lines.append(line)
                
        if current_scene_lines:
            scene_count += 1
            scene_id = f"SC_{scene_count:03d}"
            scenes.append(ParsedScene(
                scene_id=scene_id,
                header=current_scene_header,
                number=scene_count,
                start_line=current_scene_start,
                text="\n".join(current_scene_lines),
                page_number=max(1, (current_scene_start // lines_per_page) + 1)
            ))
            
        total_pages = max(1, len(lines) // lines_per_page)
        return ScreenplayParseResult(
            title=title,
            sha256=sha256,
            scenes=scenes,
            raw_text=text,
            total_pages=total_pages
        )
