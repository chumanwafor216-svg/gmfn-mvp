-- GMFN MVP schema v1

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id),
  balance_total_kobo BIGINT NOT NULL DEFAULT 0,
  balance_locked_kobo BIGINT NOT NULL DEFAULT 0,
  balance_available_kobo BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (balance_available_kobo = balance_total_kobo - balance_locked_kobo)
);

CREATE TABLE IF NOT EXISTS cash_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id),
  amount_kobo BIGINT NOT NULL,
  lock_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cci_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL,
  owner_id UUID NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_type, owner_id)
);
