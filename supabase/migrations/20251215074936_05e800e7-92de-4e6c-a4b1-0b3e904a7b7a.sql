-- =====================================================
-- SECURITY FIX: Comprehensive RLS and Function Updates
-- =====================================================

-- =====================================================
-- PART 1: Fix SECURITY DEFINER functions with NULL validation
-- =====================================================

-- Update has_role function with NULL checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    WHEN _role IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END;
$$;

-- Update get_user_branch_id function with NULL validation
CREATE OR REPLACE FUNCTION public.get_user_branch_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN user_uuid IS NULL THEN NULL
    ELSE (SELECT branch_id FROM members WHERE user_id = user_uuid LIMIT 1)
  END;
$$;

-- Update log_financial_audit function with NULL checks
CREATE OR REPLACE FUNCTION public.log_financial_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email_val text;
  current_user_id uuid;
BEGIN
  -- Get the current user ID safely
  current_user_id := auth.uid();
  
  -- Only proceed if we have a valid user
  IF current_user_id IS NOT NULL THEN
    SELECT email INTO user_email_val FROM auth.users WHERE id = current_user_id;
  ELSE
    user_email_val := NULL;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_audit_logs (entity_type, entity_id, action, new_values, user_id, user_email)
    VALUES (TG_TABLE_NAME, NEW.id, 'create', to_jsonb(NEW), current_user_id, user_email_val);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.financial_audit_logs (entity_type, entity_id, action, old_values, new_values, user_id, user_email)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), current_user_id, user_email_val);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.financial_audit_logs (entity_type, entity_id, action, old_values, user_id, user_email)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), current_user_id, user_email_val);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Update generate_member_number function with error handling
CREATE OR REPLACE FUNCTION public.generate_member_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  -- Safely get the next sequential number with error handling
  BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(member_number FROM 4) AS INTEGER)), 0) + 1 
    INTO next_num 
    FROM public.members 
    WHERE member_number IS NOT NULL 
      AND member_number LIKE 'MBR%'
      AND SUBSTRING(member_number FROM 4) ~ '^\d+$';
  EXCEPTION WHEN OTHERS THEN
    next_num := 1;
  END;
  
  -- Ensure we have a valid number
  IF next_num IS NULL OR next_num < 1 THEN
    next_num := 1;
  END IF;
  
  -- Format as MBR followed by 5 digits (e.g., MBR00001)
  NEW.member_number := 'MBR' || LPAD(next_num::text, 5, '0');
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- PART 2: Fix Financial Data Exposure (SELECT policies)
-- =====================================================

-- DONATIONS: Restrict to financial staff and own donations
DROP POLICY IF EXISTS "Authenticated users can view donations" ON donations;
CREATE POLICY "Financial staff can view donations"
ON donations FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
);

-- EXPENSES: Restrict to financial staff
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON expenses;
CREATE POLICY "Financial staff can view expenses"
ON expenses FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  created_by = auth.uid()
);

-- BANK_TRANSACTIONS: Restrict to financial staff
DROP POLICY IF EXISTS "Authenticated users can view bank transactions" ON bank_transactions;
CREATE POLICY "Financial staff can view bank transactions"
ON bank_transactions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

-- CASH_TRANSACTIONS: Restrict to financial staff
DROP POLICY IF EXISTS "Authenticated users can view cash transactions" ON cash_transactions;
CREATE POLICY "Financial staff can view cash transactions"
ON cash_transactions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

-- BUDGETS: Restrict to financial staff
DROP POLICY IF EXISTS "Authenticated users can view budgets" ON budgets;
CREATE POLICY "Financial staff can view budgets"
ON budgets FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

-- =====================================================
-- PART 3: Fix Write Access Policies
-- =====================================================

-- MEMBERS: Restrict write to staff
DROP POLICY IF EXISTS "Authenticated users can insert members" ON members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON members;

CREATE POLICY "Staff can insert members"
ON members FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

CREATE POLICY "Staff and self can update members"
ON members FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  user_id = auth.uid()
);

-- DONATIONS: Restrict write to financial staff
DROP POLICY IF EXISTS "Authenticated users can insert donations" ON donations;
DROP POLICY IF EXISTS "Authenticated users can update donations" ON donations;

CREATE POLICY "Financial staff can insert donations"
ON donations FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "Financial staff can update donations"
ON donations FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role)
);

-- ATTENDANCE_RECORDS: Restrict write to staff and volunteers
DROP POLICY IF EXISTS "Authenticated users can mark attendance" ON attendance_records;
DROP POLICY IF EXISTS "Authenticated users can update attendance" ON attendance_records;

CREATE POLICY "Staff can mark attendance"
ON attendance_records FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'volunteer'::app_role)
);

CREATE POLICY "Staff can update attendance"
ON attendance_records FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

-- MINISTRIES: Restrict write to leadership
DROP POLICY IF EXISTS "Authenticated users can insert ministries" ON ministries;
DROP POLICY IF EXISTS "Authenticated users can update ministries" ON ministries;

CREATE POLICY "Leadership can insert ministries"
ON ministries FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

CREATE POLICY "Leadership can update ministries"
ON ministries FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role)
);

-- BRANCHES: Restrict write to admins only
DROP POLICY IF EXISTS "Authenticated users can insert branches" ON branches;
DROP POLICY IF EXISTS "Authenticated users can update branches" ON branches;

CREATE POLICY "Admins can insert branches"
ON branches FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update branches"
ON branches FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));