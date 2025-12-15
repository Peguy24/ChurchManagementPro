-- =====================================================
-- FIX: Additional Security Fixes for Remaining Issues
-- =====================================================

-- 1. Fix bank_accounts SELECT policy - restrict to financial staff
DROP POLICY IF EXISTS "Authenticated users can view bank accounts" ON bank_accounts;

CREATE POLICY "Financial staff can view bank accounts"
ON bank_accounts FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

-- 2. Fix custom_field_values policies - restrict to appropriate roles
DROP POLICY IF EXISTS "Authenticated users can manage custom field values" ON custom_field_values;

-- SELECT: Allow users to see values for entities they can access
CREATE POLICY "Users can view relevant custom field values"
ON custom_field_values FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role)
);

-- INSERT: Restrict to staff roles
CREATE POLICY "Staff can insert custom field values"
ON custom_field_values FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role)
);

-- UPDATE: Restrict to staff roles
CREATE POLICY "Staff can update custom field values"
ON custom_field_values FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role)
);

-- DELETE: Restrict to admin only
CREATE POLICY "Admins can delete custom field values"
ON custom_field_values FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix cash_registers SELECT policy - restrict to financial staff
DROP POLICY IF EXISTS "Authenticated users can view cash registers" ON cash_registers;

CREATE POLICY "Financial staff can view cash registers"
ON cash_registers FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

-- 4. Fix special_funds SELECT policy - restrict to financial staff
DROP POLICY IF EXISTS "Authenticated users can view special funds" ON special_funds;

CREATE POLICY "Financial staff can view special funds"
ON special_funds FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

-- 5. Fix fund_transactions SELECT policy - restrict to financial staff
DROP POLICY IF EXISTS "Authenticated users can view fund transactions" ON fund_transactions;

CREATE POLICY "Financial staff can view fund transactions"
ON fund_transactions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

-- 6. Fix ministry_members to prevent unauthorized modifications
DROP POLICY IF EXISTS "Authenticated users can insert ministry members" ON ministry_members;
DROP POLICY IF EXISTS "Authenticated users can update ministry members" ON ministry_members;
DROP POLICY IF EXISTS "Authenticated users can delete ministry members" ON ministry_members;

CREATE POLICY "Staff can insert ministry members"
ON ministry_members FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "Staff can update ministry members"
ON ministry_members FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "Leadership can delete ministry members"
ON ministry_members FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);