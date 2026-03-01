from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ParsedSection:
    text: str
    page_number: int
    section_title: Optional[str] = None
    is_table: bool = False


class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_path: str) -> tuple[list[ParsedSection], int]:
        """Parse a file and return (sections, total_pages)."""
        ...