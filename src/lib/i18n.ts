/**
 * i18n helper — translation, formatting, and server-error mapping.
 *
 * Lightweight, dependency-free implementation per design §17.
 * Routes every user-visible string through {@link t}, every monetary value
 * through {@link formatCurrency}, and every date through {@link formatDate}
 * so future locales can be added without touching screens.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.6, 8.8
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported locales. The default `en` bundle is seeded below; new locales can
 *  be added by registering another `Bundle` in {@link bundles}. */
export type Locale = "en"

/** A plural form maps a numeric param (typically `count`) to a string. */
export interface PluralForms {
  one: string
  other: string
}

/** Translation entries are either a flat string or a plural-form object. */
export type BundleEntry = string | PluralForms

/** Resource bundle: dotted-key → entry. */
export type Bundle = Record<string, BundleEntry>

/** Date format presets accepted by {@link formatDate}. */
export type DateFormat = "short" | "long" | "datetime"

/** Interpolation params passed to {@link t}. */
export type TranslationParams = Record<string, string | number>

// ---------------------------------------------------------------------------
// Resource bundles
// ---------------------------------------------------------------------------

const en: Bundle = {
  // ---------- Shops list / create / edit (Req 5) ----------
  "shops.list.title": "Shops",
  "shops.list.subtitle": "Manage every branch in one place",
  "shops.list.createButton": "Create shop",
  "shops.list.searchPlaceholder": "Search by name or branch code",
  "shops.list.filter.isActive": "Status",
  "shops.list.filter.isVerified": "Verification",
  "shops.list.filter.city": "City",
  "shops.list.filter.all": "All",
  "shops.list.filter.active": "Active",
  "shops.list.filter.inactive": "Inactive",
  "shops.list.filter.verified": "Verified",
  "shops.list.filter.unverified": "Unverified",
  "shops.list.column.name": "Shop",
  "shops.list.column.branchCode": "Branch code",
  "shops.list.column.city": "City",
  "shops.list.column.pincode": "Pincode",
  "shops.list.column.isActive": "Active",
  "shops.list.column.isVerified": "Verified",
  "shops.list.column.totalOrders": "Total orders",
  "shops.list.column.avgRating": "Avg rating",
  "shops.list.column.actions": "Actions",
  "shops.list.empty": "No shops yet. Create your first branch to get started.",
  "shops.list.count": { one: "1 shop", other: "{count} shops" },

  "shops.create.title": "Create shop",
  "shops.create.section.identity": "Identity",
  "shops.create.section.contact": "Contact",
  "shops.create.section.address": "Address",
  "shops.create.section.serviceArea": "Service area",
  "shops.create.section.operatingHours": "Operating hours",
  "shops.create.section.commercial": "Commercial settings",
  "shops.create.section.bank": "Bank details",
  "shops.create.field.name": "Name",
  "shops.create.field.branchCode": "Branch code",
  "shops.create.field.slug": "Slug",
  "shops.create.field.description": "Description",
  "shops.create.field.logo": "Logo",
  "shops.create.field.banner": "Banner",
  "shops.create.field.phone": "Phone",
  "shops.create.field.email": "Email",
  "shops.create.field.whatsapp": "WhatsApp",
  "shops.create.field.line1": "Address line 1",
  "shops.create.field.line2": "Address line 2",
  "shops.create.field.city": "City",
  "shops.create.field.state": "State",
  "shops.create.field.pincode": "Pincode",
  "shops.create.field.lat": "Latitude",
  "shops.create.field.lng": "Longitude",
  "shops.create.field.serviceablePincodes": "Serviceable pincodes",
  "shops.create.field.deliveryRadiusKm": "Delivery radius (km)",
  "shops.create.field.commissionRate": "Commission rate",
  "shops.create.field.gstNumber": "GST number",
  "shops.create.field.panNumber": "PAN number",
  "shops.create.field.accountNumber": "Account number",
  "shops.create.field.ifsc": "IFSC",
  "shops.create.field.bankName": "Bank name",
  "shops.create.field.holderName": "Account holder name",
  "shops.create.submit": "Create shop",
  "shops.create.submitting": "Creating…",
  "shops.create.toast.success": "Shop created",

  "shops.edit.title": "Edit shop",
  "shops.edit.submit": "Save changes",
  "shops.edit.submitting": "Saving…",
  "shops.edit.toast.success": "Shop updated",
  "shops.edit.toast.deactivated": "Shop deactivated",
  "shops.edit.toast.reactivated": "Shop reactivated",
  "shops.edit.toast.verificationToggled": "Verification updated",
  "shops.edit.confirmDeactivate.title": "Deactivate shop?",
  "shops.edit.confirmDeactivate.description":
    "This will hide the shop from customers. You can reactivate it later.",

  // ---------- Shop staff invite (Req 6) ----------
  "shopStaff.list.title": "Staff",
  "shopStaff.list.inviteButton": "Invite staff",
  "shopStaff.list.column.user": "User",
  "shopStaff.list.column.email": "Email",
  "shopStaff.list.column.phone": "Phone",
  "shopStaff.list.column.role": "Role",
  "shopStaff.list.column.isActive": "Active",
  "shopStaff.list.column.joinedAt": "Joined",
  "shopStaff.list.column.actions": "Actions",
  "shopStaff.list.empty": "No staff assigned to this shop yet.",
  "shopStaff.list.count": { one: "1 member", other: "{count} members" },

  "shopStaff.invite.title": "Invite staff",
  "shopStaff.invite.userPicker.label": "User",
  "shopStaff.invite.userPicker.placeholder": "Search by email or phone",
  "shopStaff.invite.role.label": "Role",
  "shopStaff.invite.role.SHOP_ADMIN": "Shop admin",
  "shopStaff.invite.role.SHOP_MANAGER": "Shop manager",
  "shopStaff.invite.role.SHOP_STAFF": "Shop staff",
  "shopStaff.invite.role.SHOP_VIEWER": "Shop viewer",
  "shopStaff.invite.permissions.label": "Permissions",
  "shopStaff.invite.permissions.group.orders": "Orders",
  "shopStaff.invite.permissions.group.products": "Products",
  "shopStaff.invite.permissions.group.financials": "Financials",
  "shopStaff.invite.permissions.group.transactions": "Transactions",
  "shopStaff.invite.permissions.group.settings": "Settings",
  "shopStaff.invite.isActive.label": "Active",
  "shopStaff.invite.submit": "Send invite",
  "shopStaff.invite.submitting": "Sending…",
  "shopStaff.invite.cancel": "Cancel",
  "shopStaff.invite.error.alreadyAssigned": "This user is already on this shop.",

  "shopStaff.edit.title": "Edit staff member",
  "shopStaff.edit.submit": "Save changes",
  "shopStaff.confirmRemove.title": "Remove staff member?",
  "shopStaff.confirmRemove.description":
    "They will lose access to this shop. You can re-invite them later.",
  "shopStaff.confirmRemove.confirm": "Remove",

  "shopStaff.toast.invited": "Invite sent",
  "shopStaff.toast.updated": "Staff updated",
  "shopStaff.toast.removed": "Staff removed",
  "shopStaff.toast.staffCapReached":
    "This shop already has the maximum number of staff.",
  "shopStaff.toast.userShopCapReached":
    "This user is already assigned to the maximum number of shops.",

  // ---------- Shop products list / badges / toasts (Req 7, 8.8) ----------
  "shopProducts.list.title": "Inventory",
  "shopProducts.list.addButton": "Add product",
  "shopProducts.list.searchPlaceholder": "Search by name or SKU",
  "shopProducts.list.filter.availability": "Availability",
  "shopProducts.list.filter.availability.all": "All",
  "shopProducts.list.filter.availability.available": "Available",
  "shopProducts.list.filter.availability.soldOut": "Sold out",
  "shopProducts.list.filter.lowStock": "Low stock",
  "shopProducts.list.filter.lowStock.all": "All",
  "shopProducts.list.filter.lowStock.atOrBelow": "At or below threshold",
  "shopProducts.list.filter.category": "Category",
  "shopProducts.list.column.image": "Image",
  "shopProducts.list.column.name": "Product",
  "shopProducts.list.column.sku": "SKU",
  "shopProducts.list.column.price": "Price",
  "shopProducts.list.column.salePrice": "Sale price",
  "shopProducts.list.column.stockQuantity": "Stock",
  "shopProducts.list.column.lowStockThreshold": "Low-stock threshold",
  "shopProducts.list.column.maxOrderQty": "Max order qty",
  "shopProducts.list.column.isAvailable": "Available",
  "shopProducts.list.column.isFeatured": "Featured",
  "shopProducts.list.column.soldOutAt": "Sold out at",
  "shopProducts.list.column.actions": "Actions",
  "shopProducts.list.empty": "No products in this shop yet.",
  "shopProducts.list.lowStockHeader": {
    one: "1 product at or below threshold",
    other: "{count} products at or below threshold",
  },

  "shopProducts.badge.lowStock": "Low stock",
  "shopProducts.badge.soldOut": "Sold out",
  "shopProducts.tooltip.soldOutAt": "Marked sold out on {when}",

  // 8.8 — live socket toasts. Both interpolations support `{name}`; low-stock
  // additionally interpolates `{qty}`.
  "shopProducts.toast.soldOut": "Out of stock: {name}",
  "shopProducts.toast.lowStock": "Low stock: {name} ({qty} left)",
  "shopProducts.toast.added": "Product added",
  "shopProducts.toast.addFailed": "Could not add the product. Please retry.",
  "shopProducts.toast.duplicate": "This product already exists for this shop.",
  "shopProducts.toast.duplicateEditLink": "Edit existing product",
  "shopProducts.toast.updated": "Product updated",
  "shopProducts.toast.updateFailed": "Could not save changes. Please retry.",
  "shopProducts.toast.removed": "Product removed",
  "shopProducts.toast.removeFailed": "Could not remove the product.",
  "shopProducts.confirmRemove.title": "Remove product from shop?",
  "shopProducts.confirmRemove.description":
    "Customers will no longer see this product in this shop.",
  "shopProducts.confirmRemove.confirm": "Remove",

  // ---------- Products tabs — Master Catalog vs Shop Products (Req 10.7) ----
  // Tab labels for the `/products` surface, which now exposes both the
  // super-admin-managed master catalog and the per-shop inventory under a
  // single Tabs control. The `disabledHint` string is shown when a
  // Super_Admin has not yet picked a shop, gating the Shop Products tab.
  "products.tab.masterCatalog": "Master Catalog",
  "products.tab.shopProducts": "Shop Products",
  "products.tab.shopProducts.disabledHint":
    "Select a shop to view inventory.",

  // ---------- Shop financials KPI labels (Req 8) ----------
  "shopFinancials.title": "Financials",
  "shopFinancials.period.label": "Period",
  "shopFinancials.period.daily": "Daily",
  "shopFinancials.period.weekly": "Weekly",
  "shopFinancials.period.monthly": "Monthly",
  "shopFinancials.kpi.grossRevenue": "Gross revenue",
  "shopFinancials.kpi.netRevenue": "Net revenue",
  "shopFinancials.kpi.totalOrders": "Total orders",
  "shopFinancials.kpi.avgOrderValue": "Avg order value",
  "shopFinancials.kpi.platformCommission": "Platform commission",
  "shopFinancials.kpi.deliveryCosts": "Delivery costs",
  "shopFinancials.kpi.refundAmount": "Refunds",
  "shopFinancials.kpi.payoutAmount": "Payouts",
  "shopFinancials.column.periodStart": "Period start",
  "shopFinancials.column.periodEnd": "Period end",
  "shopFinancials.column.grossRevenue": "Gross revenue",
  "shopFinancials.column.netRevenue": "Net revenue",
  "shopFinancials.column.totalOrders": "Orders",
  "shopFinancials.column.avgOrderValue": "AOV",
  "shopFinancials.column.platformCommission": "Commission",
  "shopFinancials.column.deliveryCosts": "Delivery cost",
  "shopFinancials.column.refundAmount": "Refunds",
  "shopFinancials.column.payoutAmount": "Payout",
  "shopFinancials.column.payoutStatus": "Payout status",
  "shopFinancials.column.payoutRef": "Payout ref",
  "shopFinancials.column.paidAt": "Paid at",
  "shopFinancials.payoutStatus.PENDING": "Pending",
  "shopFinancials.payoutStatus.PROCESSING": "Processing",
  "shopFinancials.payoutStatus.PAID": "Paid",
  "shopFinancials.payoutStatus.HELD": "Held",
  "shopFinancials.error.title": "Could not load financials",
  "shopFinancials.error.retry": "Retry",

  // ---------- Shop transactions ledger (Req 9) ----------
  "shopTransactions.title": "Transactions",
  "shopTransactions.searchPlaceholder": "Search descriptions",
  "shopTransactions.filter.type": "Type",
  "shopTransactions.filter.dateRange": "Date range",
  "shopTransactions.filter.referenceType": "Reference type",
  "shopTransactions.column.createdAt": "Date",
  "shopTransactions.column.type": "Type",
  "shopTransactions.column.amount": "Amount",
  "shopTransactions.column.balanceAfter": "Balance",
  "shopTransactions.column.referenceType": "Reference type",
  "shopTransactions.column.referenceId": "Reference",
  "shopTransactions.column.description": "Description",
  "shopTransactions.column.createdBy": "Created by",
  "shopTransactions.balanceChip": "Running balance: {balance}",
  "shopTransactions.type.ORDER_REVENUE": "Order revenue",
  "shopTransactions.type.COMMISSION_DEBIT": "Commission",
  "shopTransactions.type.DELIVERY_COST": "Delivery cost",
  "shopTransactions.type.REFUND_DEBIT": "Refund",
  "shopTransactions.type.PAYOUT_CREDIT": "Payout",
  "shopTransactions.type.ADJUSTMENT": "Adjustment",
  "shopTransactions.type.EXPENSE": "Expense",
  "shopTransactions.empty": "No transactions in this range.",

  // ---------- Error toasts (Req 15) ----------
  "errors.genericError": "Something went wrong. Please try again.",
  "errors.permissionDenied": "You do not have permission to do that.",
  "errors.sessionExpired": "Your session has expired. Please sign in again.",
  "errors.tooManyRequests": "Too many requests, please retry in a moment",
  "errors.networkError": "Could not reach the server. Check your connection.",
  "errors.copyErrorId": "Copy error id",
  "errors.errorIdCopied": "Error id copied",
  "errors.boundaryFallback": "Something went wrong, refresh the page",
  "errors.reconnecting": "Reconnecting…",
  "errors.noShopAssigned": "No shop assigned, contact your administrator",
  "errors.shopSelectFailed":
    "Could not enter your shop. Please try again or contact your administrator.",

  // ---------- Empty-shop state (Req 10.5) ----------
  "emptyShop.title": "Select a shop",
  "emptyShop.description": "Pick a shop from the switcher to use this section.",
  "emptyShop.action.vendor": "Choose a shop",
  "emptyShop.action.superAdmin": "Use the shop switcher in the topbar.",

  // ---------- Shop scope badge (Req 10.2) ----------
  "shopScope.badge": "Shop: {name}",
  "shopScope.allShops": "All shops",

  // ---------- 403 / forbidden fallback (Req 4.3, 4.4) ----------
  "forbidden.title": "Not authorized",
  "forbidden.description": "You do not have permission to view this page.",
  "forbidden.back": "Back to dashboard",

  // ---------- Server error code → translation (Req 16.6) ----------
  // Looked up by `translateServerError(code, fallback)` as `serverErrors.<code>`.
  "serverErrors.SHOP_STAFF_CAP_REACHED":
    "This shop already has the maximum number of staff.",
  "serverErrors.USER_SHOP_CAP_REACHED":
    "This user is already assigned to the maximum number of shops.",
  "serverErrors.SHOP_STAFF_ALREADY_ASSIGNED":
    "This user is already on this shop.",
  "serverErrors.DUPLICATE_BRANCH_CODE":
    "A shop with this branch code already exists.",
  "serverErrors.DUPLICATE_SLUG": "A shop with this slug already exists.",
  "serverErrors.SHOP_NOT_FOUND": "Shop not found.",
  "serverErrors.PERMISSION_DENIED":
    "You do not have permission to do that.",
  "serverErrors.RATE_LIMITED":
    "Too many requests, please retry in a moment",
}

const bundles: Record<Locale, Bundle> = { en }

// ---------------------------------------------------------------------------
// Locale state
// ---------------------------------------------------------------------------

let activeLocale: Locale = "en"

/** Set the active locale. Defaults to `"en"` until called. */
export function setLocale(locale: Locale): void {
  activeLocale = locale
}

/** Get the active locale. Useful for binding to the root `<html lang>` attr. */
export function getLocale(): Locale {
  return activeLocale
}

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template
  let out = template
  for (const [key, value] of Object.entries(params)) {
    // Replace every `{key}` occurrence; String() so numbers serialise cleanly.
    out = out.split(`{${key}}`).join(String(value))
  }
  return out
}

function pickPlural(forms: PluralForms, params?: TranslationParams): string {
  // Per design §17 + task brief: pick `one` when count === 1, otherwise `other`.
  const count = params?.count
  return typeof count === "number" && count === 1 ? forms.one : forms.other
}

/**
 * Look up a translation key in the active locale's bundle.
 *
 * Supports `{name}` style interpolation and `{ one, other }` plural forms
 * driven by a numeric `count` param. Returns the key itself when no entry
 * exists (a deliberately loud dev fallback).
 */
export function t(key: string, params?: TranslationParams): string {
  const entry = bundles[activeLocale][key]
  if (entry == null) {
    // Dev fallback: show the missing key so it's obvious during development.
    return key
  }
  const template =
    typeof entry === "string" ? entry : pickPlural(entry, params)
  return interpolate(template, params)
}

// ---------------------------------------------------------------------------
// Locale-aware formatters
// ---------------------------------------------------------------------------

/**
 * Format a number as a currency string in the active locale.
 * Always renders two decimal places per Req 8.8.
 */
export function formatCurrency(value: number, currency = "INR"): string {
  return new Intl.NumberFormat(activeLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format an ISO-8601 date string in the active locale.
 *
 * - `"short"`    → date only, short style (e.g. `12/25/24`)
 * - `"long"`     → date long style with short time (e.g. `December 25, 2024 at 9:30 AM`)
 * - `"datetime"` → medium date with short time (e.g. `Dec 25, 2024, 9:30 AM`)
 */
export function formatDate(iso: string, fmt: DateFormat = "short"): string {
  const options: Intl.DateTimeFormatOptions =
    fmt === "long"
      ? { dateStyle: "long", timeStyle: "short" }
      : fmt === "datetime"
        ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "short" }
  return new Intl.DateTimeFormat(activeLocale, options).format(new Date(iso))
}

// ---------------------------------------------------------------------------
// Server error translation (Req 16.6)
// ---------------------------------------------------------------------------

/**
 * Translate a backend error `code` to a localized message, or fall back to
 * the server-provided message when no translation exists.
 *
 * Looks up `serverErrors.<code>` in the active bundle.
 */
export function translateServerError(
  code: string | null | undefined,
  fallback: string,
): string {
  if (!code) return fallback
  const entry = bundles[activeLocale][`serverErrors.${code}`]
  return typeof entry === "string" ? entry : fallback
}
