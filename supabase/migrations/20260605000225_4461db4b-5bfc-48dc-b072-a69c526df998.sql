
ALTER TABLE public.featured_events
  ADD COLUMN IF NOT EXISTS display_mode text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS flag_left text,
  ADD COLUMN IF NOT EXISTS flag_right text,
  ADD COLUMN IF NOT EXISTS team_left text,
  ADD COLUMN IF NOT EXISTS team_right text,
  ADD COLUMN IF NOT EXISTS bg_color text;
