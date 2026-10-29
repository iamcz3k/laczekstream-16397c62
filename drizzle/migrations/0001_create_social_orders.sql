CREATE TABLE public.social_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  platform text NOT NULL,
  service text NOT NULL,
  target_url text NOT NULL,
  quantity integer NOT NULL DEFAULT 100,
  delivered integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  network text,
  customer text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.social_orders TO service_role;
ALTER TABLE public.social_orders ENABLE ROW LEVEL SECURITY;