-- THE FIX: Migration 20260606010525 broke visitor tracking by adding
-- duration_seconds >= 0 and page_views >= 0 to RLS policies.
-- tracker.ts does NOT send those fields on upsert, so NULL >= 0 = false
-- in Postgres, silently blocking every new visitor session insert/update.

-- Drop all current visitor_sessions policies
DROP POLICY IF EXISTS "Visitors can create valid session rows" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Visitors can update valid session rows" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Anyone can insert visitor session" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Anyone can update visitor session" ON public.visitor_sessions;
DROP POLICY IF EXISTS "No public read of visitor sessions" ON public.visitor_sessions;

-- Recreate them correctly
CREATE POLICY "Anyone can insert visitor session"
  ON public.visitor_sessions FOR INSERT
  TO public WITH CHECK (true);

CREATE POLICY "Anyone can update visitor session"
  ON public.visitor_sessions FOR UPDATE
  TO public USING (true) WITH CHECK (true);

CREATE POLICY "No public read of visitor sessions"
  ON public.visitor_sessions FOR SELECT
  TO public USING (false);
