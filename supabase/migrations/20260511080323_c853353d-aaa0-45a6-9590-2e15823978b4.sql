
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE public.client_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL,
  reviewer_role text,
  church_name text NOT NULL,
  city text,
  country text,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text NOT NULL CHECK (char_length(text) BETWEEN 10 AND 500),
  language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','en','ht')),
  consent_public_display boolean NOT NULL DEFAULT false,
  status public.review_status NOT NULL DEFAULT 'pending',
  moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  moderation_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One non-rejected review per user
CREATE UNIQUE INDEX client_reviews_one_active_per_user
  ON public.client_reviews(user_id)
  WHERE status <> 'rejected';

CREATE INDEX client_reviews_status_idx ON public.client_reviews(status);
CREATE INDEX client_reviews_status_created_idx ON public.client_reviews(status, created_at DESC);

-- Force pending on insert + require consent
CREATE OR REPLACE FUNCTION public.client_reviews_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.status := 'pending';
  NEW.moderated_by := NULL;
  NEW.moderated_at := NULL;
  NEW.moderation_notes := NULL;
  IF COALESCE(NEW.consent_public_display, false) = false THEN
    RAISE EXCEPTION 'consent_public_display must be true' USING ERRCODE = '23514';
  END IF;
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_client_reviews_before_insert
  BEFORE INSERT ON public.client_reviews
  FOR EACH ROW EXECUTE FUNCTION public.client_reviews_before_insert();

-- On update: if owner edits text/rating, re-pending; track updated_at
CREATE OR REPLACE FUNCTION public.client_reviews_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  -- If the owner (not a super admin) changes content, push back to pending
  IF auth.uid() = OLD.user_id AND NOT public.is_super_admin(auth.uid()) THEN
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

CREATE TRIGGER trg_client_reviews_before_update
  BEFORE UPDATE ON public.client_reviews
  FOR EACH ROW EXECUTE FUNCTION public.client_reviews_before_update();

-- Notify super admins on new review
CREATE OR REPLACE FUNCTION public.notify_new_client_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_notifications (notification_type, severity, title, message, metadata)
  VALUES (
    'client_review',
    'info',
    'new_client_review',
    'review:' || NEW.reviewer_name || ' (' || NEW.rating || '/5)',
    jsonb_build_object(
      'review_id', NEW.id,
      'reviewer_name', NEW.reviewer_name,
      'church_name', NEW.church_name,
      'rating', NEW.rating,
      'language', NEW.language
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_client_reviews_notify
  AFTER INSERT ON public.client_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_client_review();

-- Enable RLS
ALTER TABLE public.client_reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved
CREATE POLICY "Public can view approved reviews"
  ON public.client_reviews FOR SELECT
  USING (status = 'approved');

-- Owner can read own
CREATE POLICY "Users can view their own review"
  ON public.client_reviews FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Super admins can view all
CREATE POLICY "Super admins can view all reviews"
  ON public.client_reviews FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Authenticated insert (own)
CREATE POLICY "Users can submit their own review"
  ON public.client_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Owner update if not rejected
CREATE POLICY "Users can update their own review"
  ON public.client_reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status <> 'rejected')
  WITH CHECK (user_id = auth.uid());

-- Super admin full update
CREATE POLICY "Super admins can update reviews"
  ON public.client_reviews FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Super admin delete
CREATE POLICY "Super admins can delete reviews"
  ON public.client_reviews FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- updated_at trigger reuse not needed (handled in before_update)

-- Notification preferences extension
ALTER TABLE public.super_admin_notification_prefs
  ADD COLUMN IF NOT EXISTS client_review_channel text NOT NULL DEFAULT 'both'
  CHECK (client_review_channel IN ('toast','email','both','none'));

-- Email recipients helper
CREATE OR REPLACE FUNCTION public.get_client_review_email_recipients()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH supers AS (
    SELECT user_id FROM public.platform_user_roles WHERE role = 'super_admin'
    UNION
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
  SELECT s.user_id, u.email::text
  FROM supers s
  JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN public.super_admin_notification_prefs p ON p.user_id = s.user_id
  WHERE u.email IS NOT NULL
    AND COALESCE(p.client_review_channel, 'both') IN ('email','both');
$$;

-- Realtime
ALTER TABLE public.client_reviews REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_reviews;
