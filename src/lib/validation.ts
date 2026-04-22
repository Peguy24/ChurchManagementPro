import { z } from "zod";

/* ---------------------------------------------------------------- */
/* Reusable primitive schemas                                       */
/* ---------------------------------------------------------------- */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(255, "Email must be less than 255 characters")
  .email("Invalid email address");

export const optionalEmailSchema = z
  .string()
  .trim()
  .max(255, "Email must be less than 255 characters")
  .email("Invalid email address")
  .optional()
  .or(z.literal(""));

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone must be at least 7 characters")
  .max(20, "Phone must be less than 20 characters")
  .regex(/^[+\d()\-\s]+$/, "Phone may contain digits, +, -, (, ) and spaces only");

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(20, "Phone must be less than 20 characters")
  .regex(/^[+\d()\-\s]*$/, "Phone may contain digits, +, -, (, ) and spaces only")
  .optional()
  .or(z.literal(""));

export const nameSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(100, "Must be less than 100 characters");

export const optionalNameSchema = z
  .string()
  .trim()
  .max(100, "Must be less than 100 characters")
  .optional()
  .or(z.literal(""));

export const shortTextSchema = z
  .string()
  .trim()
  .max(255, "Must be less than 255 characters");

export const requiredShortTextSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(255, "Must be less than 255 characters");

export const longTextSchema = z
  .string()
  .trim()
  .max(2000, "Must be less than 2000 characters");

export const requiredLongTextSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(2000, "Must be less than 2000 characters");

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be less than 200 characters");

export const urlSchema = z
  .string()
  .trim()
  .url("Must be a valid URL starting with http(s)://")
  .max(500, "URL must be less than 500 characters");

export const optionalUrlSchema = z
  .string()
  .trim()
  .max(500, "URL must be less than 500 characters")
  .url("Must be a valid URL starting with http(s)://")
  .optional()
  .or(z.literal(""));

const amountRegex = /^\d{1,10}(\.\d{1,2})?$/;

export const positiveAmountSchema = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .regex(amountRegex, "Amount must be a number with up to 2 decimals")
  .refine((v) => parseFloat(v) > 0, "Amount must be greater than 0")
  .refine((v) => parseFloat(v) <= 9_999_999_999, "Amount is too large");

export const nonNegativeAmountSchema = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .regex(amountRegex, "Amount must be a number with up to 2 decimals")
  .refine((v) => parseFloat(v) >= 0, "Amount cannot be negative")
  .refine((v) => parseFloat(v) <= 9_999_999_999, "Amount is too large");

const isValidDate = (v: string) => !isNaN(new Date(v).getTime());

export const dateSchema = z
  .string()
  .min(1, "Date is required")
  .refine(isValidDate, "Invalid date");

export const optionalDateSchema = z
  .string()
  .refine((v) => !v || isValidDate(v), "Invalid date")
  .optional()
  .or(z.literal(""));

export const eventDateSchema = z
  .string()
  .min(1, "Date is required")
  .refine(isValidDate, "Invalid date")
  .refine((v) => {
    const d = new Date(v);
    const now = new Date();
    const minYear = now.getFullYear() - 100;
    const maxYear = now.getFullYear() + 100;
    return d.getFullYear() >= minYear && d.getFullYear() <= maxYear;
  }, "Date must be within 100 years from today");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

export const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Code must be exactly 6 digits");

/* ---------------------------------------------------------------- */
/* Composite form schemas                                           */
/* ---------------------------------------------------------------- */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
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
  donationType: z.string().min(1, "Type is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
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
    { message: "End date must be on or after start date", path: ["endDate"] },
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
    .min(1, "Label is required")
    .max(100, "Label must be less than 100 characters"),
  fieldName: z
    .string()
    .trim()
    .min(1, "Field name is required")
    .max(50, "Field name must be less than 50 characters")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Field name must start with a letter and contain only lowercase letters, numbers and underscores",
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
 * Convenience helper: returns the first error message from a result,
 * useful for showing a single-line toast summary.
 */
export function firstErrorMessage(
  fieldErrors: Record<string, string>,
): string | undefined {
  const keys = Object.keys(fieldErrors);
  return keys.length ? fieldErrors[keys[0]] : undefined;
}
