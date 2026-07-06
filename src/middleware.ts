/**
 * Next.js Middleware — Unified Route Protection
 *
 * /owner/*  → OWNER only
 * /admin/*  → OWNER or ADMIN (read-only)
 * /dashboard/* → TEAM_MEMBER, ADMIN, or OWNER
 *
 * Redirects legacy admin login routes to /login.
 */
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "cxa_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Redirect old admin login / access gate routes to /login
  if (pathname === "/admin/login" || pathname === "/admin/access") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  // 2. Route category detection
  const isOwnerPage = pathname.startsWith("/owner");
  const isAdminPage = pathname.startsWith("/admin");
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isOwnerApi = pathname.startsWith("/api/owner");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isProfileApi = pathname.startsWith("/api/profile");

  const isProtectedPage = isOwnerPage || isAdminPage || isDashboardPage;
  const isProtectedApi = isOwnerApi || isAdminApi || isProfileApi;

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  // 3. Check session cookie presence (fast check — pages do full DB validation)
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized. Session required." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    const skipRedirectFor = ["/owner", "/admin", "/dashboard"];
    if (!skipRedirectFor.includes(pathname)) {
      url.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(url);
  }

  // 4. For API routes, let the handlers do role-checking in DB
  if (isProtectedApi) {
    return NextResponse.next();
  }

  // 5. For owner/admin pages, we rely on the page components to validate role.
  //    The cookie exists, so let through — server component will enforce role.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/owner/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/api/owner/:path*",
    "/api/admin/:path*",
    "/api/profile/:path*",
  ],
};
