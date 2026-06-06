GRANT SELECT, INSERT, UPDATE ON public.visitor_sessions TO anon, authenticated;
GRANT ALL ON public.visitor_sessions TO service_role;

DROP POLICY IF EXISTS "Anyone can insert visitor session" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Anyone can update visitor session" ON public.visitor_sessions;
DROP POLICY IF EXISTS "No public read of visitor sessions" ON public.visitor_sessions;

CREATE POLICY "Anyone can insert visitor session"
  ON public.visitor_sessions FOR INSERT
  TO public WITH CHECK (true);

CREATE POLICY "Anyone can update visitor session"
  ON public.visitor_sessions FOR UPDATE
  TO public USING (true) WITH CHECK (true);

CREATE POLICY "No public read of visitor sessions"
  ON public.visitor_sessions FOR SELECT
  TO public USING (false);

GRANT SELECT, INSERT, UPDATE ON public.review_requests TO anon, authenticated;
GRANT ALL ON public.review_requests TO service_role;

DROP POLICY IF EXISTS "Anyone can read own requests by session key" ON public.review_requests;
DROP POLICY IF EXISTS "Anyone can mark fulfilled" ON public.review_requests;
DROP POLICY IF EXISTS "Admins can create review requests" ON public.review_requests;

CREATE POLICY "Anyone can read review requests"
  ON public.review_requests FOR SELECT
  TO public USING (true);

CREATE POLICY "Anyone can mark fulfilled"
  ON public.review_requests FOR UPDATE
  TO public USING (true) WITH CHECK (true);