import { z } from "zod";

const trimmed = (label: string, min = 1, max = 255) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const email = z.string({ error: "Email is required" }).trim().toLowerCase().pipe(z.email("Enter a valid email"));
const phone = z
  .string({ error: "Phone is required" })
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, "Enter a valid phone number");
const password = z.string({ error: "Password is required" }).min(6, "Password must be at least 6 characters").max(100);

/** Multipart forms send booleans as strings. */
const booleanish = z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]);

// ---------- Auth ----------
export const registerSchema = z.object({
  name: trimmed("Name", 2, 100),
  email,
  phone,
  password,
  address: optionalText(500),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email,
  /** Which app should open the reset link. */
  from: z.enum(["website", "dashboard"]).optional().default("website"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Invalid reset link"),
  password,
});

export const updateProfileSchema = z.object({
  name: trimmed("Name", 2, 100),
  phone,
  address: optionalText(500),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: password,
});

// ---------- Categories ----------
export const categorySchema = z.object({ name: trimmed("Name", 2, 50) });

// ---------- Products ----------
export const productSchema = z.object({
  name: trimmed("Name", 2, 150),
  description: trimmed("Description", 1, 5000),
  categoryId: z.coerce.number({ error: "Category is required" }).int().positive("Category is required"),
  price: z.coerce.number({ error: "Price is required" }).positive("Price must be more than 0").max(10_000_000),
  stock: z.coerce.number({ error: "Stock is required" }).int().min(0, "Stock cannot be negative"),
  size: optionalText(100),
  weight: optionalText(100),
  willow: optionalText(100),
  featured: booleanish.optional().default(false),
});

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.coerce.number().int().positive().optional(),
  featured: booleanish.optional(),
  inStock: booleanish.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name", "popular"]).optional().default("newest"),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

// ---------- Orders ----------
export const orderStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(100),
      }),
    )
    .min(1, "Your cart is empty"),
  phone,
  address: trimmed("Address", 5, 500),
  description: optionalText(1000),
});

export const orderStatusSchema = z.object({ status: z.enum(orderStatuses) });

export const orderQuerySchema = z.object({
  status: z.enum(orderStatuses).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

// ---------- Messages ----------
export const messageSchema = z.object({
  name: trimmed("Name", 2, 100),
  email,
  message: trimmed("Message", 5, 5000),
});

export const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  unread: booleanish.optional(),
});
