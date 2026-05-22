import { z } from "zod"

/* ──────────────────────────────────────────────
 * Product Form
 * ────────────────────────────────────────────── */

export const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  price: z.string().min(1, "Price is required").refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Must be a valid price"),
  salePrice: z.string().optional(),
  stock: z.string().min(1, "Stock is required"),
  sku: z.string().optional(),
  isActive: z.boolean(),
})

export const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200, "Name too long"),
  description: z.string().max(5000, "Description too long").optional(),
  categoryId: z.string().optional(),
  price: z.string().min(1, "MRP is required").refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Must be a valid MRP"),
  salePrice: z.string().optional(),
  costPrice: z.string().optional(),
  stock: z.string().min(1, "Stock quantity is required"),
  unit: z.string().min(1, "Unit is required"),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  thumbnailUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  tags: z.string().optional(),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  lowStockThreshold: z.string().optional(),
  maxOrderQty: z.string().optional(),
  variantsEnabled: z.boolean(),
  variantGroupName: z.string().optional(),
  variants: z.array(variantSchema).optional(),
  metaTitle: z.string().max(80, "Meta title too long").optional(),
  metaDescription: z.string().max(200, "Meta description too long").optional(),
  ingredients: z.string().optional(),
  allergenInfo: z.string().optional(),
  shelfLife: z.string().optional(),
  storageInstructions: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  nutritionRows: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

/* ──────────────────────────────────────────────
 * Coupon Form
 * ────────────────────────────────────────────── */

export const couponFormSchema = z.object({
  code: z
    .string()
    .min(3, "Coupon code must be at least 3 characters")
    .max(30, "Coupon code too long")
    .regex(/^[A-Z0-9_-]+$/i, "Only alphanumeric, hyphens, and underscores allowed"),
  discountType: z.enum(["PERCENTAGE", "FLAT", "FREE_DELIVERY", "BOGO", "CASHBACK"]),
  discountValue: z.number().min(0, "Discount value must be non-negative"),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1, "Must be at least 1").optional(),
  perUserLimit: z.number().int().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean(),
  description: z.string().max(500).optional(),
  bogoProductId: z.string().optional(),
  cashbackPercent: z.number().min(0).max(100).optional(),
})

export type CouponFormValues = z.infer<typeof couponFormSchema>

/* ──────────────────────────────────────────────
 * Manual Order
 * ────────────────────────────────────────────── */

export const manualOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be non-negative"),
})

export const manualOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  items: z.array(manualOrderItemSchema).min(1, "At least one item is required"),
  deliveryAddress: z.string().min(5, "Delivery address is required"),
  paymentMethod: z.enum(["COD", "PREPAID", "WALLET"]),
  notes: z.string().max(500).optional(),
})

export type ManualOrderValues = z.infer<typeof manualOrderSchema>

/* ──────────────────────────────────────────────
 * Team Invite
 * ────────────────────────────────────────────── */

export const teamInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["admin", "manager", "viewer"], "Role is required"),
})

export type TeamInviteValues = z.infer<typeof teamInviteSchema>

/* ──────────────────────────────────────────────
 * Settings
 * ────────────────────────────────────────────── */

export const storeSettingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required").max(100),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number").optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  currency: z.string().default("INR"),
  timezone: z.string().default("Asia/Kolkata"),
  deliveryRadiusKm: z.number().min(0.5).max(100).optional(),
  minOrderAmount: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
})

export type StoreSettingsValues = z.infer<typeof storeSettingsSchema>

/* ──────────────────────────────────────────────
 * Banner Form
 * ────────────────────────────────────────────── */

export const bannerFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  imageUrl: z.string().url("Must be a valid image URL"),
  linkType: z.enum(["none", "product", "category", "url"]),
  linkValue: z.string().optional(),
  bannerType: z.enum(["carousel", "popup", "strip"]).default("carousel"),
  isActive: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type BannerFormValues = z.infer<typeof bannerFormSchema>

/* ──────────────────────────────────────────────
 * Category Form
 * ────────────────────────────────────────────── */

export const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

/* ──────────────────────────────────────────────
 * Login Form
 * ────────────────────────────────────────────── */

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export type LoginValues = z.infer<typeof loginSchema>

/* ──────────────────────────────────────────────
 * Notification Campaign
 * ────────────────────────────────────────────── */

export const campaignSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().min(1, "Body is required").max(1000),
  segment: z.enum(["all", "active", "inactive", "new", "riders", "specific"]),
  targetPhones: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
})

export type CampaignValues = z.infer<typeof campaignSchema>
