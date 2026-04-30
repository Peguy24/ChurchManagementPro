import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FieldErrorProps {
  name: string;
  errors?: Record<string, string>;
  className?: string;
}

/**
 * Inline form-field error message with icon for visibility.
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
  return (
    <p
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-1 text-xs text-destructive mt-1 ${className}`.trim()}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden="true" />
      <span>{translated}</span>
    </p>
  );
}

export default FieldError;
