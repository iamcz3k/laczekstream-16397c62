DROP POLICY IF EXISTS "Anyone can post match chat" ON public.match_chats;

CREATE POLICY "Visitors can post valid match chat"
  ON public.match_chats FOR INSERT
  TO public
  WITH CHECK (
    match_id IS NOT NULL
    AND char_length(match_id) BETWEEN 1 AND 200
    AND name IS NOT NULL
    AND char_length(name) BETWEEN 1 AND 80
    AND message IS NOT NULL
    AND char_length(message) BETWEEN 1 AND 500
  );