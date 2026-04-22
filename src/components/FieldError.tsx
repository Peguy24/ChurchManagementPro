import { useLanguage } from "@/contexts/LanguageContext";

interface FieldErrorProps {
  name: string;
  errors?: Record<string, string>;
  className?: string;
}

/**
 * Inline form-field error message.
 *
 * The error stored in `errors[name]` is expected to be a translation key
 * (see `src/lib/validation.ts`). It is resolved through the current
 * language. If the key is unknown to the i18n system, the raw value is
 * shown unchanged so legacy non-keyed messages still render.
 */
export function FieldError({ name, errors, className = "" }: FieldErrorProps) {
  const { t } = useLanguage();
  const raw = errors?.[name];
  if (!raw) return null;
  const translated = t(raw);
  // `t` returns the key itself when no translation is found — that's fine
  // because legacy callers may already pass plain English strings.
  return (
    <p
      role="alert"
      className={`text-xs text-destructive mt-1 ${className}`.trim()}
    >
      {translated}
    </p>
  );
}

export default FieldError;
