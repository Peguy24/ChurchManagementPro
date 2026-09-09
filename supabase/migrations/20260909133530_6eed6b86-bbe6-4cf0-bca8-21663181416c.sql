-- 1. tenant_media: only intentionally public gallery assets are readable anonymously
DROP POLICY IF EXISTS "public read media for published sites" ON public.tenant_media;
CREATE POLICY "public read published gallery media"
ON public.tenant_media
FOR SELECT
TO anon
USING (
  category = 'gallery'
  AND public_url IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.tenant_websites w
    WHERE w.tenant_id = tenant_media.tenant_id AND w.is_published = true
  )
);

-- 2. profiles: tenant linkage cannot be self-assigned at INSERT time
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND tenant_id IS NULL);

-- 3. email_send_log: explicit deny of anon/authenticated writes; only service_role writes
REVOKE ALL ON public.email_send_log FROM anon, authenticated;
GRANT SELECT ON public.email_send_log TO authenticated;
GRANT ALL ON public.email_send_log TO service_role;

-- 4. document the platform_settings public allowlist constraint
COMMENT ON TABLE public.platform_settings IS
  'Platform configuration. SECURITY: the anon/authenticated SELECT policy allowlists specific non-sensitive setting_key values. Never add a setting_key holding secrets, credentials or private config to that allowlist.';