CREATE POLICY "Anyone can read event posters"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-posters');

CREATE POLICY "Service role can manage event posters"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'event-posters')
WITH CHECK (bucket_id = 'event-posters');

CREATE POLICY "Anyone can upload event posters"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-posters');