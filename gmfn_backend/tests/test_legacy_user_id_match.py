from __future__ import annotations

import pytest
from sqlalchemy import Column, Integer, String, table

from app.services.legacy_user_id_match import (
    legacy_user_id_text_match,
    validate_user_id_for_legacy_text_match,
)


def test_validate_user_id_for_legacy_text_match_accepts_only_plain_positive_ids():
    assert validate_user_id_for_legacy_text_match(7) == 7
    assert validate_user_id_for_legacy_text_match("7") == 7

    for bad_value in (True, False, 0, -1, 1.2, " 7", "7 ", "GSN-U-7", "1.0", None):
        with pytest.raises(ValueError):
            validate_user_id_for_legacy_text_match(bad_value)


def test_legacy_user_id_text_match_casts_column_and_binds_validated_text_id():
    loans = table("loans", Column("borrower_user_id", String), Column("id", Integer))
    predicate = legacy_user_id_text_match(loans.c.borrower_user_id, 7)
    compiled = str(predicate.compile(compile_kwargs={"literal_binds": True}))

    assert "CAST" in compiled.upper()
    assert "borrower_user_id" in compiled
    assert "'7'" in compiled
