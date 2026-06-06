-- Add countdown and maintenance features to featured_events table
ALTER TABLE public.featured_events
  ADD COLUMN IF NOT EXISTS show_countdown BOOLEAN NOT NULL DEFAULT false;

-- Create site_settings table for maintenance mode and global config
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Seed default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('maintenance_mode', '{"enabled": false, "message": "The site is under maintenance. Please try again later."}')
ON CONFLICT (key) DO NOTHING;