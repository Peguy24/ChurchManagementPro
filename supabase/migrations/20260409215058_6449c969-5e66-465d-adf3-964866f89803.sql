-- Fix 1: Replace broad tenants SELECT policies with slug-filtered access
DROP POLICY IF EXISTS "Anyone can view tenant info for registration" ON public.tenants;
DROP POLICY IF EXISTS "Anyone can view tenants by slug" ON public.tenants;

-- Allow anon/public to look up a tenant by slug (needed for /t/:slug/auth registration pages)
-- This still allows slug-based lookup but prevents full table enumeration
-- since the client must specify .eq('slug', ...) to get results
-- We use a restrictive RLS that checks slug is not null (always true for valid rows)
-- The real protection is that without knowing a slug, enumeration returns nothing useful
-- For true restriction we use a security definer function instead:

-- Create a secure function for public tenant lookup by slug
CREATE OR REPLACE FUNCTION public.get_tenant_by_slug(_slug text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, primary_color text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT t.id, t.name, t.slug, t.logo_url, t.primary_color
  FROM public.tenants t
  WHERE t.slug = _slug
  LIMIT 1;
$$;

-- Create a secure function for public tenant lookup by ID (for event registration pages)
CREATE OR REPLACE FUNCTION public.get_tenant_public_info(_tenant_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT t.id, t.name, t.logo_url
  FROM public.tenants t
  WHERE t.id = _tenant_id
  LIMIT 1;
$$;

-- Authenticated users who belong to a tenant can view their own tenant (already exists)
-- Super admins can view all tenants (already exists)
-- No more broad public access

-- Fix 2: Scope storage SELECT policies to user's tenant folder
DROP POLICY IF EXISTS "Authenticated users can view member photos" ON storage.objects;
CREATE POLICY "Tenant users can view member photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'member-photos'
    AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
  );

DROP POLICY IF EXISTS "Authenticated users can view inventory photos" ON storage.objects;
CREATE POLICY "Tenant users can view inventory photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inventory-photos'
    AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
  );