import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { isAdminEmail } from "@/lib/shared/admin";

const AUTH_PAGE_PATHS = new Set(["/login", "/signup"]);
const PROTECTED_PAGE_PREFIXES = [
  "/today",
  "/scenes",
  "/scene",
  "/review",
  "/chunks",
  "/progress",
  "/settings",
  "/lesson",
  "/admin",
];
const PROTECTED_API_PREFIXES = ["/api/me", "/api/scenes", "/api/admin", "/api/learning"];

const isProtectedPagePath = (pathname: string) =>
  PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

const isProtectedApiPath = (pathname: string) =>
  PROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/") && !isProtectedApiPath(pathname)) {
    return NextResponse.next({ request });
  }

  if (
    !isProtectedPagePath(pathname) &&
    !AUTH_PAGE_PATHS.has(pathname) &&
    !isProtectedApiPath(pathname)
  ) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPagePath(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && AUTH_PAGE_PATHS.has(pathname)) {
    const redirectTarget = request.nextUrl.searchParams.get("redirect");
    const safeTarget = redirectTarget?.startsWith("/") ? redirectTarget : "/scenes";
    return NextResponse.redirect(new URL(safeTarget, request.url));
  }

  if (
    user &&
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    !isAdminEmail(user.email)
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!user && isProtectedApiPath(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
