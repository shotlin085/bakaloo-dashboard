"use client"

/**
 * Shared shop create/edit form — used by `/shops/new` (task 5.4) and
 * `/shops/[shopId]/edit` (task 5.7).
 *
 * Mirrors the design in design.md §6 "Shops Management UI": the form is
 * split across six `Card` sections (identity, contact, address, service
 * area, operating hours, commercial + bank), driven by react-hook-form +
 * Zod (`shopSchema` from `@/lib/shop-validations`).
 *
 * Behaviours:
 *   - In `create` mode, the `slug` field auto-fills from `name` (debounced
 *     300 ms) until the operator manually edits it (Req 5.4). In `edit`
 *     mode the auto-fill is suppressed entirely — the existing slug is
 *     part of the shop's identity and should not be reshaped because the
 *     operator typed a new display name.
 *   - `serviceable_pincodes` renders as a chip list. New pincodes are
 *     added by typing + Enter or comma; chips are removed by clicking
 *     the X affordance (Req 5.4).
 *   - Submission delegates to `onSubmit`. The parent owns the mutation
 *     hook (`useCreateShop` / `useUpdateShop`) and decides what to do on
 *     success (redirect, refetch, …).
 *   - 409 conflicts surfaced via `serverFieldErrors` are reactively
 *     mapped onto RHF `setError` so the offending input is highlighted
 *     while every other entered value is preserved (Req 5.11, 12.5).
 *   - Layout collapses to a single column at viewport widths ≤ 768 px so
 *     the full form remains usable at 360 px without horizontal scroll
 *     (Req 12.5).
 *
 * Requirements: 5.4, 5.5, 5.10, 5.11, 12.5
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import Link from "next/link"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, X } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import { useDebounce } from "@/hooks/useDebounce"
import type { ShopServerFieldErrors } from "@/hooks/useShops"

import { t } from "@/lib/i18n"
import { shopSchema, type ShopInput } from "@/lib/shop-validations"
import { cn } from "@/lib/utils"
import type { Weekday } from "@/types"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Weekday order matches the operating-hours UI rows (Mon → Sun). */
const WEEKDAYS: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

/**
 * RHF field paths on which a backend 409 conflict can land. Mirrors
 * `ShopServerFieldErrors` from `@/hooks/useShops`.
 */
const SERVER_FIELD_PATHS = ["branch_code", "slug"] as const
type ServerFieldPath = (typeof SERVER_FIELD_PATHS)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Slugify a free-text shop name into the lowercase-hyphen format the schema
 * accepts (`/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/`).
 *
 * - Lowercases everything.
 * - Replaces every non `[a-z0-9]` run with a single hyphen.
 * - Trims leading / trailing hyphens so the pattern's anchored ends pass.
 *
 * Returning `""` for empty input is intentional — the auto-fill effect
 * skips empty results so the user can clear `name` without clobbering a
 * slug they manually typed.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Build the default form values. Optional string fields default to `""` so
 * inputs render empty; the submit handler converts empty optional strings
 * to `undefined` before posting (see `cleanShopInput`).
 *
 * Numeric fields default to `undefined` so the inputs render empty rather
 * than as `0` — RHF + `valueAsNumber` will report `NaN` for empty inputs,
 * which Zod surfaces as a "required" validation error.
 */
function buildBlankDefaults(): Partial<ShopInput> {
  const defaultDay = { open: "09:00", close: "21:00", closed: false }
  return {
    name: "",
    branch_code: "",
    slug: "",
    description: "",
    logo_url: "",
    banner_url: "",
    phone: "",
    email: "",
    whatsapp: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    serviceable_pincodes: [],
    operating_hours: {
      monday: { ...defaultDay },
      tuesday: { ...defaultDay },
      wednesday: { ...defaultDay },
      thursday: { ...defaultDay },
      friday: { ...defaultDay },
      saturday: { ...defaultDay },
      sunday: { ...defaultDay },
    },
    gst_number: "",
    pan_number: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_name: "",
    bank_holder_name: "",
  }
}

/**
 * Merge caller-supplied `defaultValues` (typically a `Shop` record from
 * `useShop(id)`) onto the blank baseline. We coerce `null` → `""` for
 * optional string fields and keep undefined values from clobbering the
 * blank defaults so RHF inputs stay controlled.
 */
function mergeDefaults(overrides?: Partial<ShopInput>): Partial<ShopInput> {
  const blank = buildBlankDefaults()
  if (!overrides) return blank

  const merged: Record<string, unknown> = { ...blank }
  for (const [key, value] of Object.entries(overrides)) {
    // Treat `null` and `undefined` as "use the blank default" so the form
    // never sees a `null` on a string-typed input (which would force the
    // input back into uncontrolled mode and emit the React warning).
    if (value === null || value === undefined) continue
    merged[key] = value
  }
  return merged as Partial<ShopInput>
}

/**
 * Strip empty strings from optional fields so they pass `.optional()`
 * validation cleanly and the backend payload doesn't carry blank values.
 *
 * RHF's default behaviour with text inputs is to track the value as `""`
 * even when the operator never typed anything. That collides with Zod's
 * `.optional()` semantics (which only admit `undefined`) on fields whose
 * regex / email / min-length checks would otherwise reject the empty
 * string. Converting here is simpler than threading `setValueAs` through
 * every register call.
 */
export function cleanShopInput(raw: ShopInput): ShopInput {
  const optionalKeys = [
    "description",
    "logo_url",
    "banner_url",
    "phone",
    "email",
    "whatsapp",
    "address_line2",
    "gst_number",
    "pan_number",
    "bank_account_number",
    "bank_ifsc",
    "bank_name",
    "bank_holder_name",
  ] as const

  const cleaned = { ...raw } as Record<string, unknown>
  for (const key of optionalKeys) {
    if (cleaned[key] === "" || cleaned[key] === null) {
      delete cleaned[key]
    }
  }
  return cleaned as ShopInput
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag input — serviceable_pincodes
// ─────────────────────────────────────────────────────────────────────────────

interface PincodeTagInputProps {
  value: string[]
  onChange: (next: string[]) => void
  inputId: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  placeholder?: string
}

/**
 * Pincode tag input — adds a chip per pincode entered. The input commits
 * on Enter or comma, dedupes against the current list, and removes a chip
 * on click. Backspace on an empty input pops the most recent chip so the
 * keyboard flow matches typical tag-input expectations.
 */
function PincodeTagInput({
  value,
  onChange,
  inputId,
  ariaInvalid,
  ariaDescribedBy,
  placeholder,
}: PincodeTagInputProps) {
  const [draft, setDraft] = useState("")

  function commit(next: string) {
    const trimmed = next.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) {
      setDraft("")
      return
    }
    onChange([...value, trimmed])
    setDraft("")
  }

  function remove(pincode: string) {
    onChange(value.filter((p) => p !== pincode))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commit(draft)
      return
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        "flex w-full flex-wrap gap-2 rounded-md border border-input bg-transparent p-2 text-sm shadow-sm focus-within:outline-none focus-within:ring-1 focus-within:ring-ring",
        ariaInvalid && "border-destructive",
      )}
    >
      {value.map((pincode) => (
        <span
          key={pincode}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
        >
          {pincode}
          <button
            type="button"
            onClick={() => remove(pincode)}
            aria-label={`Remove ${pincode}`}
            className="rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        placeholder={placeholder ?? "Add a pincode"}
        className="min-w-[8ch] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ShopForm — shared by create + edit
// ─────────────────────────────────────────────────────────────────────────────

export interface ShopFormProps {
  /** Distinguishes create vs edit. Controls slug auto-fill behaviour. */
  mode: "create" | "edit"
  /**
   * Initial form values. In `edit` mode this is typically the `Shop`
   * record from `useShop(id)`; in `create` mode this is left undefined
   * so the blank defaults are used.
   */
  defaultValues?: Partial<ShopInput>
  /**
   * Reactive 409-conflict map. Whenever a key flips on (e.g.
   * `branch_code`), the form calls `setError(field, …)` so the offending
   * input is highlighted while every other entered value is preserved
   * (Req 5.11). Pass an empty object when no conflicts exist.
   */
  serverFieldErrors?: ShopServerFieldErrors
  /**
   * Called with the validated, cleaned `ShopInput` on submit. The parent
   * owns the mutation; this form awaits the returned promise so the
   * `Submitting…` button label stays visible until the mutation
   * resolves.
   */
  onSubmit: (input: ShopInput) => Promise<void> | void
  /** Submit-button label (default `Create shop` / `Save changes`). */
  submitLabel?: string
  /** In-flight submit-button label. */
  submittingLabel?: string
  /** Cancel link target. Defaults to `/shops`. */
  cancelHref?: string
  /** Whether the parent's mutation is currently pending. */
  isPending?: boolean
}

export function ShopForm({
  mode,
  defaultValues,
  serverFieldErrors,
  onSubmit,
  submitLabel,
  submittingLabel,
  cancelHref = "/shops",
  isPending = false,
}: ShopFormProps) {
  const initialValues = useMemo(
    () => mergeDefaults(defaultValues),
    // The parent passes a stable reference (memoized) when streaming
    // shop data; recomputing on every render would reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultValues],
  )

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ShopInput>({
    // The Zod schema's `.superRefine` widens the inferred output type beyond
    // the input shape RHF tracks; cast through `Resolver<ShopInput>` so the
    // resolver type matches our form value type without type-erasing the
    // entire `useForm` call.
    resolver: zodResolver(shopSchema) as unknown as Resolver<ShopInput>,
    defaultValues: initialValues as ShopInput,
    mode: "onBlur",
  })

  // ─── Slug auto-generation from name (create mode only) ─────────────────
  // In `create` mode, debounce the name watcher and auto-fill the slug
  // until the user manually edits it (Req 5.4). In `edit` mode, the slug
  // is part of the shop's identity — never reshape it because the
  // operator typed a new display name.
  const watchedName = watch("name")
  const debouncedName = useDebounce(watchedName ?? "", 300)
  const slugManuallyEditedRef = useRef(false)
  const watchedSlug = watch("slug")
  if (mode === "create" && dirtyFields.slug && !slugManuallyEditedRef.current) {
    slugManuallyEditedRef.current = true
  }

  useEffect(() => {
    if (mode !== "create") return
    if (slugManuallyEditedRef.current) return
    const generated = slugify(debouncedName)
    if (generated && generated !== watchedSlug) {
      setValue("slug", generated, { shouldDirty: false, shouldValidate: false })
    }
    // We intentionally exclude `watchedSlug` from deps — including it would
    // cause a feedback loop with the `setValue` above. The dependency on
    // `debouncedName` is the only trigger we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, mode])

  // ─── Reactive server-field-error mapping (Req 5.11) ────────────────────
  // Whenever the parent's `serverFieldErrors` flip on, route them onto the
  // RHF instance so the offending input is highlighted. We don't clear
  // existing errors here — RHF already clears a server error when the
  // user re-edits the field (default `mode: "onBlur"` revalidates the
  // single field).
  useEffect(() => {
    if (!serverFieldErrors) return
    for (const field of SERVER_FIELD_PATHS) {
      const message = serverFieldErrors[field]
      if (message) {
        setError(field as ServerFieldPath, { type: "server", message })
      }
    }
  }, [serverFieldErrors, setError])

  // ─── Tag input wiring for serviceable_pincodes ─────────────────────────
  const watchedPincodes = watch("serviceable_pincodes") ?? []

  // ─── Submit ────────────────────────────────────────────────────────────
  async function handleFormSubmit(raw: ShopInput) {
    const body = cleanShopInput(raw)
    await onSubmit(body)
  }

  // Convenience render helpers ─────────────────────────────────────────────
  const renderError = (id: string, message?: string) =>
    message ? (
      <p id={id} className="text-xs text-destructive">
        {message}
      </p>
    ) : null

  const resolvedSubmitLabel =
    submitLabel ??
    (mode === "create" ? t("shops.create.submit") : t("shops.edit.submit"))
  const resolvedSubmittingLabel =
    submittingLabel ??
    (mode === "create"
      ? t("shops.create.submitting")
      : t("shops.edit.submitting"))

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* ── Identity ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("shops.create.section.identity")}</CardTitle>
          <CardDescription>
            Name, branch code, slug, description, and visual assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="name">{t("shops.create.field.name")}</Label>
            <Input
              id="name"
              autoComplete="organization"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
            {renderError("name-error", errors.name?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch_code">
              {t("shops.create.field.branchCode")}
            </Label>
            <Input
              id="branch_code"
              autoComplete="off"
              aria-invalid={!!errors.branch_code}
              aria-describedby={
                errors.branch_code ? "branch_code-error" : undefined
              }
              {...register("branch_code")}
            />
            {renderError("branch_code-error", errors.branch_code?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">{t("shops.create.field.slug")}</Label>
            <Input
              id="slug"
              autoComplete="off"
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? "slug-error" : undefined}
              {...register("slug")}
            />
            {renderError("slug-error", errors.slug?.message)}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="description">
              {t("shops.create.field.description")}
            </Label>
            <Textarea
              id="description"
              rows={3}
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? "description-error" : undefined
              }
              {...register("description")}
            />
            {renderError("description-error", errors.description?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="logo_url">{t("shops.create.field.logo")}</Label>
            <Input
              id="logo_url"
              type="url"
              placeholder="https://…"
              aria-invalid={!!errors.logo_url}
              aria-describedby={errors.logo_url ? "logo_url-error" : undefined}
              {...register("logo_url")}
            />
            {renderError("logo_url-error", errors.logo_url?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="banner_url">
              {t("shops.create.field.banner")}
            </Label>
            <Input
              id="banner_url"
              type="url"
              placeholder="https://…"
              aria-invalid={!!errors.banner_url}
              aria-describedby={
                errors.banner_url ? "banner_url-error" : undefined
              }
              {...register("banner_url")}
            />
            {renderError("banner_url-error", errors.banner_url?.message)}
          </div>
        </CardContent>
      </Card>

      {/* ── Contact ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("shops.create.section.contact")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("shops.create.field.phone")}</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              {...register("phone")}
            />
            {renderError("phone-error", errors.phone?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("shops.create.field.email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {renderError("email-error", errors.email?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">
              {t("shops.create.field.whatsapp")}
            </Label>
            <Input
              id="whatsapp"
              type="tel"
              autoComplete="tel"
              aria-invalid={!!errors.whatsapp}
              aria-describedby={errors.whatsapp ? "whatsapp-error" : undefined}
              {...register("whatsapp")}
            />
            {renderError("whatsapp-error", errors.whatsapp?.message)}
          </div>
        </CardContent>
      </Card>

      {/* ── Address ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("shops.create.section.address")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address_line1">
              {t("shops.create.field.line1")}
            </Label>
            <Input
              id="address_line1"
              autoComplete="address-line1"
              aria-invalid={!!errors.address_line1}
              aria-describedby={
                errors.address_line1 ? "address_line1-error" : undefined
              }
              {...register("address_line1")}
            />
            {renderError(
              "address_line1-error",
              errors.address_line1?.message,
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address_line2">
              {t("shops.create.field.line2")}
            </Label>
            <Input
              id="address_line2"
              autoComplete="address-line2"
              aria-invalid={!!errors.address_line2}
              aria-describedby={
                errors.address_line2 ? "address_line2-error" : undefined
              }
              {...register("address_line2")}
            />
            {renderError(
              "address_line2-error",
              errors.address_line2?.message,
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">{t("shops.create.field.city")}</Label>
            <Input
              id="city"
              autoComplete="address-level2"
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? "city-error" : undefined}
              {...register("city")}
            />
            {renderError("city-error", errors.city?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state">{t("shops.create.field.state")}</Label>
            <Input
              id="state"
              autoComplete="address-level1"
              aria-invalid={!!errors.state}
              aria-describedby={errors.state ? "state-error" : undefined}
              {...register("state")}
            />
            {renderError("state-error", errors.state?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pincode">
              {t("shops.create.field.pincode")}
            </Label>
            <Input
              id="pincode"
              inputMode="numeric"
              maxLength={6}
              autoComplete="postal-code"
              aria-invalid={!!errors.pincode}
              aria-describedby={errors.pincode ? "pincode-error" : undefined}
              {...register("pincode")}
            />
            {renderError("pincode-error", errors.pincode?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lat">{t("shops.create.field.lat")}</Label>
            <Input
              id="lat"
              type="number"
              step="0.000001"
              inputMode="decimal"
              aria-invalid={!!errors.lat}
              aria-describedby={errors.lat ? "lat-error" : undefined}
              {...register("lat", { valueAsNumber: true })}
            />
            {renderError("lat-error", errors.lat?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lng">{t("shops.create.field.lng")}</Label>
            <Input
              id="lng"
              type="number"
              step="0.000001"
              inputMode="decimal"
              aria-invalid={!!errors.lng}
              aria-describedby={errors.lng ? "lng-error" : undefined}
              {...register("lng", { valueAsNumber: true })}
            />
            {renderError("lng-error", errors.lng?.message)}
          </div>
        </CardContent>
      </Card>

      {/* ── Service area ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("shops.create.section.serviceArea")}</CardTitle>
          <CardDescription>
            Add each pincode the shop delivers to and the maximum delivery
            radius in kilometres.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="serviceable_pincodes">
              {t("shops.create.field.serviceablePincodes")}
            </Label>
            <PincodeTagInput
              inputId="serviceable_pincodes"
              value={watchedPincodes}
              onChange={(next) =>
                setValue("serviceable_pincodes", next, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              ariaInvalid={!!errors.serviceable_pincodes}
              ariaDescribedBy={
                errors.serviceable_pincodes
                  ? "serviceable_pincodes-error"
                  : undefined
              }
              placeholder="Type a pincode + Enter"
            />
            {renderError(
              "serviceable_pincodes-error",
              errors.serviceable_pincodes?.message ??
                (Array.isArray(errors.serviceable_pincodes)
                  ? errors.serviceable_pincodes.find((e) => e?.message)?.message
                  : undefined),
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delivery_radius_km">
              {t("shops.create.field.deliveryRadiusKm")}
            </Label>
            <Input
              id="delivery_radius_km"
              type="number"
              min="0"
              max="50"
              step="0.5"
              inputMode="decimal"
              aria-invalid={!!errors.delivery_radius_km}
              aria-describedby={
                errors.delivery_radius_km
                  ? "delivery_radius_km-error"
                  : undefined
              }
              {...register("delivery_radius_km", { valueAsNumber: true })}
            />
            {renderError(
              "delivery_radius_km-error",
              errors.delivery_radius_km?.message,
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Operating hours ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("shops.create.section.operatingHours")}</CardTitle>
          <CardDescription>
            Set open / close times for each day. Toggle a day to closed when
            the shop does not operate that day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEEKDAYS.map((day) => (
            <OperatingHoursRow
              key={day}
              day={day}
              register={register}
              watch={watch}
              setValue={setValue}
              error={errors.operating_hours?.[day]}
            />
          ))}
        </CardContent>
      </Card>

      {/* ── Commercial + bank ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("shops.create.section.commercial")}</CardTitle>
          <CardDescription>
            Commission, tax identifiers, and bank details for payouts. Bank
            details are optional but must be filled in together.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="commission_rate">
              {t("shops.create.field.commissionRate")}
            </Label>
            <Input
              id="commission_rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              inputMode="decimal"
              aria-invalid={!!errors.commission_rate}
              aria-describedby={
                errors.commission_rate ? "commission_rate-error" : undefined
              }
              {...register("commission_rate", { valueAsNumber: true })}
            />
            {renderError(
              "commission_rate-error",
              errors.commission_rate?.message,
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gst_number">
              {t("shops.create.field.gstNumber")}
            </Label>
            <Input
              id="gst_number"
              autoComplete="off"
              aria-invalid={!!errors.gst_number}
              aria-describedby={
                errors.gst_number ? "gst_number-error" : undefined
              }
              {...register("gst_number")}
            />
            {renderError("gst_number-error", errors.gst_number?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pan_number">
              {t("shops.create.field.panNumber")}
            </Label>
            <Input
              id="pan_number"
              autoComplete="off"
              aria-invalid={!!errors.pan_number}
              aria-describedby={
                errors.pan_number ? "pan_number-error" : undefined
              }
              {...register("pan_number")}
            />
            {renderError("pan_number-error", errors.pan_number?.message)}
          </div>

          <div className="hidden md:block" />

          <div className="space-y-1.5">
            <Label htmlFor="bank_account_number">
              {t("shops.create.field.accountNumber")}
            </Label>
            <Input
              id="bank_account_number"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={!!errors.bank_account_number}
              aria-describedby={
                errors.bank_account_number
                  ? "bank_account_number-error"
                  : undefined
              }
              {...register("bank_account_number")}
            />
            {renderError(
              "bank_account_number-error",
              errors.bank_account_number?.message,
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bank_ifsc">
              {t("shops.create.field.ifsc")}
            </Label>
            <Input
              id="bank_ifsc"
              autoComplete="off"
              aria-invalid={!!errors.bank_ifsc}
              aria-describedby={
                errors.bank_ifsc ? "bank_ifsc-error" : undefined
              }
              {...register("bank_ifsc")}
            />
            {renderError("bank_ifsc-error", errors.bank_ifsc?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bank_name">
              {t("shops.create.field.bankName")}
            </Label>
            <Input
              id="bank_name"
              autoComplete="off"
              aria-invalid={!!errors.bank_name}
              aria-describedby={
                errors.bank_name ? "bank_name-error" : undefined
              }
              {...register("bank_name")}
            />
            {renderError("bank_name-error", errors.bank_name?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bank_holder_name">
              {t("shops.create.field.holderName")}
            </Label>
            <Input
              id="bank_holder_name"
              autoComplete="off"
              aria-invalid={!!errors.bank_holder_name}
              aria-describedby={
                errors.bank_holder_name
                  ? "bank_holder_name-error"
                  : undefined
              }
              {...register("bank_holder_name")}
            />
            {renderError(
              "bank_holder_name-error",
              errors.bank_holder_name?.message,
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Submit row ────────────────────────────────────────────────── */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild type="button" variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isPending}
          className="min-w-[160px]"
        >
          {isSubmitting || isPending ? (
            <>
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              {resolvedSubmittingLabel}
            </>
          ) : (
            resolvedSubmitLabel
          )}
        </Button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OperatingHoursRow — one weekday row
// ─────────────────────────────────────────────────────────────────────────────

interface OperatingHoursRowProps {
  day: Weekday
  register: ReturnType<typeof useForm<ShopInput>>["register"]
  watch: ReturnType<typeof useForm<ShopInput>>["watch"]
  setValue: ReturnType<typeof useForm<ShopInput>>["setValue"]
  error?: {
    open?: { message?: string }
    close?: { message?: string }
    closed?: { message?: string }
  }
}

/**
 * One row of the operating-hours card. Keeps the open / close inputs and
 * the "closed" Switch in lockstep: when closed flips on, the time inputs
 * are visually disabled but their last-entered values are preserved so a
 * second toggle restores them. The Switch is wired through `setValue` so
 * RHF tracks the change without an uncontrolled-to-controlled warning.
 */
function OperatingHoursRow({
  day,
  register,
  watch,
  setValue,
  error,
}: OperatingHoursRowProps) {
  const closed = watch(`operating_hours.${day}.closed`)
  const closedSwitchId = useMemo(() => `operating_hours-${day}-closed`, [day])

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-end gap-3 rounded-md border p-3",
        "sm:grid-cols-[120px_1fr_1fr_auto]",
      )}
    >
      <div className="font-medium">{WEEKDAY_LABELS[day]}</div>

      <div className="space-y-1.5">
        <Label htmlFor={`operating_hours-${day}-open`} className="text-xs">
          Open
        </Label>
        <Input
          id={`operating_hours-${day}-open`}
          type="time"
          disabled={closed}
          aria-invalid={!!error?.open}
          {...register(`operating_hours.${day}.open` as const)}
        />
        {error?.open?.message ? (
          <p className="text-xs text-destructive">{error.open.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`operating_hours-${day}-close`} className="text-xs">
          Close
        </Label>
        <Input
          id={`operating_hours-${day}-close`}
          type="time"
          disabled={closed}
          aria-invalid={!!error?.close}
          {...register(`operating_hours.${day}.close` as const)}
        />
        {error?.close?.message ? (
          <p className="text-xs text-destructive">{error.close.message}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id={closedSwitchId}
          checked={!!closed}
          onCheckedChange={(checked) =>
            setValue(`operating_hours.${day}.closed`, checked, {
              shouldDirty: true,
            })
          }
          aria-label={`Mark ${WEEKDAY_LABELS[day]} as closed`}
        />
        <Label htmlFor={closedSwitchId} className="text-xs">
          Closed
        </Label>
      </div>
    </div>
  )
}
