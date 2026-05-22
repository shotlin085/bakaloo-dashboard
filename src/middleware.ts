import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/** Routes that don't require authentication */
const PUBLIC_ROUTES = ["/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const hasAuth = request.cookies.has("auth_session")

  // Redirect unauthenticated users to login
  if (!isPublic && !hasAuth) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Let authenticated users access login page — the dashboard layout
  // will validate the token and redirect if it's actually valid.
  // This prevents the loop where stale cookies block access to login.
  // If the token is truly valid, the login page component will redirect.

  return NextResponse.next()
}

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
