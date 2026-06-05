
CREATE POLICY "contratos read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contratos');
CREATE POLICY "contratos write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contratos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE POLICY "contratos update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contratos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
CREATE POLICY "contratos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contratos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')));
