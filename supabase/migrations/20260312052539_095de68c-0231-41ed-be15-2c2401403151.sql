CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tenant_id uuid;
  _tenant_role text;
  _tenant_auto_approved boolean;
BEGIN
  _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  _tenant_role := NEW.raw_user_meta_data->>'tenant_role';
  _tenant_auto_approved := COALESCE((NEW.raw_user_meta_data->>'tenant_auto_approved')::boolean, false);

  INSERT INTO public.profiles (id, first_name, last_name, email, tenant_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    _tenant_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Auto-create tenant role if signup included tenant info
  IF _tenant_id IS NOT NULL AND _tenant_role IS NOT NULL THEN
    BEGIN
      INSERT INTO public.tenant_user_roles (tenant_id, user_id, role, is_approved)
      VALUES (_tenant_id, NEW.id, _tenant_role::app_role, _tenant_auto_approved);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to insert tenant_user_roles for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;