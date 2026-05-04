-- Visitor sessions tracking for V3 admin analytics
CREATE TABLE public.visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL,
  name text,
  country text,
  city text,
  ip text,
  user_agent text,
  device text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 0,
  current_path text,
  watched jsonb NOT NULL DEFAULT '[]'::jsonb,
  searches jsonb NOT NULL DEFAULT '[]'::jsonb,
  page_views integer NOT NULL DEFAULT 1
);

CREATE INDEX idx_visitor_sessions_session_key ON public.visitor_sessions(session_key);
CREATE INDEX idx_visitor_sessions_last_seen ON public.visitor_sessions(last_seen_at DESC);
CREATE INDEX idx_visitor_sessions_started ON public.visitor_sessions(started_at DESC);

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert/update their own session row (no auth on site)
CREATE POLICY "Anyone can insert visitor session"
  ON public.visitor_sessions FOR INSERT
  TO public WITH CHECK (true);

CREATE POLICY "Anyone can update visitor session"
  ON public.visitor_sessions FOR UPDATE
  TO public USING (true) WITH CHECK (true);

-- Reading is restricted: admin panel reads via a server function with password check
CREATE POLICY "No public read of visitor sessions"
  ON public.visitor_sessions FOR SELECT
  TO public USING (false);
