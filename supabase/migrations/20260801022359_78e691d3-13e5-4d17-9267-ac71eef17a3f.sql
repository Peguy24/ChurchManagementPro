-- Force pending on insert at the policy level as well as the trigger
DROP POLICY IF EXISTS "Users can submit their own review" ON public.client_reviews;
CREATE POLICY "Users can submit their own review"
ON public.client_reviews
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending'::review_status);

-- Harden the update trigger: non-super-admin owners can never change moderation state
CREATE OR REPLACE FUNCTION public.client_reviews_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();

  IF NOT public.is_super_admin(auth.uid()) THEN
    -- Owners may only edit content; moderation fields stay under admin control
    NEW.status := OLD.status;
    NEW.moderated_by := OLD.moderated_by;
    NEW.moderated_at := OLD.moderated_at;
    NEW.moderation_notes := OLD.moderation_notes;
    NEW.user_id := OLD.user_id;

    IF NEW.text IS DISTINCT FROM OLD.text OR NEW.rating IS DISTINCT FROM OLD.rating THEN
      NEW.status := 'pending';
      NEW.moderated_by := NULL;
      NEW.moderated_at := NULL;
      NEW.moderation_notes := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;