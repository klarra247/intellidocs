import logging
from typing import Optional

import tiktoken

from app.parsers.base import ParsedSection

logger = logging.getLogger(__name__)

ENCODING = tiktoken.get_encoding("cl100k_base")
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


def _count_tokens(text: str) -> int:
    return len(ENCODING.encode(text))


def _chunk_text_section(
    section: ParsedSection, start_index: int
) -> list[dict]:
    """Sliding-window chunking for plain text sections."""
    tokens = ENCODING.encode(section.text)
    if not tokens:
        return []

    chunks: list[dict] = []
    i = 0
    while i < len(tokens):
        chunk_tokens = tokens[i: i + CHUNK_SIZE]
        chunk_text = ENCODING.decode(chunk_tokens)
        chunks.append({
            "chunkIndex": start_index + len(chunks),
            "text": chunk_text,
            "pageNumber": section.page_number,
            "sectionTitle": section.section_title,
            "chunkType": "TEXT",
            "tokenCount": len(chunk_tokens),
        })
        if i + CHUNK_SIZE >= len(tokens):
            break
        i += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks


def _chunk_table_section(
    section: ParsedSection, start_index: int
) -> list[dict]:
    """Group table rows into chunks, keeping header with each chunk.

    If the entire table fits within CHUNK_SIZE tokens, it becomes a single chunk.
    Otherwise rows are grouped with the header row repeated in each chunk so
    the LLM can interpret column meanings.
    """
    rows = [r for r in section.text.splitlines() if r.strip()]
    if not rows:
        return []

    full_text = "\n".join(rows)
    full_tokens = _count_tokens(full_text)

    # Small table → single chunk
    if full_tokens <= CHUNK_SIZE:
        return [{
            "chunkIndex": start_index,
            "text": full_text,
            "pageNumber": section.page_number,
            "sectionTitle": section.section_title,
            "chunkType": "TABLE",
            "tokenCount": full_tokens,
        }]

    # Large table → group data rows with header
    header = rows[0]
    header_tokens = _count_tokens(header + "\n")
    chunks: list[dict] = []
    current_rows = [header]
    current_tokens = header_tokens

    for row in rows[1:]:
        row_tokens = _count_tokens(row + "\n")
        if current_tokens + row_tokens > CHUNK_SIZE and len(current_rows) > 1:
            chunk_text = "\n".join(current_rows)
            chunks.append({
                "chunkIndex": start_index + len(chunks),
                "text": chunk_text,
                "pageNumber": section.page_number,
                "sectionTitle": section.section_title,
                "chunkType": "TABLE",
                "tokenCount": _count_tokens(chunk_text),
            })
            current_rows = [header]
            current_tokens = header_tokens
        current_rows.append(row)
        current_tokens += row_tokens

    # Remaining rows
    if len(current_rows) > 1:
        chunk_text = "\n".join(current_rows)
        chunks.append({
            "chunkIndex": start_index + len(chunks),
            "text": chunk_text,
            "pageNumber": section.page_number,
            "sectionTitle": section.section_title,
            "chunkType": "TABLE",
            "tokenCount": _count_tokens(chunk_text),
        })

    return chunks


def chunk_sections(sections: list[ParsedSection]) -> list[dict]:
    all_chunks: list[dict] = []

    for section in sections:
        if not section.text.strip():
            continue
        start = len(all_chunks)
        if section.is_table:
            new_chunks = _chunk_table_section(section, start)
        else:
            new_chunks = _chunk_text_section(section, start)
        all_chunks.extend(new_chunks)

    # Reassign sequential indices
    for i, chunk in enumerate(all_chunks):
        chunk["chunkIndex"] = i

    return all_chunks
