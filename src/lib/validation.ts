import { z } from "zod";
import { CATEGORIES, SERVICE_MODES } from "../config/constants";

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter"),
  // The client may send a role, but the server deliberately ignores it.
  role: z.enum(["customer", "technician"]).optional(),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const bookingRequestSchema = z.object({
  serviceId: z.string().min(1),
  customerPhone: z.string().trim().min(6, "Phone is required"),
  address: z.string().trim().min(5, "Address is required"),
  preferredDate: z.coerce.date().refine((date) => date.getTime() > Date.now() - 86_400_000, {
    message: "Preferred date cannot be in the past",
  }),
  problemDescription: z.string().trim().min(20, "Describe the problem in at least 20 characters"),
});

export const serviceSchema = z.object({
  title: z.string().trim().min(3),
  category: z.enum(CATEGORIES),
  description: z.string().trim().min(10),
  image: z.string().min(1, "Service image is required"),
  basePrice: z.coerce.number().positive(),
  estimatedDuration: z.string().trim().min(1),
  serviceMode: z.enum(SERVICE_MODES),
  serviceArea: z.string().trim().min(2),
});

export const finalAmountSchema = z.object({
  finalAmount: z.coerce.number().positive("Final amount must be greater than zero"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().optional(),
  area: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  image: z.string().optional(),
});
