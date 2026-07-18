/**
 * Zod schemas for the multi-vendor surfaces — single source of truth used by
 * the shops, shop-staff, and shop-products forms (see design.md
 * §"Folder & Module Layout" → `lib/shop-validations.ts`).
 *
 * The schemas mirror the backend Zod schemas under
 * `bakaloo-backend/src/modules/{shops,shop-staff,shop-products}/*.schema.js`
 * but tighten a few rules to match the dashboard form copy in
 * requirements.md 5.4, 5.5, 6.3, 6.4, 7.4, 7.5.
 *
 * Conventions (matches the existing `src/lib/validations.ts`):
 *   - `z.string().email()` chained form
 *   - field-level `.refine()` / `.superRefine()` for cross-field rules
 *   - exported `*Input` types via `z.infer`
 */

import { z } from "zod"

import type { PermissionToken, ShopRole } from "./permissions"

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

/** HH:MM 24-hour clock (e.g. "09:00", "23:30"). */
const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/** 6-digit Indian PIN code (cannot start with 0). */
const PINCODE_REGEX = /^[1-9]\d{5}$/

/**
 * Phone: E.164 (+ then 7-15 digits, leading non-zero) or 10-digit Indian
 * mobile (starts 6-9). Empty strings are rejected; callers use `.optional()`
 * to allow omission entirely.
 */
const PHONE_REGEX = /^(\+[1-9]\d{6,14}|[6-9]\d{9})$/

/** Indian IFSC: 4 letters, 0, 6 alphanumerics. */
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/

/** Indian GSTIN: 15 chars, structured. */
const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

/** Indian PAN: 10 chars, structured. */
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

/** Slug: lowercase letters, digits, hyphens; cannot start/end with hyphen. */
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/** Branch code: uppercase letters, digits, hyphens. */
const BRANCH_CODE_REGEX = /^[A-Z0-9-]+$/

/** Optional URL field that also accepts the empty string (cleared input). */
const optionalUrl = () =>
  z.string().url("Must be a valid URL").optional().or(z.literal(""))

// ─────────────────────────────────────────────────────────────────────────────
// shopSchema — mirror of `Shop` (see types/shop.types.ts) for create/edit
// ─────────────────────────────────────────────────────────────────────────────

/** Single weekday's operating hours. */
export const operatingHoursDaySchema = z.object({
  open: z.string().regex(TIME_HHMM, "Time must be HH:MM (24h)"),
  close: z.string().regex(TIME_HHMM, "Time must be HH:MM (24h)"),
  closed: z.boolean(),
})

/**
 * Operating hours keyed by weekday. Every weekday must be present so the form
 * can render one row per day (Requirement 5.4).
 */
export const operatingHoursSchema = z.object({
  monday: operatingHoursDaySchema,
  tuesday: operatingHoursDaySchema,
  wednesday: operatingHoursDaySchema,
  thursday: operatingHoursDaySchema,
  friday: operatingHoursDaySchema,
  saturday: operatingHoursDaySchema,
  sunday: operatingHoursDaySchema,
})

/**
 * Full shop create/edit schema. Flat structure (instead of nested objects)
 * because react-hook-form drives the form and a flat shape simplifies
 * `setError` paths returned from the backend on conflict (Requirement 5.11).
 */
export const shopSchema = z
  .object({
    // ─── identity ───
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or fewer"),
    branch_code: z
      .string()
      .min(1, "Branch code is required")
      .max(50, "Branch code must be 50 characters or fewer")
      .regex(
        BRANCH_CODE_REGEX,
        "Branch code may only contain A–Z, 0–9, and hyphens",
      ),
    slug: z
      .string()
      .min(1, "Slug is required")
      .max(150, "Slug must be 150 characters or fewer")
      .regex(
        SLUG_REGEX,
        "Slug must be lowercase letters, digits, and hyphens",
      ),
    description: z
      .string()
      .max(1000, "Description must be 1000 characters or fewer")
      .optional(),
    logo_url: optionalUrl(),
    banner_url: optionalUrl(),

    // ─── contact ───
    phone: z
      .string()
      .regex(
        PHONE_REGEX,
        "Phone must be E.164 (+919876543210) or a 10-digit Indian mobile",
      )
      .optional(),
    email: z.string().email("Invalid email address").optional(),
    whatsapp: z
      .string()
      .regex(
        PHONE_REGEX,
        "WhatsApp must be E.164 (+919876543210) or a 10-digit Indian mobile",
      )
      .optional(),

    // ─── address ───
    address_line1: z
      .string()
      .min(1, "Address line 1 is required")
      .max(255, "Address line 1 must be 255 characters or fewer"),
    address_line2: z
      .string()
      .max(255, "Address line 2 must be 255 characters or fewer")
      .optional(),
    city: z
      .string()
      .min(1, "City is required")
      .max(100, "City must be 100 characters or fewer"),
    state: z
      .string()
      .min(1, "State is required")
      .max(100, "State must be 100 characters or fewer"),
    pincode: z
      .string()
      .regex(PINCODE_REGEX, "Pincode must be a 6-digit Indian PIN"),
    lat: z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90"),
    lng: z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180"),

    // ─── service area ───
    serviceable_pincodes: z
      .array(z.string().regex(PINCODE_REGEX, "Each pincode must be 6 digits"))
      .min(1, "Add at least one serviceable pincode"),
    delivery_radius_km: z
      .number()
      .positive("Delivery radius must be greater than 0")
      .max(50, "Delivery radius cannot exceed 50 km"),
    pincode_only: z.boolean().default(false),

    // ─── operating hours ───
    operating_hours: operatingHoursSchema,

    // ─── commercial settings ───
    commission_rate: z
      .number()
      .min(0, "Commission rate must be between 0 and 100")
      .max(100, "Commission rate must be between 0 and 100"),
    gst_number: z
      .string()
      .regex(GSTIN_REGEX, "GSTIN must be a 15-character GST number")
      .optional(),
    pan_number: z
      .string()
      .regex(PAN_REGEX, "PAN must be a 10-character PAN number")
      .optional(),

    // ─── bank details (all optional individually; required together) ───
    bank_account_number: z
      .string()
      .min(9, "Bank account number is too short")
      .max(20, "Bank account number is too long")
      .regex(/^[0-9]+$/, "Bank account number must be digits only")
      .optional(),
    bank_ifsc: z
      .string()
      .regex(IFSC_REGEX, "IFSC must match the format ABCD0123456")
      .optional(),
    bank_name: z
      .string()
      .min(1, "Bank name is required")
      .max(100, "Bank name must be 100 characters or fewer")
      .optional(),
    bank_holder_name: z
      .string()
      .min(1, "Account holder name is required")
      .max(100, "Account holder name must be 100 characters or fewer")
      .optional(),
  })
  /**
   * Bank details are optional in aggregate but required-together: if any one
   * field is provided, all four must be provided. Errors are placed on each
   * missing field so the form can highlight them individually.
   */
  .superRefine((data, ctx) => {
    const bankFields = [
      "bank_account_number",
      "bank_ifsc",
      "bank_name",
      "bank_holder_name",
    ] as const
    const provided = bankFields.filter(
      (f) => data[f] !== undefined && data[f] !== "",
    )
    if (provided.length === 0 || provided.length === bankFields.length) return

    for (const f of bankFields) {
      if (data[f] === undefined || data[f] === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [f],
          message: "All bank fields are required when any one is provided",
        })
      }
    }
  })

/**
 * `z.infer` of `shopSchema`. Use this as the RHF form value type. The shape
 * is flat to mirror the backend payload (snake_case keys) so the service
 * layer can post the parsed value directly.
 */
export type ShopInput = z.infer<typeof shopSchema>

// ─────────────────────────────────────────────────────────────────────────────
// shopStaffInviteSchema — invite + edit dialog payload
// ─────────────────────────────────────────────────────────────────────────────

/** Roles available in the staff invite dialog (see design.md §7). */
const SHOP_ROLE_VALUES = [
  "SHOP_ADMIN",
  "SHOP_MANAGER",
  "SHOP_STAFF",
  "SHOP_VIEWER",
] as const satisfies readonly ShopRole[]

/**
 * Staff invite/edit form schema. The dialog only ever submits a `userId`
 * (selected from the user picker) plus the chosen role + permissions; the
 * `shopId` comes from the URL/route, not the form (Requirement 6.3).
 *
 * `permissions` is `z.array(z.string())` rather than `z.array(z.enum(...))`
 * to avoid hard-coding every `PermissionToken` value in the schema. The
 * exported `ShopStaffInviteInput` narrows it back to `PermissionToken[]` at
 * the type level, which is sufficient for the form code.
 */
export const shopStaffInviteSchema = z.object({
  userId: z.string().uuid("Pick a user"),
  role: z.enum(SHOP_ROLE_VALUES, "Role is required"),
  permissions: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
})

/**
 * Form value type — narrows `permissions` from `string[]` to `PermissionToken[]`
 * so call sites and `ROLE_DEFAULTS` consumers stay strongly typed without
 * dragging the full union into the runtime schema.
 */
export type ShopStaffInviteInput = Omit<
  z.infer<typeof shopStaffInviteSchema>,
  "permissions"
> & {
  permissions: PermissionToken[]
}

// ─────────────────────────────────────────────────────────────────────────────
// shopProductSchema — add + edit dialog payload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shop product (per-shop inventory) form schema. Mirrors the constraints
 * called out in Requirement 7.5:
 *   - `sale_price < price` when `sale_price` is non-null
 *   - `stock_quantity >= 0`
 *   - `1 <= max_order_qty <= 10000`
 *
 * Backend caps and defaults match
 * `bakaloo-backend/src/modules/shop-products/shop-products.schema.js`.
 */
export const shopProductSchema = z
  .object({
    product_id: z.string().uuid("Pick a product from the catalog"),
    price: z.number().positive("Price must be greater than 0"),
    sale_price: z
      .number()
      .positive("Sale price must be greater than 0")
      .nullable(),
    cost_price: z
      .number()
      .positive("Cost price must be greater than 0")
      .nullable(),
    stock_quantity: z
      .number()
      .int("Stock quantity must be an integer")
      .min(0, "Stock quantity must be 0 or greater"),
    low_stock_threshold: z
      .number()
      .int("Low stock threshold must be an integer")
      .min(0, "Low stock threshold must be 0 or greater")
      .default(5),
    max_order_qty: z
      .number()
      .int("Max order quantity must be an integer")
      .min(1, "Max order quantity must be at least 1")
      .max(10000, "Max order quantity cannot exceed 10000"),
    is_available: z.boolean().default(true),
    is_featured: z.boolean().default(false),
  })
  /**
   * Sale price (when present) must be strictly less than the regular price.
   * Error is attached to `sale_price` so the form highlights the offending
   * field.
   */
  .refine(
    (data) => data.sale_price === null || data.sale_price < data.price,
    {
      message: "Sale price must be less than the regular price",
      path: ["sale_price"],
    },
  )

/** `z.infer` of `shopProductSchema` — RHF form value type. */
export type ShopProductInput = z.infer<typeof shopProductSchema>
