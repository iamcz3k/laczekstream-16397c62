-- Complete fix for visitor_sessions RLS policies broken by migration 20260606010525.
--
-- Root cause: both INSERT and UPDATE policies checked duration_seconds >= 0
-- and page_views >= 0, but those columns are NOT included in the initial
-- upsert payload from tracker.ts. Postgres evaluates NULL >= 0 as NULL
-- (not true), so the WITH CHECK fails and every insert/update is silently
-- rejected. The columns already have DEFAULT 0 in the schema so the check
-- is completely redundant.
--
-- Additionally: upsert with onConflict:"session_key" resolves as an UPDATE
-- on returning visitors, so the broken UPDATE policy was also blocking them.

-- Drop both broken policies
DROP POLICY IF EXISTS "Visitors can create valid session rows" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Visitors can update valid session rows" ON public.visitor_sessions;

-- Recreate INSERT policy — only validate session_key
CREATE POLICY "Visitors can create valid session rows"
  ON public.visitor_sessions FOR INSERT
  TO public
  WITH CHECK (
    session_key IS NOT NULL
    AND char_length(session_key) BETWEEN 4 AND 200
  );

-- Recreate UPDATE policy — only validate session_key
CREATE POLICY "Visitors can update valid session rows"
  ON public.visitor_sessions FOR UPDATE
  TO public
  USING (
    session_key IS NOT NULL
    AND char_length(session_key) BETWEEN 4 AND 200
  )
  WITH CHECK (
    session_key IS NOT NULL
    AND char_length(session_key) BETWEEN 4 AND 200
  );
