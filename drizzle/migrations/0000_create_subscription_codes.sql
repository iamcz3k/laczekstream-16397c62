CREATE TABLE public.sub_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'noads',
  duration_days integer NOT NULL DEFAULT 30,
  max_devices integer NOT NULL DEFAULT 3,
  note text,
  buyer_name text,
  buyer_contact text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sub_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.sub_codes(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_label text,
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, device_id)
);

CREATE TABLE public.sub_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name text,
  buyer_contact text,
  plan text NOT NULL DEFAULT 'noads',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  method text,
  status text NOT NULL DEFAULT 'pending',
  code_id uuid REFERENCES public.sub_codes(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_redemptions_code ON public.sub_redemptions(code_id);
CREATE INDEX idx_sub_payments_created ON public.sub_payments(created_at DESC);

GRANT ALL ON public.sub_codes TO service_role;
GRANT ALL ON public.sub_redemptions TO service_role;
GRANT ALL ON public.sub_payments TO service_role;

ALTER TABLE public.sub_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to sub codes" ON public.sub_codes AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "No public access to sub redemptions" ON public.sub_redemptions AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "No public access to sub payments" ON public.sub_payments AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
