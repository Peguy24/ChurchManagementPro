
CREATE OR REPLACE FUNCTION public.update_credit_operation_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_payments numeric;
  op_total numeric;
  op_interest numeric;
  effective_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_payments
  FROM public.credit_payments
  WHERE credit_operation_id = NEW.credit_operation_id;

  SELECT total_amount, COALESCE(interest_rate, 0)
  INTO op_total, op_interest
  FROM public.credit_operations
  WHERE id = NEW.credit_operation_id;

  effective_total := op_total + (op_total * op_interest / 100);

  UPDATE public.credit_operations
  SET amount_paid = total_payments,
      status = CASE WHEN total_payments >= effective_total THEN 'completed' ELSE 'active' END,
      updated_at = now()
  WHERE id = NEW.credit_operation_id;

  RETURN NEW;
END;
$function$;
