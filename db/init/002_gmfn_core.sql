-- 002_gmfn_core.sql

CREATE TABLE IF NOT EXISTS clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clan_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  inherited_cci INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (clan_id, user_id)
);
-- Borrow requests
CREATE TABLE IF NOT EXISTS borrow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_user_id UUID NOT NULL REFERENCES users(id),
    amount_kobo BIGINT NOT NULL,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

-- Loans
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrow_request_id UUID REFERENCES borrow_requests(id),
    borrower_user_id UUID NOT NULL REFERENCES users(id),
    principal_kobo BIGINT NOT NULL,
    status TEXT DEFAULT 'active',
    due_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- Repayments
CREATE TABLE IF NOT EXISTS repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id),
    amount_kobo BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
); 

-- Loans
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrow_request_id UUID UNIQUE NOT NULL REFERENCES borrow_requests(id) ON DELETE RESTRICT,
  borrower_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  principal_kobo BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  issued_at TIMESTAMPTZ DEFAULT now(),
  due_at TIMESTAMPTZ NOT NULL
);

-- Repayments
CREATE TABLE IF NOT EXISTS repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount_kobo BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
); 
