-- 1. Drop existing policies that need to be updated for tenant isolation

-- Members policies
DROP POLICY IF EXISTS "Staff can view members" ON public.members;
DROP POLICY IF EXISTS "Staff can insert members" ON public.members;
DROP POLICY IF EXISTS "Staff can update members" ON public.members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.members;

-- Donations policies
DROP POLICY IF EXISTS "Financial staff can view donations" ON public.donations;
DROP POLICY IF EXISTS "Financial staff can insert donations" ON public.donations;
DROP POLICY IF EXISTS "Financial staff can update donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can delete donations" ON public.donations;

-- Events policies
DROP POLICY IF EXISTS "Staff can view events" ON public.events;
DROP POLICY IF EXISTS "Staff can insert events" ON public.events;
DROP POLICY IF EXISTS "Staff can update events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;

-- Ministries policies
DROP POLICY IF EXISTS "Authenticated users can view ministries" ON public.ministries;
DROP POLICY IF EXISTS "Leadership can insert ministries" ON public.ministries;
DROP POLICY IF EXISTS "Leadership can update ministries" ON public.ministries;
DROP POLICY IF EXISTS "Admins can delete ministries" ON public.ministries;

-- Attendance policies
DROP POLICY IF EXISTS "Authenticated users can view attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can mark attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can update attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can delete attendance" ON public.attendance_records;

-- Expenses policies
DROP POLICY IF EXISTS "Financial staff can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Treasurers and admins can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Treasurers and admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

-- Inventory policies
DROP POLICY IF EXISTS "Staff can view inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Admins and secretaries can insert inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Admins and secretaries can update inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Admins can delete inventory items" ON public.inventory_items;

-- Bank accounts policies
DROP POLICY IF EXISTS "Financial staff can view bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Treasurers and admins can manage bank accounts" ON public.bank_accounts;

-- Cash registers policies
DROP POLICY IF EXISTS "Financial staff can view cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Treasurers and admins can manage cash registers" ON public.cash_registers;

-- Employees policies
DROP POLICY IF EXISTS "Financial staff can view employees" ON public.employees;
DROP POLICY IF EXISTS "Admins and treasurers can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admins and treasurers can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;

-- Branches policies
DROP POLICY IF EXISTS "Staff can view branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can insert branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can update branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can delete branches" ON public.branches;

-- 2. Create new tenant-isolated policies

-- MEMBERS: Tenant-isolated policies
CREATE POLICY "Tenant users can view members"
ON public.members FOR SELECT
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant staff can insert members"
ON public.members FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor') OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant staff can update members"
ON public.members FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor') OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can delete members"
ON public.members FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);

-- DONATIONS: Tenant-isolated policies
CREATE POLICY "Tenant financial staff can view donations"
ON public.donations FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor') OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant financial staff can insert donations"
ON public.donations FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer') OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant financial staff can update donations"
ON public.donations FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can delete donations"
ON public.donations FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);

-- EVENTS: Tenant-isolated policies
CREATE POLICY "Tenant staff can view events"
ON public.events FOR SELECT
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant staff can insert events"
ON public.events FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor') OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant staff can update events"
ON public.events FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor') OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can delete events"
ON public.events FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);

-- MINISTRIES: Tenant-isolated policies
CREATE POLICY "Tenant users can view ministries"
ON public.ministries FOR SELECT
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant leadership can insert ministries"
ON public.ministries FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant leadership can update ministries"
ON public.ministries FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can delete ministries"
ON public.ministries FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);

-- ATTENDANCE: Tenant-isolated policies
CREATE POLICY "Tenant users can view attendance"
ON public.attendance_records FOR SELECT
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant staff can mark attendance"
ON public.attendance_records FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor') OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary') OR
    has_tenant_role(auth.uid(), tenant_id, 'volunteer')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant staff can update attendance"
ON public.attendance_records FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor') OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can delete attendance"
ON public.attendance_records FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);

-- EXPENSES: Tenant-isolated policies
CREATE POLICY "Tenant financial staff can view expenses"
ON public.expenses FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor')
  ))
  OR has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
);

CREATE POLICY "Tenant treasurers can insert expenses"
ON public.expenses FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant treasurers can update expenses"
ON public.expenses FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can delete expenses"
ON public.expenses FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);

-- INVENTORY: Tenant-isolated policies
CREATE POLICY "Tenant staff can view inventory"
ON public.inventory_items FOR SELECT
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant staff can insert inventory"
ON public.inventory_items FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant staff can update inventory"
ON public.inventory_items FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can delete inventory"
ON public.inventory_items FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);

-- BANK ACCOUNTS: Tenant-isolated policies
CREATE POLICY "Tenant financial staff can view bank accounts"
ON public.bank_accounts FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant treasurers can manage bank accounts"
ON public.bank_accounts FOR ALL
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer')
  ))
  OR has_role(auth.uid(), 'admin')
);

-- CASH REGISTERS: Tenant-isolated policies
CREATE POLICY "Tenant financial staff can view cash registers"
ON public.cash_registers FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant treasurers can manage cash registers"
ON public.cash_registers FOR ALL
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer')
  ))
  OR has_role(auth.uid(), 'admin')
);

-- EMPLOYEES: Tenant-isolated policies
CREATE POLICY "Tenant financial staff can view employees"
ON public.employees FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer') OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can insert employees"
ON public.employees FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can update employees"
ON public.employees FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin') OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer')
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can delete employees"
ON public.employees FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);

-- BRANCHES: Tenant-isolated policies
CREATE POLICY "Tenant users can view branches"
ON public.branches FOR SELECT
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can insert branches"
ON public.branches FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can update branches"
ON public.branches FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Tenant admins can delete branches"
ON public.branches FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'))
  OR has_role(auth.uid(), 'admin')
);