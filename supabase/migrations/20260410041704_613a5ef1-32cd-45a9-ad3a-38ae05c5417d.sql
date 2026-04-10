
-- =============================================
-- 1. MEMBER ENGAGEMENT SCORES: Restrict SELECT to admin/pastor
-- =============================================

-- Drop existing broad tenant policy
DROP POLICY IF EXISTS "Tenant users can view engagement scores" ON public.member_engagement_scores;
DROP POLICY IF EXISTS "Users can view engagement scores for their tenant" ON public.member_engagement_scores;

-- Create restricted policy for leadership only
CREATE POLICY "Leadership can view engagement scores"
ON public.member_engagement_scores
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    is_tenant_admin(auth.uid())
    OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )
);

-- =============================================
-- 2. ADMIN INVITATIONS: Add scoped INSERT for tenant admins
-- =============================================

-- Add INSERT policy for tenant admins restricted to their own tenant
CREATE POLICY "Tenant admins can create invitations for their tenant"
ON public.admin_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND is_tenant_admin(auth.uid())
);

-- =============================================
-- 3. TENANT USER ROLES: Restrict self-insert to 'user' role only
-- =============================================

-- Drop the current policy that allows any role value
DROP POLICY IF EXISTS "Users can insert own tenant role during signup" ON public.tenant_user_roles;

-- Recreate with role restricted to 'user' only
CREATE POLICY "Users can insert own tenant role during signup"
ON public.tenant_user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id = get_user_tenant_id(auth.uid())
  AND is_approved = false
  AND role = 'user'
);
