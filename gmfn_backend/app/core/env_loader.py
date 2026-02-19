# app/core/env_loader.py
from __future__ import annotations

import os
from pathlib import Path


def load_dotenv_if_present() -> None:
    """
    Minimal .env loader (no external dependency).
    Loads KEY=VALUE lines into os.environ if not already set.
    - Ignores blank lines and comments (#)
    - Supports quoted values
    """
    root = Path(__file__).resolve().parents[2]  # .../app/core -> project root
    env_path = root / ".env"
    if not env_path.exists():
        return

    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        key = k.strip()
        val = v.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val