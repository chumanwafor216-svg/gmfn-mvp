from typing import List, Optional
from pydantic import BaseModel


class GuarantorSuggestionRow(BaseModel):
    user_id: int
    email: Optional[str] = None
    trust_score: int
    trust_band: Optional[str] = None
    reliability_score: int
    total_requests: int
    approved: int
    declined: int
    expired: int
    reason: str


class GuarantorSuggestionsResponse(BaseModel):
    loan_id: int
    clan_id: int
    items: List[GuarantorSuggestionRow]
