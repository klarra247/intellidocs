import logging

import openpyxl

from app.parsers.base import BaseParser, ParsedSection

logger = logging.getLogger(__name__)


class ExcelParser(BaseParser):
    def parse(self, file_path: str) -> tuple[list[ParsedSection], int]:
        sections: list[ParsedSection] = []

        wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
        sheet_count = len(wb.sheetnames)

        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            rows: list[str] = []

            for row in sheet.iter_rows():
                cells = [
                    str(cell.value).strip() if cell.value is not None else ""
                    for cell in row
                ]
                if any(cells):
                    rows.append(" | ".join(cells))

            if rows:
                sections.append(ParsedSection(
                    text="\n".join(rows),
                    page_number=1,
                    section_title=sheet_name,
                    is_table=True,
                ))

        wb.close()
        return sections, sheet_count
