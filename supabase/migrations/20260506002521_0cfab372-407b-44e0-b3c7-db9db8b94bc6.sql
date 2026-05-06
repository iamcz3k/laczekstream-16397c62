ALTER TABLE public.visitor_sessions
  ADD COLUMN IF NOT EXISTS path_log jsonb NOT NULL DEFAULT '[]'::jsonb;