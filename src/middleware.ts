/**
 * Next.js middleware — authentication + vendor shop routing enforcement.
 *
 * The Next.js Edge runtime cannot read `localStorage` or the in-memory Zustand
 * stores, so the dashboard mirrors the slice of state the middleware needs
 * into three cookies:
 *
 *   - `auth_session`     : `"1"` once a JWT is present (set by `auth.store.ts`)
 *   - `is-super-admin`   : `"1"` for Super_Admin / `"0"` for vendors
 *                          (set by `auth.store.ts`)
 *   - `shop-context-mw`  : URL-encoded JSON `{ activeShopId, assignedShopIds }`
 *                          (set by `shop-context.store.ts`)
 *
 * These cookies are advisory: the backend re-verifies the JWT on every request,
 * so the worst case from a forged cookie is a redirect mismatch on the client.
 * The cookies carry no secrets — only the `is-super-admin` flag and the shop
 * ids that the JWT already authorizes.
 *
 * Routing rules (Req 1.6):
 *   1. Unauthenticated user → redirect to `/login` (preserved from the
 *      pre-existing middleware).
 *   2. Super_Admin in ALL_SHOPS mode → allow any route.
 *   3. Vendor with no `activeShopId` and `assignedShopIds.length > 1`
 *      → allow only `/login`, `/select-shop`, `/logout`; redirect every
 *        other path to `/select-shop`.
 *   4. Vendor with an `activeShopId` (or a single assigned shop) → allow any
 *      route. The cookie may briefly be missing during a fresh login;
 *      authenticated users without the shop-context cookie are allowed
 *      through and the client-side guards finish the routing.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Routes that don't require authentication. */
const PUBLIC_ROUTES = ["/login"] as const

/**
 * Routes a vendor without an active shop (and ≥2 assignments) is allowed to
 * visit. Any other path redirects to `/select-shop` so the user picks a shop
 * before entering the dashboard (Req 1.6).
 */
const VENDOR_NO_SHOP_ALLOWED = ["/login", "/select-shop", "/logout"] as const

/** Cookie names — kept in sync with the writers in `store/auth.store.ts` and `store/shop-context.store.ts`. */
const COOKIE_AUTH_SESSION = "auth_session"
const COOKIE_SUPER_ADMIN = "is-super-admin"
const COOKIE_SHOP_CONTEXT = "shop-context-mw"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Slice of the Shop_Context_Store mirrored into the cookie. Keep this type
 * narrow so a malformed or extended cookie payload does not weaken the type
 * checker's guarantees about the routing decision.
 */
interface ShopContextCookiePayload {
  activeShopId: string | null
  assignedShopIds: string[]
}

/**
 * Parse the `shop-context-mw` cookie. Returns `null` when the cookie is
 * missing, malformed, or fails the structural check. The middleware treats
 * a `null` payload the same way it treats an authenticated user with no
 * shop context: pass through and let client-side guards handle it.
 */
function parseShopContextCookie(
  raw: string | undefined,
): ShopContextCookiePayload | null {
  if (!raw) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(decoded)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const obj = parsed as Record<string, unknown>
  const activeShopId =
    typeof obj.activeShopId === "string" ? obj.activeShopId : null
  const assignedShopIds = Array.isArray(obj.assignedShopIds)
    ? obj.assignedShopIds.filter((v): v is string => typeof v === "string")
    : []
  return { activeShopId, assignedShopIds }
}

/** True when `pathname` is, or starts with, any of the entries in `routes`. */
function matchesAnyRoute(
  pathname: string,
  routes: readonly string[],
): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip Next.js internals, API routes, and any path with a file extension.
  // These never need auth or shop-routing checks.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const hasAuth = request.cookies.has(COOKIE_AUTH_SESSION)

  // Rule 1: Unauthenticated → redirect to /login (preserved behaviour).
  if (!isPublic && !hasAuth) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated users on `/login` keep the existing pass-through: the
  // login page itself validates the token and redirects to `/dashboard`
  // when valid. Without this branch, a stale-cookie loop would block the
  // user from reaching the login form.
  if (!hasAuth || isPublic) {
    return NextResponse.next()
  }

  // ─── Authenticated, non-public path from here on ───────────────────────

  const isSuperAdmin =
    request.cookies.get(COOKIE_SUPER_ADMIN)?.value === "1"

  // Rule 2: Super_Admin in ALL_SHOPS mode → allow everything.
  // Super_Admins are not bound to a specific shop and can navigate freely.
  if (isSuperAdmin) {
    return NextResponse.next()
  }

  // Rule 3 + 4: Vendor users — gate on shop selection state.
  const ctx = parseShopContextCookie(
    request.cookies.get(COOKIE_SHOP_CONTEXT)?.value,
  )

  // No `shop-context-mw` cookie yet (fresh login mid-flight, or the cookie
  // was cleared while localStorage still has state). Pass through and let
  // the client-side guards in the dashboard layout finish routing — they
  // have access to the full Zustand store and can disambiguate.
  if (!ctx) {
    return NextResponse.next()
  }

  const needsShopSelection =
    ctx.activeShopId === null && ctx.assignedShopIds.length > 1

  if (
    needsShopSelection &&
    !matchesAnyRoute(pathname, VENDOR_NO_SHOP_ALLOWED)
  ) {
    const url = new URL("/select-shop", request.url)
    return NextResponse.redirect(url)
  }

  // Vendor with an active shop, or a single assigned shop, or visiting an
  // allowed path while shop-less — pass through.
  return NextResponse.next()
}

// ─────────────────────────────────────────────────────────────────────────────
// Matcher
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
