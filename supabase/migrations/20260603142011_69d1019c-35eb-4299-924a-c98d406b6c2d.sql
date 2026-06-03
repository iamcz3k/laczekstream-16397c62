-- Feature flags + featured events for LACZEK admin CMS

CREATE TABLE public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

-- Writes go through admin server functions using service_role; no public write policy.

CREATE TABLE public.featured_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  link_url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'general',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  click_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.featured_events TO anon, authenticated;
GRANT ALL ON public.featured_events TO service_role;

ALTER TABLE public.featured_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read featured events"
  ON public.featured_events FOR SELECT
  USING (true);

CREATE INDEX idx_featured_events_active ON public.featured_events(active, priority DESC);

-- Seed common feature flags so the admin sees toggles immediately
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('watch_party',     true,  'Watch Party rooms (sync viewing)'),
  ('advanced_search', true,  'Live search suggestions + filters'),
  ('autoplay_next',   true,  'Auto-play next TV episode'),
  ('skip_recap',      true,  'Skip Recap button in player'),
  ('pip_button',      true,  'Picture-in-Picture button'),
  ('title_details',   true,  'Rich title pages with cast'),
  ('live_sports',     true,  'Live Sports tab (NBA/NFL/F1/etc.)'),
  ('podcasts',        true,  'Podcasts tab'),
  ('radio',           true,  'Radio tab'),
  ('featured_banner', true,  'Featured events banner on home')
ON CONFLICT (key) DO NOTHING;