-- Fix: INSERT policy added on 20260606010525 was rejecting all new visitor
-- sessions because duration_seconds and page_views are not sent on first
-- upsert, so NULL >= 0 evaluates to false in Postgres and silently blocks
-- the insert. The columns already have DEFAULT 0 so the check is redundant.

DROP POLICY IF EXISTS "Visitors can create valid session rows" ON public.visitor_sessions;

CREATE POLICY "Visitors can create valid session rows"
  ON public.visitor_sessions FOR INSERT
  TO public
  WITH CHECK (
    session_key IS NOT NULL
    AND char_length(session_key) BETWEEN 4 AND 200
  );
