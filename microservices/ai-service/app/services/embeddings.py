import hashlib
import math
from typing import List


def _tokens(text: str) -> List[str]:
    return [t for t in "".join(ch.lower() if ch.isalnum() else " " for ch in text).split() if t]


def cheap_embedding(text: str, dim: int = 256) -> List[float]:
    vec = [0.0] * dim
    tokens = _tokens(text)

    if not tokens:
        return vec

    for token in tokens:
        digest = hashlib.md5(token.encode("utf-8")).hexdigest()
        idx = int(digest, 16) % dim
        vec[idx] += 1.0

    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]
