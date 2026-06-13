from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Dict, List


INSIGHTS: List[str] = [
    "Trust builds faster than capital.",
    "Save before spending.",
    "Consistency builds credibility.",
    "Profit is what you keep, not what you sell.",
    "Your reputation is financial capital.",
    "Reliable traders separate profit from working capital.",
    "Small daily savings become large future capital.",
    "Your reputation travels faster than your goods.",
    "Strong traders build relationships, not only sales.",
    "Repaying early increases your trust strength.",
    "A disciplined trader always knows today's balance.",
    "Growth comes from reinvesting profits.",
    "The market rewards reliability.",
    "Trust attracts opportunity.",
    "People support traders who honour commitments."
]


def _today_seed() -> int:
    today = datetime.utcnow().strftime("%Y-%m-%d")
    h = hashlib.sha256(today.encode()).hexdigest()
    return int(h[:8], 16)


def get_daily_market_wisdom() -> Dict[str, str]:
    seed = _today_seed()
    idx = seed % len(INSIGHTS)

    return {
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "text": INSIGHTS[idx],
        "source": "GSN Market Wisdom",
    }
