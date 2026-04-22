import { z } from "zod";

/**
 * NOTE on i18n
 * -------------
 * Every error message below is a *translation key* (e.g. "validation.email.required"),
 * not a human-readable string. The `<FieldError>` component and the `firstErrorMessage`
 * helper resolve these keys through the existing language context (FR/EN/HT).
 *
 * Keep these keys in sync with the `validation` namespace in
 * `src/contexts/LanguageContext.tsx`.
 */

/* ---------------------------------------------------------------- */
/* Reusable primitive schemas                                       */
/* ---------------------------------------------------------------- */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "validation.email.required")
  .max(255, "validation.email.tooLong")
  .email("validation.email.invalid");

export const optionalEmailSchema = z
  .string()
  .trim()
  .max(255, "validation.email.tooLong")
  .email("validation.email.invalid")
  .optional()
  .or(z.literal(""));

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "validation.phone.tooShort")
  .max(20, "validation.phone.tooLong")
  .regex(/^[+\d()\-\s]+$/, "validation.phone.invalid");

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(20, "validation.phone.tooLong")
  .regex(/^[+\d()\-\s]*$/, "validation.phone.invalid")
  .optional()
  .or(z.literal(""));

export const nameSchema = z
  .string()
  .trim()
  .min(1, "validation.field.required")
  .max(100, "validation.field.tooLong100");

export const optionalNameSchema = z
  .string()
  .trim()
  .max(100, "validation.field.tooLong100")
  .optional()
  .or(z.literal(""));

export const shortTextSchema = z
  .string()
  .trim()
  .max(255, "validation.field.tooLong255");

export const requiredShortTextSchema = z
  .string()
  .trim()
  .min(1, "validation.field.required")
  .max(255, "validation.field.tooLong255");

export const longTextSchema = z
  .string()
  .trim()
  .max(2000, "validation.field.tooLong2000");

export const requiredLongTextSchema = z
  .string()
  .trim()
  .min(1, "validation.field.required")
  .max(2000, "validation.field.tooLong2000");

export const titleSchema = z
  .string()
  .trim()
  .min(1, "validation.title.required")
  .max(200, "validation.title.tooLong");

export const urlSchema = z
  .string()
  .trim()
  .url("validation.url.invalid")
  .max(500, "validation.url.tooLong");

export const optionalUrlSchema = z
  .string()
  .trim()
  .max(500, "validation.url.tooLong")
  .url("validation.url.invalid")
  .optional()
  .or(z.literal(""));

const amountRegex = /^\d{1,10}(\.\d{1,2})?$/;

export const positiveAmountSchema = z
  .string()
  .trim()
  .min(1, "validation.amount.required")
  .regex(amountRegex, "validation.amount.invalid")
  .refine((v) => parseFloat(v) > 0, "validation.amount.positive")
  .refine((v) => parseFloat(v) <= 9_999_999_999, "validation.amount.tooLarge");

export const nonNegativeAmountSchema = z
  .string()
  .trim()
  .min(1, "validation.amount.required")
  .regex(amountRegex, "validation.amount.invalid")
  .refine((v) => parseFloat(v) >= 0, "validation.amount.nonNegative")
  .refine((v) => parseFloat(v) <= 9_999_999_999, "validation.amount.tooLarge");

const isValidDate = (v: string) => !isNaN(new Date(v).getTime());

export const dateSchema = z
  .string()
  .min(1, "validation.date.required")
  .refine(isValidDate, "validation.date.invalid");

export const optionalDateSchema = z
  .string()
  .refine((v) => !v || isValidDate(v), "validation.date.invalid")
  .optional()
  .or(z.literal(""));

export const eventDateSchema = z
  .string()
  .min(1, "validation.date.required")
  .refine(isValidDate, "validation.date.invalid")
  .refine((v) => {
    const d = new Date(v);
    const now = new Date();
    const minYear = now.getFullYear() - 100;
    const maxYear = now.getFullYear() + 100;
    return d.getFullYear() >= minYear && d.getFullYear() <= maxYear;
  }, "validation.date.outOfRange");

export const passwordSchema = z
  .string()
  .min(8, "validation.password.tooShort")
  .max(72, "validation.password.tooLong")
  .regex(/[A-Za-z]/, "validation.password.needsLetter")
  .regex(/\d/, "validation.password.needsNumber");

export const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "validation.otp.invalid");

/* ---------------------------------------------------------------- */
/* Composite form schemas                                           */
/* ---------------------------------------------------------------- */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "validation.password.required"),
});

export const signupSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "validation.password.confirmRequired"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "validation.password.mismatch",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "validation.password.confirmRequired"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "validation.password.mismatch",
    path: ["confirmPassword"],
  });

export const memberSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
  emergencyPhone: optionalPhoneSchema,
});

export const joinAsMemberSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
});

export const joinChurchSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
});

export const donationSchema = z.object({
  amount: positiveAmountSchema,
  donationType: z.string().min(1, "validation.type.required"),
  paymentMethod: z.string().min(1, "validation.paymentMethod.required"),
  donationDate: dateSchema,
  description: requiredShortTextSchema,
  notes: longTextSchema.optional().or(z.literal("")),
});

export const expenseSchema = z.object({
  amount: positiveAmountSchema,
  description: requiredShortTextSchema,
  expenseDate: dateSchema,
  vendor: shortTextSchema.optional().or(z.literal("")),
  notes: longTextSchema.optional().or(z.literal("")),
});

export const budgetSchema = z.object({
  name: requiredShortTextSchema,
  plannedAmount: positiveAmountSchema,
});

export const salarySchema = z.object({
  amount: positiveAmountSchema,
  paymentDate: dateSchema,
  notes: longTextSchema.optional().or(z.literal("")),
});

export const eventSchema = z
  .object({
    name: titleSchema,
    date: eventDateSchema,
    endDate: optionalDateSchema,
    location: shortTextSchema.optional().or(z.literal("")),
    description: longTextSchema.optional().or(z.literal("")),
  })
  .refine(
    (d) => !d.endDate || new Date(d.endDate) >= new Date(d.date),
    { message: "validation.date.endBeforeStart", path: ["endDate"] },
  );

export const eventRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
});

export const branchSchema = z.object({
  name: nameSchema,
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
  address: shortTextSchema.optional().or(z.literal("")),
  description: longTextSchema.optional().or(z.literal("")),
});

export const ministrySchema = z.object({
  name: nameSchema,
  description: longTextSchema.optional().or(z.literal("")),
});

export const customFieldSchema = z.object({
  fieldLabel: z
    .string()
    .trim()
    .min(1, "validation.label.required")
    .max(100, "validation.field.tooLong100"),
  fieldName: z
    .string()
    .trim()
    .min(1, "validation.fieldName.required")
    .max(50, "validation.fieldName.tooLong")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "validation.fieldName.invalidFormat",
    ),
});

export const inviteSchema = z.object({
  email: emailSchema,
});

export const supportSchema = z.object({
  subject: titleSchema,
  message: requiredLongTextSchema,
});

export const churchRequestSchema = z.object({
  churchName: nameSchema,
  contactName: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  message: longTextSchema.optional().or(z.literal("")),
});

export const visitorSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: optionalEmailSchema,
  phone: optionalPhoneSchema,
  notes: longTextSchema.optional().or(z.literal("")),
});

/* ---------------------------------------------------------------- */
/* Validator helper                                                 */
/* ---------------------------------------------------------------- */

export type ValidationResult<T> =
  | { success: true; data: T; fieldErrors: Record<string, string> }
  | { success: false; data: null; fieldErrors: Record<string, string> };

/**
 * Validate an object against a Zod schema and return a flat
 * { fieldName: errorMessage } map suitable for inline form display.
 *
 * The values are *translation keys* (see top-of-file note). Display them
 * through `<FieldError>` (which translates automatically) or through
 * `firstErrorMessage(errors, t)` for toasts.
 */
export function validateForm<T>(
  schema: z.ZodType<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, fieldErrors: {} };
  }
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { success: false, data: null, fieldErrors };
}

/**
 * Returns the first error message from a result. If a translator `t` is
 * provided, the message (which is a translation key) is resolved into the
 * current language; otherwise the raw key is returned.
 */
export function firstErrorMessage(
  fieldErrors: Record<string, string>,
  t?: (key: string) => string,
): string | undefined {
  const keys = Object.keys(fieldErrors);
  if (!keys.length) return undefined;
  const raw = fieldErrors[keys[0]];
  return t ? t(raw) : raw;
}
