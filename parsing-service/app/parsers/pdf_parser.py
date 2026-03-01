import logging
from typing import Optional

import fitz  # PyMuPDF
import pdfplumber

from app.parsers.base import BaseParser, ParsedSection

logger = logging.getLogger(__name__)


def _rects_overlap(mupdf_rect: tuple, plumber_bbox: tuple, threshold: float = 0.4) -> bool:
    """Check if a PyMuPDF block rect overlaps with a pdfplumber table bbox.

    PyMuPDF:   (x0, y0, x1, y1) — origin top-left, y increases downward
    pdfplumber: (x0, top, x1, bottom) — same convention
    """
    ax0, ay0, ax1, ay1 = mupdf_rect
    bx0, by0, bx1, by1 = plumber_bbox

    x_overlap = max(0.0, min(ax1, bx1) - max(ax0, bx0))
    y_overlap = max(0.0, min(ay1, by1) - max(ay0, by0))
    overlap_area = x_overlap * y_overlap

    block_area = max((ax1 - ax0) * (ay1 - ay0), 1.0)
    return (overlap_area / block_area) > threshold


class PDFParser(BaseParser):
    def parse(self, file_path: str) -> tuple[list[ParsedSection], int]:
        sections: list[ParsedSection] = []

        # Step 1: extract tables and their bounding boxes via pdfplumber
        table_data_by_page: dict[int, list[list[list[str]]]] = {}
        table_bboxes_by_page: dict[int, list[tuple]] = {}

        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)
            for page in pdf.pages:
                pnum = page.page_number
                found = page.find_tables()
                if found:
                    table_bboxes_by_page[pnum] = [t.bbox for t in found]
                    table_data_by_page[pnum] = [t.extract() for t in found]

        # Step 2: extract text blocks via PyMuPDF, skip table regions
        doc = fitz.open(file_path)
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_number = page_idx + 1
            table_bboxes = table_bboxes_by_page.get(page_number, [])

            current_title: Optional[str] = None
            page_height = page.rect.height

            text_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)
            for block in text_dict.get("blocks", []):
                if block.get("type") != 0:  # 0 = text block
                    continue

                bx0, by0, bx1, by1 = block["bbox"]
                # pdfplumber uses top-left origin with y from top — same as PyMuPDF
                if any(_rects_overlap((bx0, by0, bx1, by1), bbox) for bbox in table_bboxes):
                    continue

                block_text = ""
                max_font_size = 0.0
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        block_text += span.get("text", "")
                        max_font_size = max(max_font_size, span.get("size", 0.0))
                    block_text += "\n"
                block_text = block_text.strip()

                if not block_text:
                    continue

                # Heuristic: larger font → likely a heading
                if max_font_size >= 14 and len(block_text) < 200:
                    current_title = block_text
                    sections.append(ParsedSection(
                        text=block_text,
                        page_number=page_number,
                        section_title=None,
                        is_table=False,
                    ))
                else:
                    sections.append(ParsedSection(
                        text=block_text,
                        page_number=page_number,
                        section_title=current_title,
                        is_table=False,
                    ))

            # Step 3: add table sections for this page
            for table in table_data_by_page.get(page_number, []):
                if not table:
                    continue
                rows = []
                for row in table:
                    if row:
                        row_text = " | ".join(
                            str(cell).strip() if cell is not None else "" for cell in row
                        )
                        if row_text.strip():
                            rows.append(row_text)
                if rows:
                    sections.append(ParsedSection(
                        text="\n".join(rows),
                        page_number=page_number,
                        section_title=current_title,
                        is_table=True,
                    ))

        doc.close()
        return sections, total_pages
