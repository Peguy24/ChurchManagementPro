
-- =============================================
-- 1. INVENTORY PHOTOS: Add tenant folder scoping to INSERT/UPDATE/DELETE
-- =============================================

-- Fix INSERT policy
DROP POLICY IF EXISTS "Staff can upload inventory photos" ON storage.objects;
CREATE POLICY "Staff can upload inventory photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inventory-photos'
  AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles
      WHERE user_id = auth.uid()
        AND role = ANY(ARRAY['admin'::app_role, 'secretary'::app_role, 'pastor'::app_role])
        AND is_approved = true
    )
  )
);

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Staff can update inventory photos" ON storage.objects;
CREATE POLICY "Staff can update inventory photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inventory-photos'
  AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles
      WHERE user_id = auth.uid()
        AND role = ANY(ARRAY['admin'::app_role, 'secretary'::app_role, 'pastor'::app_role])
        AND is_approved = true
    )
  )
);

-- Fix DELETE policy
DROP POLICY IF EXISTS "Admins can delete inventory photos" ON storage.objects;
CREATE POLICY "Admins can delete inventory photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inventory-photos'
  AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles
      WHERE user_id = auth.uid()
        AND role = ANY(ARRAY['admin'::app_role, 'pastor'::app_role])
        AND is_approved = true
    )
  )
);

-- =============================================
-- 2. EVENT REGISTRATIONS: Validate event belongs to tenant
-- =============================================

-- Create a helper function to validate event-tenant relationship
CREATE OR REPLACE FUNCTION public.event_belongs_to_tenant(_event_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = _event_id
      AND tenant_id = _tenant_id
  );
$$;

-- Drop existing permissive INSERT policies on event_registrations
DROP POLICY IF EXISTS "Anyone can register for public events" ON public.event_registrations;
DROP POLICY IF EXISTS "Public can register for events" ON public.event_registrations;
DROP POLICY IF EXISTS "Anyone can insert event registrations" ON public.event_registrations;

-- Recreate with event-tenant validation
CREATE POLICY "Public can register for events"
ON public.event_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_belongs_to_tenant(event_id, tenant_id)
  AND status = 'registered'
);
