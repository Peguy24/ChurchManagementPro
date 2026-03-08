
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Staff can insert ministry members" ON public.ministry_members;

-- Create updated INSERT policy that checks both global and tenant roles
CREATE POLICY "Staff can insert ministry members" ON public.ministry_members
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tenant_user_roles tur
    WHERE tur.user_id = auth.uid()
      AND tur.role IN ('admin', 'pastor', 'secretary')
      AND tur.is_approved = true
  )
);

-- Also fix UPDATE and DELETE policies
DROP POLICY IF EXISTS "Staff can update ministry members" ON public.ministry_members;
CREATE POLICY "Staff can update ministry members" ON public.ministry_members
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tenant_user_roles tur
    WHERE tur.user_id = auth.uid()
      AND tur.role IN ('admin', 'pastor', 'secretary')
      AND tur.is_approved = true
  )
);

DROP POLICY IF EXISTS "Leadership can delete ministry members" ON public.ministry_members;
CREATE POLICY "Leadership can delete ministry members" ON public.ministry_members
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tenant_user_roles tur
    WHERE tur.user_id = auth.uid()
      AND tur.role IN ('admin', 'pastor')
      AND tur.is_approved = true
  )
);
