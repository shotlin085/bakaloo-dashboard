"use client"

import React from "react"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import Link from "next/link"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  ChevronRight,
  Clock,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Store,
  Tag,
  Truck,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import { useDebounce } from "@/hooks/useDebounce"
import type { ShopServerFieldErrors } from "@/hooks/useShops"

import { t } from "@/lib/i18n"
import { shopSchema, type ShopInput } from "@/lib/shop-validations"
import { cn } from "@/lib/utils"
import type { Weekday } from "@/types"

// Dynamically import map (no SSR — Leaflet needs window)
const LocationMapPicker = dynamic(
  () => import("./location-map-picker").then((m) => m.LocationMapPicker),
  { ssr: false, loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50">
      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        Loading map…
      </div>
    </div>
  )},
)

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const WEEKDAYS: readonly Weekday[] = [
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
] as const

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
}

const SERVER_FIELD_PATHS = ["branch_code", "slug"] as const
type ServerFieldPath = (typeof SERVER_FIELD_PATHS)[number]

// Step definitions for progress sidebar
const STEPS = [
  { id: "identity",       label: "Basic Info",       icon: Store },
  { id: "contact",        label: "Contact",          icon: Phone },
  { id: "address",        label: "Address & Location", icon: MapPin },
  { id: "service",        label: "Service Area",     icon: Truck },
  { id: "hours",          label: "Operating Hours",  icon: Clock },
  { id: "commercial",     label: "Commercial & Bank", icon: Banknote },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Icons8 CDN helper — returns an img tag
// ─────────────────────────────────────────────────────────────────────────────
function Icons8({
  name, size = 20, className,
}: { name: string; size?: number; className?: string }) {
  return (
    <img
      src={`https://img.icons8.com/fluency/${size}/${name}.png`}
      alt={name}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function buildBlankDefaults(): Partial<ShopInput> {
  const defaultDay = { open: "09:00", close: "21:00", closed: false }
  return {
    name: "", branch_code: "", slug: "", description: "",
    logo_url: "", banner_url: "", phone: "", email: "", whatsapp: "",
    address_line1: "", address_line2: "", city: "", state: "", pincode: "",
    serviceable_pincodes: [],
    operating_hours: {
      monday: { ...defaultDay }, tuesday: { ...defaultDay },
      wednesday: { ...defaultDay }, thursday: { ...defaultDay },
      friday: { ...defaultDay }, saturday: { ...defaultDay },
      sunday: { ...defaultDay },
    },
    gst_number: "", pan_number: "", bank_account_number: "",
    bank_ifsc: "", bank_name: "", bank_holder_name: "",
  }
}

function mergeDefaults(overrides?: Partial<ShopInput>): Partial<ShopInput> {
  const blank = buildBlankDefaults()
  if (!overrides) return blank
  const merged: Record<string, unknown> = { ...blank }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined) continue
    merged[key] = value
  }
  return merged as Partial<ShopInput>
}

export function cleanShopInput(raw: ShopInput): ShopInput {
  const optionalKeys = [
    "description", "logo_url", "banner_url", "phone", "email", "whatsapp",
    "address_line2", "gst_number", "pan_number", "bank_account_number",
    "bank_ifsc", "bank_name", "bank_holder_name",
  ] as const
  const cleaned = { ...raw } as Record<string, unknown>
  for (const key of optionalKeys) {
    if (cleaned[key] === "" || cleaned[key] === null) delete cleaned[key]
  }
  return cleaned as ShopInput
}

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper — numbered step with colored accent
// ─────────────────────────────────────────────────────────────────────────────

interface SectionProps {
  id: string
  step: number
  icon: React.ReactNode
  title: string
  subtitle?: string
  accent?: string  // tailwind bg class for the step badge
  children: React.ReactNode
}

function Section({ id, step, icon, title, subtitle, accent = "bg-violet-600", children }: SectionProps) {
  return (
    <div
      id={id}
      className="scroll-mt-8 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm"
    >
      {/* Section header */}
      <div className="flex items-center gap-4 border-b border-border/50 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm",
          accent,
        )}>
          {step}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border/40">
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      {/* Section content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Field wrapper
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label, htmlFor, required, error, hint, children,
  className,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <span className="inline-block h-1 w-1 rounded-full bg-red-500" />
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pincode tag input
// ─────────────────────────────────────────────────────────────────────────────

function PincodeTagInput({
  value, onChange, inputId, ariaInvalid, placeholder,
}: {
  value: string[]
  onChange: (next: string[]) => void
  inputId: string
  ariaInvalid?: boolean
  placeholder?: string
}) {
  const [draft, setDraft] = useState("")

  function commit(next: string) {
    const trimmed = next.trim()
    if (!trimmed || value.includes(trimmed)) { setDraft(""); return }
    onChange([...value, trimmed])
    setDraft("")
  }

  function remove(pincode: string) {
    onChange(value.filter((p) => p !== pincode))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(draft); return }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className={cn(
      "flex min-h-[42px] w-full flex-wrap gap-1.5 rounded-xl border border-input bg-white p-2 text-sm shadow-sm transition focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-400",
      ariaInvalid && "border-red-400",
    )}>
      {value.map((pincode) => (
        <span key={pincode} className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
          <Tag className="h-3 w-3" />
          {pincode}
          <button type="button" onClick={() => remove(pincode)}
            className="ml-0.5 rounded text-violet-400 hover:text-violet-700 focus-visible:outline-none">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={inputId} type="text" inputMode="numeric" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown} onBlur={() => commit(draft)}
        placeholder={value.length === 0 ? (placeholder ?? "Type pincode + Enter") : ""}
        className="min-w-[10ch] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styled Input wrapper — forwardRef so RHF register() works without warnings
// ─────────────────────────────────────────────────────────────────────────────

const StyledInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof Input>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    {...props}
    className={cn(
      "rounded-xl border-border/60 bg-white shadow-sm transition placeholder:text-slate-300 focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-500/20",
      className,
    )}
  />
))
StyledInput.displayName = "StyledInput"

const StyledTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<typeof Textarea>
>(({ className, ...props }, ref) => (
  <Textarea
    ref={ref}
    {...props}
    className={cn(
      "rounded-xl border-border/60 bg-white shadow-sm transition placeholder:text-slate-300 focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-500/20",
      className,
    )}
  />
))
StyledTextarea.displayName = "StyledTextarea"

// ─────────────────────────────────────────────────────────────────────────────
// ShopForm props
// ─────────────────────────────────────────────────────────────────────────────

export interface ShopFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<ShopInput>
  serverFieldErrors?: ShopServerFieldErrors
  onSubmit: (input: ShopInput) => Promise<void> | void
  submitLabel?: string
  submittingLabel?: string
  cancelHref?: string
  isPending?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ShopForm
// ─────────────────────────────────────────────────────────────────────────────

export function ShopForm({
  mode, defaultValues, serverFieldErrors, onSubmit,
  submitLabel, submittingLabel, cancelHref = "/shops", isPending = false,
}: ShopFormProps) {
  const initialValues = useMemo(() => mergeDefaults(defaultValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultValues])

  const {
    register, handleSubmit, setValue, setError, watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ShopInput>({
    resolver: zodResolver(shopSchema) as unknown as Resolver<ShopInput>,
    defaultValues: initialValues as ShopInput,
    mode: "onBlur",
  })

  // Slug auto-fill from name (create only)
  const watchedName = watch("name")
  const debouncedName = useDebounce(watchedName ?? "", 300)
  const slugManuallyEditedRef = useRef(false)
  const watchedSlug = watch("slug")
  if (mode === "create" && dirtyFields.slug && !slugManuallyEditedRef.current) {
    slugManuallyEditedRef.current = true
  }
  useEffect(() => {
    if (mode !== "create" || slugManuallyEditedRef.current) return
    const generated = slugify(debouncedName)
    if (generated && generated !== watchedSlug) {
      setValue("slug", generated, { shouldDirty: false, shouldValidate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, mode])

  // Server field errors
  useEffect(() => {
    if (!serverFieldErrors) return
    for (const field of SERVER_FIELD_PATHS) {
      const message = serverFieldErrors[field]
      if (message) setError(field as ServerFieldPath, { type: "server", message })
    }
  }, [serverFieldErrors, setError])

  const watchedPincodes = watch("serviceable_pincodes") ?? []
  const rawLat = watch("lat")
  const rawLng = watch("lng")
  const watchedLat = (typeof rawLat === "number" && !isNaN(rawLat)) ? rawLat : undefined
  const watchedLng = (typeof rawLng === "number" && !isNaN(rawLng)) ? rawLng : undefined
  const watchedStoreName = watch("name")

  async function handleFormSubmit(raw: ShopInput) {
    await onSubmit(cleanShopInput(raw))
  }

  const resolvedSubmitLabel = submitLabel ?? (mode === "create" ? t("shops.create.submit") : t("shops.edit.submit"))
  const resolvedSubmittingLabel = submittingLabel ?? (mode === "create" ? t("shops.create.submitting") : t("shops.edit.submitting"))

  // Completion tracking for sidebar
  const completedSteps = {
    identity: !!(watchedName && watch("branch_code") && watch("slug")),
    contact: !!(watch("phone") || watch("email")),
    address: !!(watch("address_line1") && watch("city") && watch("pincode")),
    service: watchedPincodes.length > 0 && !!(watch("delivery_radius_km")),
    hours: true,
    commercial: !!(watch("commission_rate") !== undefined),
  }
  const completedCount = Object.values(completedSteps).filter(Boolean).length

  return (
    <div className="flex gap-6">
      {/* ── Main form column ──────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="min-w-0 flex-1 space-y-5" noValidate>

        {/* ─── 1. Basic Information ──────────────────────────────────── */}
        <Section
          id="identity" step={1} accent="bg-violet-600"
          icon={<Icons8 name="shop" size={20} />}
          title="Basic Information"
          subtitle="Name, branch code, slug & description"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Store Name" htmlFor="name" required error={errors.name?.message}
              hint="This is the public-facing name of your store" className="md:col-span-2">
              <StyledInput id="name" autoComplete="organization"
                placeholder="e.g. GreenMart Koramangala"
                aria-invalid={!!errors.name}
                {...register("name")} />
            </Field>

            <Field label="Branch Code" htmlFor="branch_code" required error={errors.branch_code?.message}
              hint="Uppercase letters, digits and hyphens only">
              <StyledInput id="branch_code" autoComplete="off"
                placeholder="e.g. BLR001"
                aria-invalid={!!errors.branch_code}
                {...register("branch_code")} />
            </Field>

            <Field label="Slug / URL handle" htmlFor="slug" required error={errors.slug?.message}
              hint="Auto-generated from name — lowercase & hyphens only">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">/stores/</span>
                <StyledInput id="slug" autoComplete="off"
                  placeholder="greenmart-koramangala"
                  aria-invalid={!!errors.slug}
                  className="pl-16"
                  {...register("slug")} />
              </div>
            </Field>

            <Field label="Description" htmlFor="description" error={errors.description?.message}
              className="md:col-span-2">
              <StyledTextarea id="description" rows={3}
                placeholder="Briefly describe your store — this shows on the customer app"
                aria-invalid={!!errors.description}
                {...register("description")} />
            </Field>

            <Field label="Logo URL" htmlFor="logo_url" error={errors.logo_url?.message}>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput id="logo_url" type="url" placeholder="https://cdn.example.com/logo.png"
                  className="pl-9"
                  aria-invalid={!!errors.logo_url}
                  {...register("logo_url")} />
              </div>
            </Field>

            <Field label="Banner URL" htmlFor="banner_url" error={errors.banner_url?.message}>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput id="banner_url" type="url" placeholder="https://cdn.example.com/banner.png"
                  className="pl-9"
                  aria-invalid={!!errors.banner_url}
                  {...register("banner_url")} />
              </div>
            </Field>
          </div>
        </Section>

        {/* ─── 2. Contact ───────────────────────────────────────────── */}
        <Section
          id="contact" step={2} accent="bg-blue-600"
          icon={<Icons8 name="phone" size={20} />}
          title="Contact Details"
          subtitle="Phone, email and WhatsApp for the store"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Phone Number" htmlFor="phone" error={errors.phone?.message}>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput id="phone" type="tel" autoComplete="tel"
                  placeholder="+919876543210"
                  className="pl-9"
                  aria-invalid={!!errors.phone}
                  {...register("phone")} />
              </div>
            </Field>

            <Field label="Email Address" htmlFor="email" error={errors.email?.message}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput id="email" type="email" autoComplete="email"
                  placeholder="store@example.com"
                  className="pl-9"
                  aria-invalid={!!errors.email}
                  {...register("email")} />
              </div>
            </Field>

            <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp?.message}>
              <div className="relative">
                <img src="https://img.icons8.com/fluency/16/whatsapp.png" alt="wa"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                <StyledInput id="whatsapp" type="tel" autoComplete="tel"
                  placeholder="+919876543210"
                  className="pl-9"
                  aria-invalid={!!errors.whatsapp}
                  {...register("whatsapp")} />
              </div>
            </Field>
          </div>
        </Section>

        {/* ─── 3. Address & Location ────────────────────────────────── */}
        <Section
          id="address" step={3} accent="bg-emerald-600"
          icon={<Icons8 name="address" size={20} />}
          title="Address & Location"
          subtitle="Full address + pin exact location on the map"
        >
          <div className="space-y-5">
            {/* Address fields grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Address Line 1" htmlFor="address_line1" required
                error={errors.address_line1?.message} className="md:col-span-2">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <StyledInput id="address_line1" autoComplete="address-line1"
                    placeholder="123, 5th Main Road"
                    className="pl-9"
                    aria-invalid={!!errors.address_line1}
                    {...register("address_line1")} />
                </div>
              </Field>

              <Field label="Address Line 2" htmlFor="address_line2"
                error={errors.address_line2?.message} className="md:col-span-2">
                <StyledInput id="address_line2" autoComplete="address-line2"
                  placeholder="Landmark, area (optional)"
                  aria-invalid={!!errors.address_line2}
                  {...register("address_line2")} />
              </Field>

              <Field label="City" htmlFor="city" required error={errors.city?.message}>
                <StyledInput id="city" autoComplete="address-level2"
                  placeholder="Bengaluru"
                  aria-invalid={!!errors.city}
                  {...register("city")} />
              </Field>

              <Field label="State" htmlFor="state" required error={errors.state?.message}>
                <StyledInput id="state" autoComplete="address-level1"
                  placeholder="Karnataka"
                  aria-invalid={!!errors.state}
                  {...register("state")} />
              </Field>

              <Field label="PIN Code" htmlFor="pincode" required error={errors.pincode?.message}>
                <StyledInput id="pincode" inputMode="numeric" maxLength={6}
                  autoComplete="postal-code"
                  placeholder="560034"
                  aria-invalid={!!errors.pincode}
                  {...register("pincode")} />
              </Field>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                Pin Location on Map
              </span>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            {/* Map picker */}
            <LocationMapPicker
              lat={watchedLat}
              lng={watchedLng}
              onChange={(lat, lng) => {
                setValue("lat", lat, { shouldDirty: true, shouldValidate: true })
                setValue("lng", lng, { shouldDirty: true, shouldValidate: true })
              }}
            />

            {/* Lat/Lng manual inputs below map */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude" htmlFor="lat" required error={errors.lat?.message}
                hint="Auto-filled from map pin">
                <StyledInput id="lat" type="number" step="0.000001" inputMode="decimal"
                  placeholder="12.935573"
                  aria-invalid={!!errors.lat}
                  {...register("lat", { valueAsNumber: true })} />
              </Field>
              <Field label="Longitude" htmlFor="lng" required error={errors.lng?.message}
                hint="Auto-filled from map pin">
                <StyledInput id="lng" type="number" step="0.000001" inputMode="decimal"
                  placeholder="77.624066"
                  aria-invalid={!!errors.lng}
                  {...register("lng", { valueAsNumber: true })} />
              </Field>
            </div>
          </div>
        </Section>

        {/* ─── 4. Service Area ──────────────────────────────────────── */}
        <Section
          id="service" step={4} accent="bg-orange-600"
          icon={<Icons8 name="delivery" size={20} />}
          title="Service Area"
          subtitle="Serviceable pincodes and delivery radius"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Serviceable Pincodes" htmlFor="serviceable_pincodes" required
              error={errors.serviceable_pincodes?.message ??
                (Array.isArray(errors.serviceable_pincodes)
                  ? errors.serviceable_pincodes.find((e) => e?.message)?.message
                  : undefined)}
              hint="Type a 6-digit pincode and press Enter or comma"
              className="md:col-span-2">
              <PincodeTagInput
                inputId="serviceable_pincodes"
                value={watchedPincodes}
                onChange={(next) =>
                  setValue("serviceable_pincodes", next, { shouldDirty: true, shouldValidate: true })
                }
                ariaInvalid={!!errors.serviceable_pincodes}
                placeholder="Type pincode + Enter"
              />
            </Field>

            <Field label="Delivery Radius (km)" htmlFor="delivery_radius_km" required
              error={errors.delivery_radius_km?.message}
              hint="Max 50 km — used for shop allocation to customers">
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput id="delivery_radius_km" type="number" min="0" max="50" step="0.5"
                  inputMode="decimal" placeholder="5"
                  className="pl-9"
                  aria-invalid={!!errors.delivery_radius_km}
                  {...register("delivery_radius_km", { valueAsNumber: true })} />
              </div>
            </Field>
          </div>
        </Section>

        {/* ─── 5. Operating Hours ───────────────────────────────────── */}
        <Section
          id="hours" step={5} accent="bg-cyan-600"
          icon={<Icons8 name="clock" size={20} />}
          title="Operating Hours"
          subtitle="Set open and close times for each day"
        >
          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-[140px_1fr_1fr_auto] gap-3 px-3 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Day</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Opens at</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Closes at</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Closed</span>
            </div>
            {WEEKDAYS.map((day) => (
              <OperatingHoursRow key={day} day={day}
                register={register} watch={watch} setValue={setValue}
                error={errors.operating_hours?.[day]} />
            ))}
          </div>
        </Section>

        {/* ─── 6. Commercial & Bank ─────────────────────────────────── */}
        <Section
          id="commercial" step={6} accent="bg-rose-600"
          icon={<Icons8 name="wallet" size={20} />}
          title="Commercial & Banking"
          subtitle="Commission, GST/PAN and bank account for payouts"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Commission */}
            <Field label="Commission Rate (%)" htmlFor="commission_rate" required
              error={errors.commission_rate?.message}>
              <div className="relative">
                <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput id="commission_rate" type="number" min="0" max="100" step="0.1"
                  inputMode="decimal" placeholder="10.0"
                  className="pl-9"
                  aria-invalid={!!errors.commission_rate}
                  {...register("commission_rate", { valueAsNumber: true })} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">%</span>
              </div>
            </Field>

            {/* GST */}
            <Field label="GSTIN" htmlFor="gst_number" error={errors.gst_number?.message}
              hint="15-character GST number">
              <div className="relative">
                <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput id="gst_number" autoComplete="off" placeholder="22AAAAA0000A1Z5"
                  className="pl-9 font-mono tracking-wider uppercase"
                  aria-invalid={!!errors.gst_number}
                  {...register("gst_number")} />
              </div>
            </Field>

            {/* PAN */}
            <Field label="PAN Number" htmlFor="pan_number" error={errors.pan_number?.message}
              hint="10-character PAN">
              <div className="relative">
                <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <StyledInput id="pan_number" autoComplete="off" placeholder="AAAAA0000A"
                  className="pl-9 font-mono tracking-wider uppercase"
                  aria-invalid={!!errors.pan_number}
                  {...register("pan_number")} />
              </div>
            </Field>

            <div className="hidden md:block" />

            {/* Divider */}
            <div className="md:col-span-2 flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-rose-500" />
                Bank Account for Payouts
              </span>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            <Field label="Account Number" htmlFor="bank_account_number"
              error={errors.bank_account_number?.message}>
              <StyledInput id="bank_account_number" inputMode="numeric" autoComplete="off"
                placeholder="000123456789"
                className="font-mono tracking-wider"
                aria-invalid={!!errors.bank_account_number}
                {...register("bank_account_number")} />
            </Field>

            <Field label="IFSC Code" htmlFor="bank_ifsc" error={errors.bank_ifsc?.message}
              hint="Format: ABCD0123456">
              <StyledInput id="bank_ifsc" autoComplete="off" placeholder="HDFC0001234"
                className="font-mono tracking-wider uppercase"
                aria-invalid={!!errors.bank_ifsc}
                {...register("bank_ifsc")} />
            </Field>

            <Field label="Bank Name" htmlFor="bank_name" error={errors.bank_name?.message}>
              <StyledInput id="bank_name" autoComplete="off" placeholder="HDFC Bank"
                aria-invalid={!!errors.bank_name}
                {...register("bank_name")} />
            </Field>

            <Field label="Account Holder Name" htmlFor="bank_holder_name"
              error={errors.bank_holder_name?.message}>
              <StyledInput id="bank_holder_name" autoComplete="off"
                placeholder="GreenMart Retail Pvt. Ltd."
                aria-invalid={!!errors.bank_holder_name}
                {...register("bank_holder_name")} />
            </Field>
          </div>
        </Section>

        {/* ── Submit row ────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild type="button" variant="outline"
            className="rounded-xl border-border/60 h-11">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || isPending}
            className="h-11 min-w-[180px] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold shadow-md shadow-violet-200 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] transition-all">
            {isSubmitting || isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {resolvedSubmittingLabel}
              </>
            ) : (
              resolvedSubmitLabel
            )}
          </Button>
        </div>
      </form>

      {/* ── Sticky progress sidebar ─────────────────────────────────── */}
      <div className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20 space-y-4">
          {/* Store preview card */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-200">Store Preview</p>
              <p className="mt-0.5 truncate text-sm font-bold text-white">
                {watchedStoreName || "New Store"}
              </p>
            </div>
            <div className="p-3 space-y-2">
              {watch("city") && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{[watch("city"), watch("state"), watch("pincode")].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {watchedPincodes.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Truck className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span>Delivers to {watchedPincodes.length} pincode{watchedPincodes.length > 1 ? "s" : ""}</span>
                </div>
              )}
              {watchedLat && watchedLng && !isNaN(watchedLat) && !isNaN(watchedLng) && watchedLat !== 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-mono">{watchedLat.toFixed(4)}, {watchedLng.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress checklist */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
            <div className="border-b border-border/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Setup Progress</p>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                  {completedCount}/6
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${(completedCount / 6) * 100}%` }}
                />
              </div>
            </div>
            <div className="p-3 space-y-1">
              {STEPS.map(({ id, label, icon: StepIcon }) => {
                const done = completedSteps[id as keyof typeof completedSteps]
                return (
                  <button
                    key={id} type="button"
                    onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-left transition hover:bg-slate-50"
                  >
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                      done ? "bg-emerald-100" : "bg-slate-100",
                    )}>
                      {done
                        ? <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        : <StepIcon className="h-2.5 w-2.5 text-slate-400" />
                      }
                    </div>
                    <span className={done ? "text-slate-700 font-medium" : "text-slate-400"}>
                      {label}
                    </span>
                    {!done && <ChevronRight className="ml-auto h-3 w-3 text-slate-300" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OperatingHoursRow
// ─────────────────────────────────────────────────────────────────────────────

interface OperatingHoursRowProps {
  day: Weekday
  register: ReturnType<typeof useForm<ShopInput>>["register"]
  watch: ReturnType<typeof useForm<ShopInput>>["watch"]
  setValue: ReturnType<typeof useForm<ShopInput>>["setValue"]
  error?: { open?: { message?: string }; close?: { message?: string } }
}

function OperatingHoursRow({ day, register, watch, setValue, error }: OperatingHoursRowProps) {
  const closed = watch(`operating_hours.${day}.closed`)
  const closedId = `operating_hours-${day}-closed`

  return (
    <div className={cn(
      "grid grid-cols-[140px_1fr_1fr_auto] items-center gap-3 rounded-xl border border-border/50 bg-slate-50/50 px-3 py-2.5 transition",
      closed && "opacity-60",
    )}>
      <span className="text-sm font-medium text-slate-700">{WEEKDAY_LABELS[day]}</span>

      <div className="space-y-1">
        <Input
          id={`operating_hours-${day}-open`} type="time" disabled={closed}
          className="h-9 rounded-lg border-border/60 bg-white text-xs font-mono"
          aria-invalid={!!error?.open}
          {...register(`operating_hours.${day}.open` as const)} />
        {error?.open?.message && <p className="text-xs text-red-500">{error.open.message}</p>}
      </div>

      <div className="space-y-1">
        <Input
          id={`operating_hours-${day}-close`} type="time" disabled={closed}
          className="h-9 rounded-lg border-border/60 bg-white text-xs font-mono"
          aria-invalid={!!error?.close}
          {...register(`operating_hours.${day}.close` as const)} />
        {error?.close?.message && <p className="text-xs text-red-500">{error.close.message}</p>}
      </div>

      <div className="flex items-center gap-1.5">
        <Switch id={closedId} checked={!!closed}
          onCheckedChange={(checked) =>
            setValue(`operating_hours.${day}.closed`, checked, { shouldDirty: true })
          }
          aria-label={`Mark ${WEEKDAY_LABELS[day]} as closed`}
          className="data-[state=checked]:bg-red-500" />
        <Label htmlFor={closedId} className="cursor-pointer text-[11px] text-slate-500">
          Closed
        </Label>
      </div>
    </div>
  )
}
