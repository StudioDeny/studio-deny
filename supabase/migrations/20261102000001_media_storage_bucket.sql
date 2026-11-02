-- Site media moves from Cloudinary to Supabase Storage.
--
-- One public bucket, `media`, holds every image and video the admin uploads
-- (products, hero slides, popups, preloader, lookbook, influencer reels).
-- Public: the storefront reads files through /storage/v1/object/public/… and
-- resized copies through /storage/v1/render/image/public/… (Pro plan), with
-- no auth. Writes are limited to the people who can already manage products
-- or the media library.
--
-- file_size_limit is left NULL so the project-wide upload limit (Storage →
-- Settings) applies; raise that there for large videos.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, NULL, ARRAY['image/*', 'video/*'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "media: staff read" ON storage.objects;
CREATE POLICY "media: staff read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (public.is_admin_or_staff() OR public.has_permission('PRODUCTS')));

DROP POLICY IF EXISTS "media: staff upload" ON storage.objects;
CREATE POLICY "media: staff upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (public.is_admin_or_staff() OR public.has_permission('PRODUCTS')));

DROP POLICY IF EXISTS "media: staff update" ON storage.objects;
CREATE POLICY "media: staff update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND (public.is_admin_or_staff() OR public.has_permission('PRODUCTS')))
  WITH CHECK (bucket_id = 'media' AND (public.is_admin_or_staff() OR public.has_permission('PRODUCTS')));

DROP POLICY IF EXISTS "media: staff delete" ON storage.objects;
CREATE POLICY "media: staff delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (public.is_admin_or_staff() OR public.has_permission('PRODUCTS')));
