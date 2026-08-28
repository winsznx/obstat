import re
import uuid
import os
import json
from typing import List, Optional
from app.models.clearance_record import ClearanceItem, ItemType, Occurrence

# Corporation & brand suffix patterns
CORP_PREFIX = re.compile(
    r'\b([A-Z][A-Za-z0-9&\'\-]+(?:\s+[A-Z][A-Za-z0-9&\'\-]+){0,4})\s+(?:Inc\.?|LLC\.?|Ltd\.?|Corp\.?|Co\.?|Group|Studios?|Records?|Entertainment|Productions?|Media|Films?|Networks?|Brands?|Industries|Holdings|Technologies|Labs)\b'
)

# Screenplay character cue: centered / indented ALL CAPS line
CHAR_CUE = re.compile(r'^[ \t]{10,}([A-Z][A-Z0-9 \'\-\.]{1,40})(?:\s*\((?:V\.O\.|O\.S\.|O\.C\.|CONT\'D)\))?\s*$')

# Scene header line: INT./EXT.
SCENE_HEADER = re.compile(r'^\s*(?:INT\.|EXT\.|INT/EXT\.|EXT/INT\.)\s+(.+)', re.IGNORECASE)

# Real-world Address Pattern (e.g. 440 SOUND AVENUE, 1200 SUNSET BLVD)
ADDRESS_PATTERN = re.compile(r'\b(\d{1,5}\s+[A-Z][A-Za-z0-9\.\'\-]+\s+(?:Avenue|Ave\.?|Boulevard|Blvd\.?|Street|St\.?|Drive|Dr\.?|Lane|Ln\.?|Road|Rd\.?|Way|Place|Pl\.?|Circle|Square))\b', re.IGNORECASE)

# Phone Number Pattern (e.g. 555-0199, (212) 555-0143)
PHONE_PATTERN = re.compile(r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b')

# Music / Media Quoted Reference in Quotes (e.g. "VELA RECORDS - MASTER CUT 1984", "HOTEL CALIFORNIA")
QUOTED_REFERENCE = re.compile(r'["\u201c\u201d]([A-Z0-9\s\-\'\.,&]{3,50})["\u201c\u201d]')

# Title-Case Proper Nouns
PROPER_NOUN = re.compile(r'\b([A-Z][a-z]{1,}(?:\s+[A-Z][a-z]{1,}){1,4})\b')

STOPWORDS = {
    'The', 'A', 'An', 'And', 'Or', 'But', 'In', 'On', 'At', 'To', 'For',
    'Of', 'By', 'With', 'From', 'Is', 'Are', 'Was', 'Were', 'Be', 'Been',
    'Have', 'Has', 'Had', 'Do', 'Does', 'Did', 'Will', 'Would', 'Could',
    'Should', 'May', 'Might', 'Must', 'Shall', 'Can', 'Not', 'No', 'So',
    'As', 'If', 'Then', 'That', 'This', 'These', 'Those', 'He', 'She',
    'They', 'We', 'You', 'It', 'His', 'Her', 'Their', 'Our', 'Its', 'My',
    'Your', 'Day', 'Night', 'Morning', 'Later', 'Back', 'Scene', 'Continuous',
    'Moment', 'Suddenly', 'Inside', 'Outside', 'Across', 'Through', 'Between'
}


class GeminiExtractor:
    """
    Google ADK & Gemini Screenplay Clearance Semantic Extractor.
    Extracts versioned clearance candidates across all clearance taxonomy types:
    - CHARACTER_NAME
    - PERSON_NAME
    - BUSINESS_ORG
    - VENUE_LOCATION
    - BRAND_PRODUCT
    - MUSIC_REFERENCE
    - MEDIA_WORK
    - ADDRESS
    - PHONE_NUMBER
    - QUOTED_TEXT
    """

    def __init__(self, use_vertex: bool = True, project: Optional[str] = None, location: Optional[str] = None):
        self.use_vertex = use_vertex
        self.project = project or os.getenv("GOOGLE_CLOUD_PROJECT", "project-2ac1d1fb-7da1-46b4-90e")
        self.location = location or os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")

    def extract_clearance_items(self, screenplay_text: str, revision_id: str) -> List[ClearanceItem]:
        lines = screenplay_text.splitlines()
        items: List[ClearanceItem] = []
        seen = set()

        def add_item(name: str, item_type: ItemType, scene_id: str, page: int, line_num: int, occurrence: str, snippet: str):
            clean_name = name.strip()
            key = (clean_name.upper(), item_type)
            if key in seen or len(clean_name) < 2:
                return
            seen.add(key)
            items.append(ClearanceItem(
                item_id=f"item_{uuid.uuid4().hex[:8]}",
                item_string=clean_name,
                item_type=item_type,
                occurrences=[Occurrence(
                    revision_id=revision_id,
                    scene_id=scene_id,
                    page_number=page,
                    line_offset=line_num,
                    occurrence_text=occurrence.strip()[:120],
                    context_snippet=snippet.strip()[:200]
                )]
            ))

        current_scene = "SC_001"
        scene_count = 0
        lines_per_page = 55

        for line_num, line in enumerate(lines, start=1):
            page = max(1, (line_num // lines_per_page) + 1)
            snippet = line.strip()
            if not snippet:
                continue

            # 1. Scene Headers -> VENUE_LOCATION
            scene_match = SCENE_HEADER.match(line)
            if scene_match:
                scene_count += 1
                current_scene = f"SC_{scene_count:03d}"
                loc_text = scene_match.group(1)
                loc_clean = re.sub(
                    r'\s*[-\u2013]\s*(DAY|NIGHT|MORNING|EVENING|DUSK|DAWN|CONTINUOUS|LATER|FLASHBACK)\s*$',
                    '', loc_text, flags=re.IGNORECASE
                ).strip()
                if loc_clean:
                    add_item(loc_clean, ItemType.VENUE_LOCATION, current_scene, page, line_num, loc_clean, snippet)
                continue

            # 2. Character Cues -> CHARACTER_NAME
            char_match = CHAR_CUE.match(line)
            if char_match:
                char_name = char_match.group(1).strip()
                if char_name not in ('CONTINUED', 'CUT TO', 'FADE OUT', 'FADE IN', 'THE END', 'SMASH CUT', 'BLACK', 'SCENE'):
                    # Differentiate character vs business cue
                    if CORP_PREFIX.search(char_name):
                        add_item(char_name, ItemType.BUSINESS_ORG, current_scene, page, line_num, char_name, snippet)
                    else:
                        add_item(char_name, ItemType.CHARACTER_NAME, current_scene, page, line_num, char_name, snippet)
                continue

            # 3. Quoted references (Demo tape titles, songs, media) -> MEDIA_WORK / MUSIC_REFERENCE / BUSINESS_ORG
            for q_match in QUOTED_REFERENCE.finditer(line):
                q_text = q_match.group(1).strip()
                if CORP_PREFIX.search(q_text) or any(w in q_text.upper() for w in ['RECORDS', 'PRODUCTIONS', 'STUDIOS', 'INC', 'LLC']):
                    add_item(q_text, ItemType.BUSINESS_ORG, current_scene, page, line_num, q_text, snippet)
                elif any(w in q_text.upper() for w in ['SONG', 'TRACK', 'CUT', 'ALBUM', 'REMIX', 'TAPE']):
                    add_item(q_text, ItemType.MUSIC_REFERENCE, current_scene, page, line_num, q_text, snippet)
                else:
                    add_item(q_text, ItemType.QUOTED_TEXT, current_scene, page, line_num, q_text, snippet)

            # 4. Addresses -> ADDRESS
            for addr_match in ADDRESS_PATTERN.finditer(line):
                addr_text = addr_match.group(1).strip()
                add_item(addr_text, ItemType.ADDRESS, current_scene, page, line_num, addr_text, snippet)

            # 5. Phone numbers -> PHONE_NUMBER
            for phone_match in PHONE_PATTERN.finditer(line):
                phone_text = phone_match.group(0).strip()
                add_item(phone_text, ItemType.PHONE_NUMBER, current_scene, page, line_num, phone_text, snippet)

            # 6. Corporate / Business Entities (Title Case with Corp Suffix)
            for corp_match in CORP_PREFIX.finditer(line):
                corp_text = corp_match.group(0).strip()
                add_item(corp_text, ItemType.BUSINESS_ORG, current_scene, page, line_num, corp_text, snippet)

            # 7. Action lines with ALL-CAPS names (e.g. MERCER VALE (40s))
            all_caps_phrases = re.findall(r'\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b', line)
            for phrase in all_caps_phrases:
                words = phrase.split()
                if len(words) == 1 and phrase in {
                    'INT', 'EXT', 'CUT', 'FADE', 'DAY', 'NIGHT', 'CONTINUED',
                    'DISSOLVE', 'SMASH', 'BACK', 'THE', 'OF', 'A', 'AND', 'OR', 'SCENE'
                }:
                    continue
                if len(phrase) >= 4 and len(words) >= 2:
                    if CORP_PREFIX.search(phrase):
                        add_item(phrase, ItemType.BUSINESS_ORG, current_scene, page, line_num, phrase, snippet)
                    else:
                        add_item(phrase, ItemType.CHARACTER_NAME, current_scene, page, line_num, phrase, snippet)

            # 8. Title-case proper nouns in action/dialogue
            for noun_match in PROPER_NOUN.finditer(line):
                noun = noun_match.group(1).strip()
                words = noun.split()
                if any(w in STOPWORDS for w in words):
                    continue
                if len(noun) >= 5 and len(words) >= 2:
                    add_item(noun, ItemType.PERSON_NAME, current_scene, page, line_num, noun, snippet)

        return items
