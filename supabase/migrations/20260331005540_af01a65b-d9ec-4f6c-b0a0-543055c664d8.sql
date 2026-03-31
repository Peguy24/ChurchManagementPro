
-- Fix 1: Admin invitations - remove public SELECT (USING: true) that exposes all tokens
-- Token validation is handled by the SECURITY DEFINER function validate_admin_invitation()
-- Direct table access only needed by super admins and tenant admins
DROP POLICY IF EXISTS "Anyone can validate invitation tokens" ON admin_invitations;

-- Tenant admins can view their own tenant invitations
CREATE POLICY "Tenant admins can view own invitations"
  ON admin_invitations FOR SELECT
  TO authenticated
  USING (
    is_tenant_admin(auth.uid()) 
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

-- Super admins can view all invitations (already exists as ALL policy, but add explicit SELECT)
-- The existing "Super admins can manage invitations" ALL policy covers this

-- Fix 2: tenant_policy_acceptances - restrict anonymous INSERT
DROP POLICY IF EXISTS "Anyone can insert acceptances" ON tenant_policy_acceptances;

-- Allow authenticated users to insert their own acceptance records
CREATE POLICY "Authenticated users can insert own acceptance"
  ON tenant_policy_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (
    accepted_by = auth.uid()
    AND tenant_id = get_user_tenant_id(auth.uid())
  );
