from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
TEXT_MODEL = "gemini-3-flash-preview"
EMBEDDING_MODEL = "gemini-embedding-002-preview"


def read_bytes(filename: str) -> bytes:
    return (DATA_DIR / filename).read_bytes()
