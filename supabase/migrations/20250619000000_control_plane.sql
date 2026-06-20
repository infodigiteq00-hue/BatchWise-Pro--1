-- Control-plane tables for super admin (users, firms, pause status).
-- BMR operational data: see 20250619100000_operational_data.sql (browser/online only).

CREATE TABLE IF NOT EXISTS public.firms (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS firms_company_name_lower_idx
  ON public.firms (lower(trim(company_name)));

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  contact_number TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL
    CHECK (role IN ('super_admin', 'firm_admin', 'team_member')),
  department TEXT
    CHECK (department IS NULL OR department IN ('production', 'qaqc', 'admin')),
  firm_id TEXT REFERENCES public.firms (id) ON DELETE SET NULL,
  company_name TEXT,
  status TEXT NOT NULL,
  password_hash TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  registered_at TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
  ON public.users (lower(trim(email)));

CREATE INDEX IF NOT EXISTS users_firm_id_idx ON public.users (firm_id);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Backend uses service_role key only; no public policies.
