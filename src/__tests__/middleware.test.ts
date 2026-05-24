/**
 * Unit tests for `src/middleware.ts` — vendor routing rules + auth gate.
 *
 * Validates: Requirements 1.6, 1.7 (preserve), 3.1 (super-admin pass-through).
 *
 * The Next.js middleware uses `NextRequest` and `NextResponse` from the
 * Edge runtime. Both are exported by `next/server` and work under Vitest's
 * `jsdom` environment because Next polyfills them via standard Web APIs.
 */

import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { middleware } from "@/middleware"

interface MakeRequestOpts {
  pathname: string
  /** Cookie map. `undefined` keys are skipped. */
  cookies?: Record<string, string | undefined>
}

function makeRequest({ pathname, cookies = {} }: MakeRequestOpts): NextRequest {
  const url = `https://example.test${pathname}`
  const cookieHeader = Object.entries(cookies)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v as string}`)
    .join("; ")
  return new NextRequest(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  })
}

/** Encode a `shop-context-mw` payload the way the store does. */
function encodeShopCtx(payload: {
  activeShopId: string | null
  assignedShopIds: string[]
}): string {
  return encodeURIComponent(JSON.stringify(payload))
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1: Unauthenticated users
// ─────────────────────────────────────────────────────────────────────────────

describe("middleware — unauthenticated", () => {
  it("redirects to /login when no auth_session cookie is present", () => {
    const req = makeRequest({ pathname: "/dashboard" })
    const res = middleware(req)

    expect(res.status).toBe(307) // Next.js redirect
    const location = res.headers.get("location")
    expect(location).not.toBeNull()
    const url = new URL(location as string)
    expect(url.pathname).toBe("/login")
    // Preserves the redirect target as the existing middleware did.
    expect(url.searchParams.get("redirect")).toBe("/dashboard")
  })

  it("allows access to /login when no auth_session cookie is present", () => {
    const req = makeRequest({ pathname: "/login" })
    const res = middleware(req)

    // NextResponse.next() returns a non-redirect 200.
    expect(res.status).toBe(200)
    expect(res.headers.get("location")).toBeNull()
  })

  it("skips Next.js internals and API routes regardless of auth", () => {
    for (const pathname of ["/_next/static/foo.js", "/api/v1/health"]) {
      const res = middleware(makeRequest({ pathname }))
      expect(res.status).toBe(200)
      expect(res.headers.get("location")).toBeNull()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Rule 2: Super_Admin in ALL_SHOPS mode
// ─────────────────────────────────────────────────────────────────────────────

describe("middleware — super admin", () => {
  it("allows any route when is-super-admin=1, even with no shop-context cookie", () => {
    for (const pathname of [
      "/dashboard",
      "/shops",
      "/shops/new",
      "/shop-products",
      "/shop-financials",
    ]) {
      const res = middleware(
        makeRequest({
          pathname,
          cookies: { auth_session: "1", "is-super-admin": "1" },
        }),
      )
      expect(res.status).toBe(200)
      expect(res.headers.get("location")).toBeNull()
    }
  })

  it("ignores the shop-context cookie for super admins", () => {
    // Even with an empty activeShopId and multiple assigned ids — which would
    // force a vendor to /select-shop — the super-admin flag passes through.
    const res = middleware(
      makeRequest({
        pathname: "/dashboard",
        cookies: {
          auth_session: "1",
          "is-super-admin": "1",
          "shop-context-mw": encodeShopCtx({
            activeShopId: null,
            assignedShopIds: ["shop-a", "shop-b"],
          }),
        },
      }),
    )
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Rule 3: Vendor with no active shop and ≥2 assignments
// ─────────────────────────────────────────────────────────────────────────────

describe("middleware — vendor without active shop (≥2 assignments)", () => {
  const baseCookies = {
    auth_session: "1",
    "is-super-admin": "0",
    "shop-context-mw": encodeShopCtx({
      activeShopId: null,
      assignedShopIds: ["shop-a", "shop-b"],
    }),
  }

  it.each([
    "/dashboard",
    "/shops",
    "/orders",
    "/shop-products",
    "/some/deep/path",
  ])("redirects %s to /select-shop", (pathname) => {
    const res = middleware(makeRequest({ pathname, cookies: baseCookies }))
    expect(res.status).toBe(307)
    const url = new URL(res.headers.get("location") as string)
    expect(url.pathname).toBe("/select-shop")
  })

  it.each(["/login", "/select-shop", "/logout"])(
    "allows %s without redirect",
    (pathname) => {
      const res = middleware(makeRequest({ pathname, cookies: baseCookies }))
      expect(res.status).toBe(200)
      expect(res.headers.get("location")).toBeNull()
    },
  )

  it("allows nested paths under the allowed routes (e.g. /select-shop/foo)", () => {
    const res = middleware(
      makeRequest({ pathname: "/select-shop/foo", cookies: baseCookies }),
    )
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Rule 4: Vendor with an active shop, single-shop assignment, or no cookie
// ─────────────────────────────────────────────────────────────────────────────

describe("middleware — vendor with active shop or single assignment", () => {
  it("allows any route when activeShopId is set", () => {
    const cookies = {
      auth_session: "1",
      "is-super-admin": "0",
      "shop-context-mw": encodeShopCtx({
        activeShopId: "shop-a",
        assignedShopIds: ["shop-a", "shop-b"],
      }),
    }
    for (const pathname of ["/dashboard", "/orders", "/shop-products"]) {
      const res = middleware(makeRequest({ pathname, cookies }))
      expect(res.status).toBe(200)
    }
  })

  it("allows any route when only one shop is assigned (no selection step)", () => {
    const cookies = {
      auth_session: "1",
      "is-super-admin": "0",
      "shop-context-mw": encodeShopCtx({
        activeShopId: null,
        assignedShopIds: ["shop-a"],
      }),
    }
    const res = middleware(makeRequest({ pathname: "/dashboard", cookies }))
    expect(res.status).toBe(200)
  })

  it("passes through when shop-context cookie is missing (mid-login)", () => {
    // Authenticated but the shop-context cookie has not been written yet
    // (login completed, select-shop in progress). Client guards finish.
    const res = middleware(
      makeRequest({
        pathname: "/dashboard",
        cookies: { auth_session: "1", "is-super-admin": "0" },
      }),
    )
    expect(res.status).toBe(200)
  })

  it("passes through when shop-context cookie is malformed JSON", () => {
    const res = middleware(
      makeRequest({
        pathname: "/dashboard",
        cookies: {
          auth_session: "1",
          "is-super-admin": "0",
          "shop-context-mw": encodeURIComponent("{bad-json"),
        },
      }),
    )
    expect(res.status).toBe(200)
  })
})
