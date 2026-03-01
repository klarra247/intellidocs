import logging
from typing import Optional

from app.parsers.base import BaseParser, ParsedSection

logger = logging.getLogger(__name__)


class TextParser(BaseParser):
    def parse(self, file_path: str) -> tuple[list[ParsedSection], int]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        sections: list[ParsedSection] = []
        current_title: Optional[str] = None
        text_buffer: list[str] = []

        def flush() -> None:
            if text_buffer:
                sections.append(ParsedSection(
                    text="\n".join(text_buffer),
                    page_number=1,
                    section_title=current_title,
                    is_table=False,
                ))
                text_buffer.clear()

        for line in content.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            # Detect markdown headings
            if stripped.startswith("#"):
                flush()
                current_title = stripped.lstrip("#").strip()
            else:
                text_buffer.append(stripped)

        flush()

        if not sections:
            sections.append(ParsedSection(
                text=content.strip(),
                page_number=1,
                section_title=None,
                is_table=False,
            ))

        return sections, 1
