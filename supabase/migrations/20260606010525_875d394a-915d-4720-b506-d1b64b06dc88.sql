DROP POLICY IF EXISTS "Anyone can insert visitor session" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Anyone can update visitor session" ON public.visitor_sessions;

CREATE POLICY "Visitors can create valid session rows"
  ON public.visitor_sessions FOR INSERT
  TO public
  WITH CHECK (
    session_key IS NOT NULL
    AND char_length(session_key) BETWEEN 4 AND 200
    AND duration_seconds >= 0
    AND page_views >= 0
  );

CREATE POLICY "Visitors can update valid session rows"
  ON public.visitor_sessions FOR UPDATE
  TO public
  USING (session_key IS NOT NULL AND char_length(session_key) BETWEEN 4 AND 200)
  WITH CHECK (
    session_key IS NOT NULL
    AND char_length(session_key) BETWEEN 4 AND 200
    AND duration_seconds >= 0
    AND page_views >= 0
  );

DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.site_reviews;

CREATE POLICY "Visitors can submit valid reviews"
  ON public.site_reviews FOR INSERT
  TO public
  WITH CHECK (
    session_key IS NOT NULL
    AND char_length(session_key) BETWEEN 4 AND 200
    AND rating BETWEEN 1 AND 5
    AND message IS NOT NULL
    AND char_length(message) BETWEEN 10 AND 2000
  );

DROP POLICY IF EXISTS "Anyone can mark fulfilled" ON public.review_requests;

CREATE POLICY "Visitors can complete valid review requests"
  ON public.review_requests FOR UPDATE
  TO public
  USING (session_key IS NOT NULL AND char_length(session_key) BETWEEN 4 AND 200)
  WITH CHECK (
    session_key IS NOT NULL
    AND char_length(session_key) BETWEEN 4 AND 200
    AND fulfilled = true
  );