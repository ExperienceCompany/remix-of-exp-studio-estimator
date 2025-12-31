import { z } from 'zod';

// Booking customer info validation schema
export const bookingCustomerSchema = z.object({
  customerName: z.string()
    .trim()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  customerEmail: z.string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  customerPhone: z.string()
    .trim()
    .max(20, { message: "Phone number must be less than 20 characters" })
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .trim()
    .max(500, { message: "Notes must be less than 500 characters" })
    .optional()
    .or(z.literal('')),
});

// Partial schema for optional customer info (when holderType !== 'customer')
export const bookingCustomerSchemaOptional = z.object({
  customerName: z.string()
    .trim()
    .max(100, { message: "Name must be less than 100 characters" })
    .optional()
    .or(z.literal('')),
  customerEmail: z.string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" })
    .optional()
    .or(z.literal('')),
  customerPhone: z.string()
    .trim()
    .max(20, { message: "Phone number must be less than 20 characters" })
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .trim()
    .max(500, { message: "Notes must be less than 500 characters" })
    .optional()
    .or(z.literal('')),
});

export type BookingCustomerInput = z.infer<typeof bookingCustomerSchema>;
export type BookingCustomerInputOptional = z.infer<typeof bookingCustomerSchemaOptional>;

// Validate customer info and return errors
export function validateBookingCustomer(
  data: Partial<BookingCustomerInput>,
  required: boolean = true
): { success: boolean; errors: Record<string, string> } {
  const schema = required ? bookingCustomerSchema : bookingCustomerSchemaOptional;
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, errors: {} };
  }
  
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0] as string;
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  
  return { success: false, errors };
}
