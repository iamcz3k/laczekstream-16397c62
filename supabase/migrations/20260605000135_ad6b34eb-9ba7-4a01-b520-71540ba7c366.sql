
CREATE TABLE public.site_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL,
  user_name text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL,
  user_agent text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.site_reviews TO anon, authenticated;
GRANT ALL ON public.site_reviews TO service_role;
ALTER TABLE public.site_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit reviews" ON public.site_reviews FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "No public read of reviews" ON public.site_reviews FOR SELECT TO public USING (false);

CREATE TABLE public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL,
  fulfilled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_requests_session_key_idx ON public.review_requests(session_key, fulfilled);
GRANT SELECT, UPDATE ON public.review_requests TO anon, authenticated;
GRANT ALL ON public.review_requests TO service_role;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read own requests by session key" ON public.review_requests FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can mark fulfilled" ON public.review_requests FOR UPDATE TO public USING (true) WITH CHECK (true);

INSERT INTO public.feature_flags (key, description, enabled) VALUES
  ('reviews_enabled', 'Show review popup to eligible visitors', true),
  ('reviews_manual_mode', 'When ON, only show review popup to visitors the admin explicitly targets', false)
ON CONFLICT (key) DO NOTHING;
