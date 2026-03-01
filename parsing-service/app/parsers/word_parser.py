import logging
from typing import Optional

from docx import Document as DocxDocument
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

from app.parsers.base import BaseParser, ParsedSection

logger = logging.getLogger(__name__)


class WordParser(BaseParser):
    def parse(self, file_path: str) -> tuple[list[ParsedSection], int]:
        doc = DocxDocument(file_path)
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

        for child in doc.element.body.iterchildren():
            tag = child.tag.split("}")[-1]

            if tag == "p":
                para = Paragraph(child, doc)
                text = para.text.strip()
                if not text:
                    continue
                style = para.style.name if para.style else ""
                if style.startswith("Heading"):
                    flush()
                    current_title = text
                else:
                    text_buffer.append(text)

            elif tag == "tbl":
                flush()
                table = Table(child, doc)
                rows: list[str] = []
                for row in table.rows:
                    cells = [cell.text.strip() for cell in row.cells]
                    if any(cells):
                        rows.append(" | ".join(cells))
                if rows:
                    sections.append(ParsedSection(
                        text="\n".join(rows),
                        page_number=1,
                        section_title=current_title,
                        is_table=True,
                    ))

        flush()
        return sections, 1
