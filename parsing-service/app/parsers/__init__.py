from app.parsers.base import BaseParser
from app.parsers.excel_parser import ExcelParser
from app.parsers.pdf_parser import PDFParser
from app.parsers.text_parser import TextParser
from app.parsers.word_parser import WordParser

_PARSERS: dict[str, type[BaseParser]] = {
    "PDF": PDFParser,
    "XLSX": ExcelParser,
    "XLS": ExcelParser,
    "DOCX": WordParser,
    "TXT": TextParser,
    "MD": TextParser,
}


def get_parser(file_type: str) -> BaseParser:
    cls = _PARSERS.get(file_type.upper())
    if cls is None:
        raise ValueError(f"Unsupported file type: {file_type}")
    return cls()
