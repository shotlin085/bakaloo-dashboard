"use client"

/**
 * Shared field primitives for the shop-product Add and Edit dialogs (tasks
 * 8.5 / 8.6).
 *
 * Both dialogs render the same set of numeric and toggle inputs against
 * the canonical `shopProductSchema` (`lib/shop-validations.ts`), so the
 * primitives live here as a single source of truth rather than being
 * duplicated. Each component is intentionally minimal — no business
 * logic, no labels hard-coded — so the host dialog owns copy, ids, and
 * validation wiring.
 *
 * Variants:
 *   - `NumberField`        — required numeric input registered through
 *                            RHF's `register("name", { valueAsNumber: true })`.
 *                            `forwardRef` so RHF's ref attaches to the
 *                            underlying `<input>` for focus-on-error.
 *   - `NullableNumberField` — nullable numeric input wired via
 *                            `Controller`. Empty string ⇒ `null`; non-empty
 *                            ⇒ `Number(...)`. Decouples from `register`
 *                            so empty inputs do not coerce to `NaN` and
 *                            falsely trip schema validation.
 *   - `ToggleRow`          — Switch + label row for boolean fields.
 *
 * Requirements: 7.4, 7.5, 7.9, 12.5
 */

import { forwardRef } from "react"
import { Controller, type Control, type FieldPath } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import type { ShopProductInput } from "@/lib/shop-validations"

// ─────────────────────────────────────────────────────────────────────────────
// NumberField — required numeric input (RHF `register`)
// ─────────────────────────────────────────────────────────────────────────────

export interface NumberFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string
  label: string
  error?: string
}

/**
 * Required numeric input. Renders a label, the input, and any RHF error
 * message. Caller registers the field via
 * `...register("name", { valueAsNumber: true })` so RHF coerces the
 * string value to a number (or `NaN` for empty input, which the schema
 * rejects with a "required"-shaped error).
 *
 * Wrapped in `forwardRef` so RHF's `register` can attach its ref to the
 * underlying `<input>` element — needed for focus management on
 * validation failure.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  function NumberField({ id, label, error, required, ...rest }, ref) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>
          {label}
          {required ? (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </Label>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          ref={ref}
          {...rest}
        />
        {error ? (
          <p
            id={`${id}-error`}
            className="text-xs text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// NullableNumberField — nullable numeric input (RHF `Controller`)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subset of `ShopProductInput` paths that are typed as `number | null`.
 * Constraining `NullableNumberField` to these slots prevents callers from
 * accidentally pointing it at a required-numeric field (which would
 * silently persist `null` and fail schema validation).
 */
export type NullableNumberFieldName = Extract<
  FieldPath<ShopProductInput>,
  "sale_price" | "cost_price"
>

export interface NullableNumberFieldProps {
  id: string
  label: string
  step?: string
  min?: number
  max?: number
  error?: string
  control: Control<ShopProductInput>
  name: NullableNumberFieldName
}

/**
 * Nullable numeric input wired via RHF `Controller`. Empty input is
 * persisted as `null` (matching the schema's `.nullable()` slot); a
 * non-empty value is coerced to `Number`. Decoupling this from `register`
 * avoids the `valueAsNumber → NaN` pitfall on optional fields where NaN
 * would fail validation even though the operator intentionally left the
 * field blank.
 */
export function NullableNumberField({
  id,
  label,
  step,
  min,
  max,
  error,
  control,
  name,
}: NullableNumberFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const display =
          field.value === null || field.value === undefined
            ? ""
            : String(field.value)
        return (
          <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input
              id={id}
              type="number"
              inputMode="decimal"
              step={step}
              min={min}
              max={max}
              value={display}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "") {
                  field.onChange(null)
                  return
                }
                const n = Number(raw)
                field.onChange(Number.isNaN(n) ? null : n)
              }}
              onBlur={field.onBlur}
              ref={field.ref}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? `${id}-error` : undefined}
            />
            {error ? (
              <p
                id={`${id}-error`}
                className="text-xs text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
        )
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ToggleRow — Switch + label row used for boolean fields
// ─────────────────────────────────────────────────────────────────────────────

export interface ToggleRowProps {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (next: boolean) => void
  testId?: string
}

/** Switch + label row used for the two boolean fields. */
export function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
  testId,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        data-testid={testId}
      />
    </div>
  )
}
