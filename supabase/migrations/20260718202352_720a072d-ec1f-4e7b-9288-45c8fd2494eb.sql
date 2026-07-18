
CREATE TABLE public.nps_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  survey_cycle text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, survey_cycle)
);
GRANT SELECT ON public.nps_email_sends TO authenticated;
GRANT ALL ON public.nps_email_sends TO service_role;
ALTER TABLE public.nps_email_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view nps email sends"
  ON public.nps_email_sends FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

ALTER TABLE public.super_admin_notification_prefs
  ADD COLUMN IF NOT EXISTS nps_detractor_channel text NOT NULL DEFAULT 'both';

CREATE OR REPLACE FUNCTION public.get_nps_responses_filtered(
  _plan text DEFAULT NULL,
  _min_members int DEFAULT NULL,
  _max_members int DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  tenant_name text,
  plan text,
  member_count bigint,
  score int,
  category text,
  comment text,
  survey_cycle text,
  submitted_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.id, n.tenant_id, t.name,
         COALESCE(ts.plan::text, 'trial') AS plan,
         COALESCE(mc.cnt, 0) AS member_count,
         n.score, n.category, n.comment, n.survey_cycle, n.submitted_at
  FROM public.nps_surveys n
  LEFT JOIN public.tenants t ON t.id = n.tenant_id
  LEFT JOIN public.tenant_subscriptions ts ON ts.tenant_id = n.tenant_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cnt FROM public.members m WHERE m.tenant_id = n.tenant_id
  ) mc ON true
  WHERE public.is_super_admin(auth.uid())
    AND (_plan IS NULL OR COALESCE(ts.plan::text, 'trial') = _plan)
    AND (_min_members IS NULL OR COALESCE(mc.cnt, 0) >= _min_members)
    AND (_max_members IS NULL OR COALESCE(mc.cnt, 0) <= _max_members)
  ORDER BY n.submitted_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_nps_responses_filtered(text, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_nps_stats()
RETURNS TABLE (score int, total_responses bigint, promoters_pct numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _threshold constant int := 20;
  _total bigint;
  _prom bigint;
  _det bigint;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE n.score >= 9),
    COUNT(*) FILTER (WHERE n.score <= 6)
  INTO _total, _prom, _det
  FROM public.nps_surveys n
  WHERE n.submitted_at >= now() - interval '12 months';

  IF _total < _threshold THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    ROUND(((_prom - _det)::numeric / _total) * 100)::int AS score,
    _total,
    ROUND((_prom::numeric / _total) * 100, 1) AS promoters_pct;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_nps_stats() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_nps_detractor_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_name text;
BEGIN
  IF NEW.score > 6 OR NEW.comment IS NULL OR btrim(NEW.comment) = '' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _tenant_name FROM public.tenants WHERE id = NEW.tenant_id;

  IF NEW.tenant_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.support_tickets (tenant_id, user_id, subject, message, category, priority, status)
      VALUES (
        NEW.tenant_id,
        NEW.user_id,
        'NPS Detractor Feedback' || COALESCE(' - ' || _tenant_name, ''),
        'Score: ' || NEW.score || E'\n\nComment:\n' || NEW.comment,
        'nps_detractor',
        'high',
        'open'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create support ticket for NPS detractor: %', SQLERRM;
    END;
  END IF;

  BEGIN
    INSERT INTO public.platform_notifications (notification_type, severity, title, message, metadata)
    VALUES (
      'nps_detractor',
      'warning',
      'nps_detractor_feedback',
      'tenant:' || COALESCE(_tenant_name, 'unknown') || '|score:' || NEW.score,
      jsonb_build_object(
        'survey_id', NEW.id,
        'tenant_id', NEW.tenant_id,
        'tenant_name', _tenant_name,
        'score', NEW.score,
        'comment', NEW.comment
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to insert platform notification for NPS detractor: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nps_detractor ON public.nps_surveys;
CREATE TRIGGER trg_nps_detractor
  AFTER INSERT ON public.nps_surveys
  FOR EACH ROW EXECUTE FUNCTION public.on_nps_detractor_submitted();

CREATE OR REPLACE FUNCTION public.get_nps_detractor_email_recipients()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql STABLE SECURITY DEFINER
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
    AND COALESCE(p.nps_detractor_channel, 'both') IN ('email', 'both');
$$;
GRANT EXECUTE ON FUNCTION public.get_nps_detractor_email_recipients() TO service_role;
