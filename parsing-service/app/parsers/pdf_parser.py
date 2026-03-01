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
    # pdfplumber table detection settings — tuned for Korean financial docs
    TABLE_SETTINGS = {
        "vertical_strategy": "text",
        "horizontal_strategy": "text",
        "snap_x_tolerance": 5,
        "snap_y_tolerance": 5,
        "join_x_tolerance": 5,
        "join_y_tolerance": 5,
        "min_words_vertical": 2,
        "min_words_horizontal": 2,
    }

    def parse(self, file_path: str) -> tuple[list[ParsedSection], int]:
        sections: list[ParsedSection] = []

        # Step 1: extract tables and their bounding boxes via pdfplumber
        table_data_by_page: dict[int, list[list[list[str]]]] = {}
        table_bboxes_by_page: dict[int, list[tuple]] = {}

        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)
            for page in pdf.pages:
                pnum = page.page_number

                # Try default (lines-based) first; if no tables found,
                # retry with text-based strategy for borderless tables.
                found = page.find_tables()
                if not found:
                    found = page.find_tables(table_settings=self.TABLE_SETTINGS)

                if found:
                    table_bboxes_by_page[pnum] = [t.bbox for t in found]
                    extracted = []
                    for t in found:
                        raw = t.extract()
                        cleaned = self._clean_table(raw)
                        extracted.append(cleaned)
                    table_data_by_page[pnum] = extracted

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
            tables = table_data_by_page.get(page_number, [])
            bboxes = table_bboxes_by_page.get(page_number, [])
            for idx, table in enumerate(tables):
                if not table:
                    # Table extraction failed — fallback: extract raw text from the region
                    if idx < len(bboxes):
                        fallback_text = self._extract_text_from_bbox(page, bboxes[idx])
                        if fallback_text:
                            sections.append(ParsedSection(
                                text=fallback_text,
                                page_number=page_number,
                                section_title=current_title,
                                is_table=False,
                            ))
                    continue

                rows = []
                for row in table:
                    if not row:
                        continue
                    cells = [
                        str(cell).strip() if cell is not None else ""
                        for cell in row
                    ]
                    # Skip rows where all cells are empty
                    if not any(cells):
                        continue
                    rows.append(" | ".join(cells))

                # If all rows are mostly empty, fall back to raw text
                non_empty_cells = sum(
                    1 for r in rows for c in r.split(" | ") if c.strip()
                )
                total_cells = sum(
                    len(r.split(" | ")) for r in rows
                ) if rows else 0

                if total_cells > 0 and non_empty_cells / total_cells < 0.3:
                    logger.warning(
                        "Table on page %d has %.0f%% empty cells, using text fallback",
                        page_number, (1 - non_empty_cells / total_cells) * 100,
                    )
                    if idx < len(bboxes):
                        fallback_text = self._extract_text_from_bbox(page, bboxes[idx])
                        if fallback_text:
                            sections.append(ParsedSection(
                                text=fallback_text,
                                page_number=page_number,
                                section_title=current_title,
                                is_table=False,
                            ))
                    continue

                if rows:
                    sections.append(ParsedSection(
                        text="\n".join(rows),
                        page_number=page_number,
                        section_title=current_title,
                        is_table=True,
                    ))

        doc.close()
        return sections, total_pages

    @staticmethod
    def _clean_table(table: list[list[str | None]]) -> list[list[str | None]]:
        """Remove columns and rows that are entirely empty/None."""
        if not table:
            return table

        num_cols = max(len(row) for row in table) if table else 0
        # Identify columns that have at least one non-empty value
        keep_cols = set()
        for row in table:
            for col_idx, cell in enumerate(row):
                if cell is not None and str(cell).strip():
                    keep_cols.add(col_idx)

        # Filter columns and rows
        cleaned = []
        for row in table:
            new_row = [
                row[i] if i < len(row) else None
                for i in range(num_cols)
                if i in keep_cols
            ]
            # Keep row if it has at least one non-empty cell
            if any(c is not None and str(c).strip() for c in new_row):
                cleaned.append(new_row)

        return cleaned

    @staticmethod
    def _extract_text_from_bbox(page, bbox: tuple) -> str:
        """Extract raw text from a PyMuPDF page within a bounding box (fallback)."""
        x0, y0, x1, y1 = bbox
        clip = fitz.Rect(x0, y0, x1, y1)
        text = page.get_text("text", clip=clip).strip()
        return text
