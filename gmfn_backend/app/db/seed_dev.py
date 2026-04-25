from sqlalchemy.orm import Session


def ensure_dev_seed(db: Session):
    """
    Legacy no-op.

    This project no longer creates or assigns any default community during dev
    startup. Community ownership must come only from real create/join flows.
    """
    return None
