interface FieldErrorProps {
  name: string;
  errors?: Record<string, string>;
  className?: string;
}

/**
 * Inline form-field error message.
 * Renders nothing when there is no error for the given field name.
 */
export function FieldError({ name, errors, className = "" }: FieldErrorProps) {
  const message = errors?.[name];
  if (!message) return null;
  return (
    <p
      role="alert"
      className={`text-xs text-destructive mt-1 ${className}`.trim()}
    >
      {message}
    </p>
  );
}

export default FieldError;
