"use client"

/**
 * Invite / edit staff dialog (`<InviteStaffDialog />`) — task 6.4.
 *
 * One Radix `Dialog` reused for both invite (`mode === "invite"`) and edit
 * (`mode === "edit"`) flows. The two modes differ only in:
 *   - the dialog title + submit button label;
 *   - the user picker: editable in invite mode, read-only in edit mode
 *     because the backend `PUT /shops/[shopId]/staff/[staffId]` endpoint
 *     does not allow re-pointing a staff record at a different user;
 *   - the mutation called on submit (`useInviteShopStaff` vs
 *     `useUpdateShopStaff`).
 *
 * The form is driven by `react-hook-form` + the canonical
 * `shopStaffInviteSchema` zod resolver (single source of truth — see
 * `lib/shop-validations.ts` and design.md §7).
 *
 * Step layout (per the task brief):
 *   1. **User picker** — typeahead `Combobox` over `searchUsers(q)` debounced
 *      at 300 ms. The selected user's `id` is the only field posted; the
 *      list of returned users is held locally so we can render the picked
 *      user's display name without a second fetch.
 *   2. **Role select** — Radix `Select` with the four shop roles. Selecting
 *      a role pre-fills `ROLE_DEFAULTS[role]` into the permissions field
 *      while leaving any subsequent per-token override intact.
 *   3. **Permission group toggles** — the dialog delegates to the
 *      dedicated `<PermissionGroupToggles />` accordion (task 6.5). It
 *      groups every `PermissionToken` into the five sections defined by
 *      design.md §7 (Orders, Products, Financials, Transactions,
 *      Settings) with a master switch per section. The dialog only owns
 *      the `permissions: PermissionToken[]` form value — wiring is a
 *      one-prop pass-through.
 *
 * Error handling (Req 6.6, 6.10):
 *   - **409 already-assigned** → `extractStaffFieldErrors` returns
 *     `{ userId: "<message>" }`; the dialog calls `setError("userId", …)`
 *     and stays open with every other entered value intact.
 *   - **422 cap-reached** → handled by `useInviteShopStaff` itself (it
 *     surfaces the destructive toast). The dialog stays open; we do *not*
 *     reset the form so the operator can pivot without re-entering values
 *     (Req 6.10).
 *
 * Responsiveness (Req 12.5):
 *   - The dialog uses a single column at every breakpoint and a
 *     `max-h-[90vh] overflow-y-auto` body so the form is scrollable when
 *     the viewport is short. Tested at 360 × 640.
 *
 * Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.10, 12.5
 */

import { useEffect, useRef, useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import { useDebounce } from "@/hooks/useDebounce"
import {
  extractStaffFieldErrors,
  useInviteShopStaff,
  useUpdateShopStaff,
} from "@/hooks/useShopStaff"
import { t } from "@/lib/i18n"
import { ROLE_DEFAULTS, type PermissionToken } from "@/lib/permissions"
import {
  shopStaffInviteSchema,
  type ShopStaffInviteInput,
} from "@/lib/shop-validations"
import { shopStaffService } from "@/services/shop-staff.service"
import type { ShopStaff, ShopStaffRole, User } from "@/types"
import { cn } from "@/lib/utils"

import { PermissionGroupToggles } from "./permission-group-toggles"

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

export interface InviteStaffDialogProps {
  shopId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `"invite"` mounts a fresh form; `"edit"` prefills from `initialStaff`. */
  mode: "invite" | "edit"
  /** Required when `mode === "edit"`. Ignored for `"invite"`. */
  initialStaff?: ShopStaff
}

/** Roles in the Select, in the order they appear in the dropdown. */
const ROLE_OPTIONS: ShopStaffRole[] = [
  "SHOP_ADMIN",
  "SHOP_MANAGER",
  "SHOP_STAFF",
  "SHOP_VIEWER",
]

// ─────────────────────────────────────────────────────────────────────────────
// User picker (typeahead Combobox)
// ─────────────────────────────────────────────────────────────────────────────

interface UserPickerProps {
  /** Currently selected user; `null` means no selection yet. */
  value: User | null
  onChange: (user: User) => void
  /** Disabled in edit mode — the staff record's `user_id` is immutable. */
  disabled?: boolean
  /** RHF/server-side error for the `userId` field. */
  errorMessage?: string
}

/**
 * Typeahead user picker. Wraps the search input in a Radix `Popover` so
 * the result list closes on outside-click and Escape, and presses a 300 ms
 * debounce on the query before issuing `searchUsers`. The trigger displays
 * the selected user's name + email to confirm the picked identity.
 */
function UserPicker({
  value,
  onChange,
  disabled,
  errorMessage,
}: UserPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 300)

  // Disable the query when the trimmed input is empty so we never
  // round-trip a no-op request (the service short-circuits to `[]`
  // anyway, but `enabled` keeps the cache key clean).
  const trimmed = debouncedQuery.trim()
  const usersQuery = useQuery({
    queryKey: ["users-search", trimmed],
    queryFn: () => shopStaffService.searchUsers(trimmed),
    enabled: open && trimmed.length > 0,
    staleTime: 30_000,
  })

  const triggerLabel = value
    ? value.name?.trim() || value.email || value.phone || value.id
    : t("shopStaff.invite.userPicker.placeholder")

  const triggerHint = value
    ? [value.email, value.phone].filter(Boolean).join(" · ") || null
    : null

  return (
    <div className="space-y-1.5">
      <Label htmlFor="staff-user-picker">
        {t("shopStaff.invite.userPicker.label")}
      </Label>
      <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger asChild>
          <Button
            id="staff-user-picker"
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={Boolean(errorMessage) || undefined}
            disabled={disabled}
            data-testid="staff-user-picker-trigger"
            className={cn(
              "w-full justify-between gap-2 font-normal",
              !value && "text-muted-foreground",
              errorMessage && "border-destructive",
            )}
          >
            <span className="flex min-w-0 flex-col items-start text-left">
              <span className="truncate text-sm">{triggerLabel}</span>
              {triggerHint ? (
                <span className="truncate text-xs text-muted-foreground">
                  {triggerHint}
                </span>
              ) : null}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("shopStaff.invite.userPicker.placeholder")}
              aria-label={t("shopStaff.invite.userPicker.placeholder")}
              data-testid="staff-user-picker-search"
              className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
            />
          </div>
          <ScrollArea className="max-h-[260px]">
            <ul role="listbox" aria-label="Users" className="p-1">
              {trimmed.length === 0 ? (
                <li className="px-2 py-2 text-xs text-muted-foreground">
                  {t("shopStaff.invite.userPicker.placeholder")}
                </li>
              ) : usersQuery.isLoading ? (
                <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                  <Loader2
                    className="h-3 w-3 animate-spin"
                    aria-hidden="true"
                  />
                  Searching…
                </li>
              ) : usersQuery.isError ? (
                <li className="px-2 py-2 text-xs text-destructive">
                  {t("errors.genericError")}
                </li>
              ) : (usersQuery.data ?? []).length === 0 ? (
                <li className="px-2 py-2 text-xs text-muted-foreground">
                  No users match
                </li>
              ) : (
                (usersQuery.data ?? []).map((user) => {
                  const selected = value?.id === user.id
                  return (
                    <li key={user.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        data-testid={`staff-user-picker-option-${user.id}`}
                        onClick={() => {
                          onChange(user)
                          setOpen(false)
                          setQuery("")
                        }}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors",
                          "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                          selected && "bg-accent/60",
                        )}
                      >
                        <Check
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            selected ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {user.name?.trim() || user.email || user.phone}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {[user.email, user.phone]
                              .filter(Boolean)
                              .join(" · ") || user.id}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {errorMessage ? (
        <p
          className="text-xs text-destructive"
          role="alert"
          data-testid="staff-user-picker-error"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Form defaults
// ─────────────────────────────────────────────────────────────────────────────

/** Build RHF default values for the given mode + (optional) initial row. */
function buildDefaults(
  mode: "invite" | "edit",
  initialStaff: ShopStaff | undefined,
): ShopStaffInviteInput {
  if (mode === "edit" && initialStaff) {
    return {
      userId: initialStaff.user_id,
      role: initialStaff.role,
      // The staff record's `permissions` field is `string[]` at the type
      // level; narrow to `PermissionToken[]` here so RHF + downstream
      // toggles keep their type guarantees. Unknown tokens are passed
      // through verbatim so the form never silently drops a token the
      // server is aware of.
      permissions: initialStaff.permissions as PermissionToken[],
      is_active: initialStaff.is_active,
    }
  }
  return {
    userId: "",
    // Default selection — the most common bulk-invite role; the operator
    // can change it before submitting and the permissions update with it.
    role: "SHOP_STAFF",
    permissions: [...ROLE_DEFAULTS.SHOP_STAFF],
    is_active: true,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function InviteStaffDialog({
  shopId,
  open,
  onOpenChange,
  mode,
  initialStaff,
}: InviteStaffDialogProps) {
  const isEdit = mode === "edit"

  const inviteMutation = useInviteShopStaff(shopId)
  const updateMutation = useUpdateShopStaff(shopId)

  // Hold the picked user object locally so the picker trigger can show
  // the selected user's display name + email without a second fetch.
  // Reset whenever the dialog opens so a stale selection from a previous
  // invocation never leaks into the new flow.
  const [pickedUser, setPickedUser] = useState<User | null>(null)

  // Track which role the user explicitly picked last so we can re-prefill
  // permissions on role change without trampling individual overrides on
  // unrelated state transitions (initial mount, edit prefill, etc.).
  const lastRoleRef = useRef<ShopStaffRole | null>(null)

  const {
    handleSubmit,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ShopStaffInviteInput>({
    // RHF's resolver inference can struggle with the `Omit + override`
    // ShopStaffInviteInput shape; cast through the shared resolver type
    // to keep the rest of the form strongly typed.
    resolver: zodResolver(
      shopStaffInviteSchema,
    ) as unknown as Resolver<ShopStaffInviteInput>,
    defaultValues: buildDefaults(mode, initialStaff),
    mode: "onSubmit",
  })

  // Re-seed the form when the dialog is (re)opened. We deliberately key on
  // `open` + `initialStaff?.id` + `mode` rather than the whole row object
  // so toggling `is_active` on a row in the parent list does not blow away
  // the operator's in-progress edits.
  useEffect(() => {
    if (!open) return
    const defaults = buildDefaults(mode, initialStaff)
    reset(defaults)
    lastRoleRef.current = defaults.role

    if (mode === "edit" && initialStaff) {
      // Synthesize a User-shaped object from the embedded `ShopStaffUser`
      // so the picker can render the prefilled identity. The picker is
      // disabled in edit mode so the missing fields (`role`, `is_blocked`,
      // etc.) never matter at runtime.
      setPickedUser({
        id: initialStaff.user_id,
        name: initialStaff.user.name ?? null,
        email: initialStaff.user.email ?? null,
        phone: initialStaff.user.phone,
        role: "ADMIN",
        is_blocked: false,
        block_reason: null,
        created_at: initialStaff.joined_at,
      })
    } else {
      setPickedUser(null)
    }
  }, [open, mode, initialStaff, reset])

  const role = watch("role")
  const permissions = watch("permissions")
  const isActive = watch("is_active")

  // Pre-fill permissions whenever the operator picks a *new* role — driven
  // by `lastRoleRef` so the effect runs once per intentional role change.
  useEffect(() => {
    if (!open) return
    if (lastRoleRef.current === role) return
    lastRoleRef.current = role
    setValue("permissions", [...ROLE_DEFAULTS[role]], {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [role, open, setValue])

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function onSubmit(values: ShopStaffInviteInput) {
    try {
      if (isEdit && initialStaff) {
        await updateMutation.mutateAsync({
          staffId: initialStaff.id,
          body: {
            role: values.role,
            permissions: values.permissions,
            is_active: values.is_active,
          },
        })
      } else {
        await inviteMutation.mutateAsync({
          user_id: values.userId,
          role: values.role,
          permissions: values.permissions,
          is_active: values.is_active,
        })
      }
      onOpenChange(false)
    } catch (err) {
      // 409 already-assigned → field error on the user picker; dialog
      // stays open with every entered value intact (Req 6.6).
      // 422 cap-reached → handled by the hook's destructive toast; we
      // simply leave local state untouched (Req 6.10).
      const fieldErrors = extractStaffFieldErrors(err)
      if (fieldErrors.userId) {
        setError("userId", {
          type: "server",
          message: fieldErrors.userId,
        })
      }
      // Any other error already surfaces via the hook's generic toast.
    }
  }

  const submitting =
    isSubmitting || inviteMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("shopStaff.edit.title") : t("shopStaff.invite.title")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? // Re-use the invite description copy when an explicit edit
                // description is not in the bundle — kept terse so it fits
                // at 360 px viewport.
                t("shopStaff.invite.userPicker.label")
              : t("shopStaff.invite.userPicker.placeholder")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* ── Step 1: User picker ────────────────────────────────────── */}
          <UserPicker
            value={pickedUser}
            disabled={isEdit}
            errorMessage={errors.userId?.message}
            onChange={(user) => {
              setPickedUser(user)
              setValue("userId", user.id, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          />
          {/*
            `userId` is set on the form via setValue from the UserPicker
            onChange — there is no native input bound for it. Including a
            hidden `register` input here would create a controlled/uncontrolled
            mismatch with RHF in jsdom and stomp the value back to "" on
            re-renders.
          */}

          {/* ── Step 2: Role select ────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="staff-role">
              {t("shopStaff.invite.role.label")}
            </Label>
            <Select
              value={role}
              onValueChange={(next) =>
                setValue("role", next as ShopStaffRole, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger
                id="staff-role"
                aria-invalid={Boolean(errors.role) || undefined}
                data-testid="staff-role-trigger"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`shopStaff.invite.role.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.role.message}
              </p>
            ) : null}
          </div>

          {/* ── Step 3: Permission group toggles ───────────────────────── */}
          <PermissionGroupToggles
            value={permissions}
            onChange={(next) =>
              setValue("permissions", next, {
                shouldDirty: true,
                shouldValidate: false,
              })
            }
          />

          {/* ── Active toggle ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="staff-is-active" className="font-normal">
              {t("shopStaff.invite.isActive.label")}
            </Label>
            <Switch
              id="staff-is-active"
              checked={isActive}
              onCheckedChange={(on) =>
                setValue("is_active", on, { shouldDirty: true })
              }
              data-testid="staff-is-active-toggle"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("shopStaff.invite.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="staff-submit"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  {t("shopStaff.invite.submitting")}
                </span>
              ) : isEdit ? (
                t("shopStaff.edit.submit")
              ) : (
                t("shopStaff.invite.submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default InviteStaffDialog
