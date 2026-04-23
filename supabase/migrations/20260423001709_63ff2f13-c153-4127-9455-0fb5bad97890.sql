
-- ============================================================
-- Server-side validation constraints
-- Length and positivity rules are immutable -> safe as CHECK.
-- Future-date rules use a trigger because CHECK must be IMMUTABLE.
-- NOT VALID skips existing rows; future writes are enforced.
-- ============================================================

-- ---------- MEMBERS ----------
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_first_name_length_chk,
  DROP CONSTRAINT IF EXISTS members_last_name_length_chk,
  DROP CONSTRAINT IF EXISTS members_email_length_chk,
  DROP CONSTRAINT IF EXISTS members_phone_length_chk,
  DROP CONSTRAINT IF EXISTS members_emergency_phone_length_chk;

ALTER TABLE public.members
  ADD CONSTRAINT members_first_name_length_chk
    CHECK (first_name IS NULL OR char_length(first_name) <= 100) NOT VALID,
  ADD CONSTRAINT members_last_name_length_chk
    CHECK (last_name IS NULL OR char_length(last_name) <= 100) NOT VALID,
  ADD CONSTRAINT members_email_length_chk
    CHECK (email IS NULL OR char_length(email) <= 255) NOT VALID,
  ADD CONSTRAINT members_phone_length_chk
    CHECK (phone IS NULL OR char_length(phone) <= 20) NOT VALID,
  ADD CONSTRAINT members_emergency_phone_length_chk
    CHECK (emergency_phone IS NULL OR char_length(emergency_phone) <= 20) NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_member_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth > CURRENT_DATE THEN
    RAISE EXCEPTION 'date_of_birth cannot be in the future' USING ERRCODE = '22007';
  END IF;
  IF NEW.join_date IS NOT NULL AND NEW.join_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'join_date cannot be in the future' USING ERRCODE = '22007';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_member_dates ON public.members;
CREATE TRIGGER trg_validate_member_dates
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.validate_member_dates();

-- ---------- VISITORS ----------
ALTER TABLE public.visitors
  DROP CONSTRAINT IF EXISTS visitors_first_name_length_chk,
  DROP CONSTRAINT IF EXISTS visitors_last_name_length_chk,
  DROP CONSTRAINT IF EXISTS visitors_email_length_chk,
  DROP CONSTRAINT IF EXISTS visitors_phone_length_chk;

ALTER TABLE public.visitors
  ADD CONSTRAINT visitors_first_name_length_chk
    CHECK (first_name IS NULL OR char_length(first_name) <= 100) NOT VALID,
  ADD CONSTRAINT visitors_last_name_length_chk
    CHECK (last_name IS NULL OR char_length(last_name) <= 100) NOT VALID,
  ADD CONSTRAINT visitors_email_length_chk
    CHECK (email IS NULL OR char_length(email) <= 255) NOT VALID,
  ADD CONSTRAINT visitors_phone_length_chk
    CHECK (phone IS NULL OR char_length(phone) <= 20) NOT VALID;

-- ---------- EVENT REGISTRATIONS ----------
ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_reg_first_name_length_chk,
  DROP CONSTRAINT IF EXISTS event_reg_last_name_length_chk,
  DROP CONSTRAINT IF EXISTS event_reg_email_length_chk,
  DROP CONSTRAINT IF EXISTS event_reg_phone_length_chk;

ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_reg_first_name_length_chk
    CHECK (first_name IS NULL OR char_length(first_name) <= 100) NOT VALID,
  ADD CONSTRAINT event_reg_last_name_length_chk
    CHECK (last_name IS NULL OR char_length(last_name) <= 100) NOT VALID,
  ADD CONSTRAINT event_reg_email_length_chk
    CHECK (email IS NULL OR char_length(email) <= 255) NOT VALID,
  ADD CONSTRAINT event_reg_phone_length_chk
    CHECK (phone IS NULL OR char_length(phone) <= 20) NOT VALID;

-- ---------- BRANCHES ----------
ALTER TABLE public.branches
  DROP CONSTRAINT IF EXISTS branches_name_length_chk,
  DROP CONSTRAINT IF EXISTS branches_email_length_chk,
  DROP CONSTRAINT IF EXISTS branches_phone_length_chk;

ALTER TABLE public.branches
  ADD CONSTRAINT branches_name_length_chk
    CHECK (name IS NULL OR char_length(name) <= 100) NOT VALID,
  ADD CONSTRAINT branches_email_length_chk
    CHECK (email IS NULL OR char_length(email) <= 255) NOT VALID,
  ADD CONSTRAINT branches_phone_length_chk
    CHECK (phone IS NULL OR char_length(phone) <= 20) NOT VALID;

-- ---------- MINISTRIES ----------
ALTER TABLE public.ministries
  DROP CONSTRAINT IF EXISTS ministries_name_length_chk,
  DROP CONSTRAINT IF EXISTS ministries_description_length_chk;

ALTER TABLE public.ministries
  ADD CONSTRAINT ministries_name_length_chk
    CHECK (name IS NULL OR char_length(name) <= 100) NOT VALID,
  ADD CONSTRAINT ministries_description_length_chk
    CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID;

-- ---------- DONATIONS ----------
ALTER TABLE public.donations
  DROP CONSTRAINT IF EXISTS donations_amount_positive_chk,
  DROP CONSTRAINT IF EXISTS donations_amount_max_chk,
  DROP CONSTRAINT IF EXISTS donations_description_length_chk,
  DROP CONSTRAINT IF EXISTS donations_notes_length_chk;

ALTER TABLE public.donations
  ADD CONSTRAINT donations_amount_positive_chk
    CHECK (amount > 0) NOT VALID,
  ADD CONSTRAINT donations_amount_max_chk
    CHECK (amount <= 9999999999) NOT VALID,
  ADD CONSTRAINT donations_description_length_chk
    CHECK (description IS NULL OR char_length(description) <= 255) NOT VALID,
  ADD CONSTRAINT donations_notes_length_chk
    CHECK (notes IS NULL OR char_length(notes) <= 2000) NOT VALID;

-- ---------- EXPENSES ----------
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_amount_positive_chk,
  DROP CONSTRAINT IF EXISTS expenses_amount_max_chk,
  DROP CONSTRAINT IF EXISTS expenses_description_length_chk,
  DROP CONSTRAINT IF EXISTS expenses_notes_length_chk,
  DROP CONSTRAINT IF EXISTS expenses_vendor_length_chk;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_amount_positive_chk
    CHECK (amount > 0) NOT VALID,
  ADD CONSTRAINT expenses_amount_max_chk
    CHECK (amount <= 9999999999) NOT VALID,
  ADD CONSTRAINT expenses_description_length_chk
    CHECK (description IS NULL OR char_length(description) <= 255) NOT VALID,
  ADD CONSTRAINT expenses_notes_length_chk
    CHECK (notes IS NULL OR char_length(notes) <= 2000) NOT VALID,
  ADD CONSTRAINT expenses_vendor_length_chk
    CHECK (vendor IS NULL OR char_length(vendor) <= 255) NOT VALID;

-- ---------- BUDGETS ----------
ALTER TABLE public.budgets
  DROP CONSTRAINT IF EXISTS budgets_amount_positive_chk,
  DROP CONSTRAINT IF EXISTS budgets_name_length_chk;

ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_amount_positive_chk
    CHECK (planned_amount > 0) NOT VALID,
  ADD CONSTRAINT budgets_name_length_chk
    CHECK (name IS NULL OR char_length(name) <= 255) NOT VALID;

-- ---------- EMPLOYEES ----------
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_salary_positive_chk,
  DROP CONSTRAINT IF EXISTS employees_first_name_length_chk,
  DROP CONSTRAINT IF EXISTS employees_last_name_length_chk,
  DROP CONSTRAINT IF EXISTS employees_email_length_chk,
  DROP CONSTRAINT IF EXISTS employees_phone_length_chk;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_salary_positive_chk
    CHECK (salary_amount > 0) NOT VALID,
  ADD CONSTRAINT employees_first_name_length_chk
    CHECK (first_name IS NULL OR char_length(first_name) <= 100) NOT VALID,
  ADD CONSTRAINT employees_last_name_length_chk
    CHECK (last_name IS NULL OR char_length(last_name) <= 100) NOT VALID,
  ADD CONSTRAINT employees_email_length_chk
    CHECK (email IS NULL OR char_length(email) <= 255) NOT VALID,
  ADD CONSTRAINT employees_phone_length_chk
    CHECK (phone IS NULL OR char_length(phone) <= 20) NOT VALID;

-- ---------- CREDIT OPERATIONS ----------
ALTER TABLE public.credit_operations
  DROP CONSTRAINT IF EXISTS credit_ops_total_positive_chk,
  DROP CONSTRAINT IF EXISTS credit_ops_amount_paid_nonneg_chk,
  DROP CONSTRAINT IF EXISTS credit_ops_interest_nonneg_chk;

ALTER TABLE public.credit_operations
  ADD CONSTRAINT credit_ops_total_positive_chk
    CHECK (total_amount > 0) NOT VALID,
  ADD CONSTRAINT credit_ops_amount_paid_nonneg_chk
    CHECK (amount_paid >= 0) NOT VALID,
  ADD CONSTRAINT credit_ops_interest_nonneg_chk
    CHECK (interest_rate >= 0) NOT VALID;

-- ---------- CREDIT PAYMENTS ----------
ALTER TABLE public.credit_payments
  DROP CONSTRAINT IF EXISTS credit_payments_amount_positive_chk;

ALTER TABLE public.credit_payments
  ADD CONSTRAINT credit_payments_amount_positive_chk
    CHECK (amount > 0) NOT VALID;

-- ---------- CUSTOM FIELD VALUES ----------
ALTER TABLE public.custom_field_values
  DROP CONSTRAINT IF EXISTS custom_field_values_length_chk;

ALTER TABLE public.custom_field_values
  ADD CONSTRAINT custom_field_values_length_chk
    CHECK (field_value IS NULL OR char_length(field_value) <= 2000) NOT VALID;

-- ---------- EVENTS ----------
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_name_length_chk,
  DROP CONSTRAINT IF EXISTS events_description_length_chk,
  DROP CONSTRAINT IF EXISTS events_location_length_chk;

ALTER TABLE public.events
  ADD CONSTRAINT events_name_length_chk
    CHECK (name IS NULL OR char_length(name) <= 200) NOT VALID,
  ADD CONSTRAINT events_description_length_chk
    CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID,
  ADD CONSTRAINT events_location_length_chk
    CHECK (location IS NULL OR char_length(location) <= 255) NOT VALID;

-- ---------- FUND TRANSACTIONS ----------
ALTER TABLE public.fund_transactions
  DROP CONSTRAINT IF EXISTS fund_tx_amount_positive_chk;

ALTER TABLE public.fund_transactions
  ADD CONSTRAINT fund_tx_amount_positive_chk
    CHECK (amount > 0) NOT VALID;

-- ---------- BANK TRANSACTIONS ----------
ALTER TABLE public.bank_transactions
  DROP CONSTRAINT IF EXISTS bank_tx_amount_positive_chk;

ALTER TABLE public.bank_transactions
  ADD CONSTRAINT bank_tx_amount_positive_chk
    CHECK (amount > 0) NOT VALID;

-- ---------- CASH TRANSACTIONS ----------
ALTER TABLE public.cash_transactions
  DROP CONSTRAINT IF EXISTS cash_tx_amount_positive_chk;

ALTER TABLE public.cash_transactions
  ADD CONSTRAINT cash_tx_amount_positive_chk
    CHECK (amount > 0) NOT VALID;
