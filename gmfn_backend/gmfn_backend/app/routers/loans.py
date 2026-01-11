from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Loan, LoanGuarantor
from app.schemas.loan_guarantors import LoanGuarantorCreate, LoanGuarantorOut
from app.core.clan_auth import get_current_clan_membership

router = APIRouter()
