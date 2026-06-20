-- BMR operational data for browser/online users (control server, APP_MODE=full).
-- Desktop hybrid mode keeps using local JSON + disk (not these tables).

CREATE TABLE IF NOT EXISTS public.templates (
  id TEXT PRIMARY KEY,
  firm_id TEXT NOT NULL REFERENCES public.firms (id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  valid_until TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS templates_firm_id_idx ON public.templates (firm_id);

CREATE TABLE IF NOT EXISTS public.signatures (
  id TEXT PRIMARY KEY,
  firm_id TEXT NOT NULL REFERENCES public.firms (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_data_url TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS signatures_firm_id_idx ON public.signatures (firm_id);

CREATE TABLE IF NOT EXISTS public.bmr_requests (
  id TEXT PRIMARY KEY,
  firm_id TEXT NOT NULL REFERENCES public.firms (id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  department TEXT,
  batch_number TEXT NOT NULL,
  batch_size TEXT,
  remarks TEXT,
  requested_by TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approval JSONB,
  rejection JSONB
);

CREATE INDEX IF NOT EXISTS bmr_requests_firm_id_idx ON public.bmr_requests (firm_id);
CREATE INDEX IF NOT EXISTS bmr_requests_status_idx ON public.bmr_requests (status);

CREATE TABLE IF NOT EXISTS public.firm_settings (
  firm_id TEXT PRIMARY KEY REFERENCES public.firms (id) ON DELETE CASCADE,
  production_user TEXT NOT NULL DEFAULT 'Production User',
  qa_user TEXT NOT NULL DEFAULT 'QA User'
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bmr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_settings ENABLE ROW LEVEL SECURITY;

-- Create storage buckets for online PDFs (service_role backend access only).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('template-pdfs', 'template-pdfs', false, 52428800, ARRAY['application/pdf']::text[]),
  ('stamped-pdfs', 'stamped-pdfs', false, 52428800, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;
