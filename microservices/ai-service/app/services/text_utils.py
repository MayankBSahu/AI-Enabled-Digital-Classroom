import re
from typing import List


def _find_sentence_boundary(text: str, pos: int, window: int = 150) -> int:
    """Find the nearest sentence boundary (. ! ? followed by space/newline) near `pos`."""
    search_start = max(0, pos - window)
    search_end = min(len(text), pos + window)
    region = text[search_start:search_end]

    # Look for sentence-ending punctuation followed by whitespace
    best = None
    for m in re.finditer(r'[.!?]\s', region):
        boundary = search_start + m.end()
        if best is None or abs(boundary - pos) < abs(best - pos):
            best = boundary

    return best if best is not None else pos


def _find_paragraph_boundary(text: str, pos: int, window: int = 200) -> int:
    """Find the nearest paragraph boundary (double newline) near `pos`."""
    search_start = max(0, pos - window)
    search_end = min(len(text), pos + window)
    region = text[search_start:search_end]

    best = None
    for m in re.finditer(r'\n\n+', region):
        boundary = search_start + m.end()
        if best is None or abs(boundary - pos) < abs(best - pos):
            best = boundary

    return best if best is not None else -1


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """
    Chunk text into overlapping segments, preferring to break at paragraph
    or sentence boundaries instead of cutting mid-word.
    """
    text = text.strip()
    if not text:
        return []

    # For very short texts, return as-is
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = min(len(text), start + chunk_size)

        # If we're not at the end, try to find a natural break point
        if end < len(text):
            # First try paragraph boundary
            para_break = _find_paragraph_boundary(text, end, window=150)
            if para_break > start + chunk_size // 2 and para_break <= end + 100:
                end = para_break
            else:
                # Then try sentence boundary
                sent_break = _find_sentence_boundary(text, end, window=120)
                if sent_break > start + chunk_size // 3 and sent_break <= end + 80:
                    end = sent_break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        # Overlap: step back to maintain context continuity
        start = max(start + 1, end - overlap)

    return chunks
