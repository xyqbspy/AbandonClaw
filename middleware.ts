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

const resolveSafeRedirectTarget = (redirectTarget: string | null | undefined) => {
  if (!redirectTarget) return "/scenes";
  if (!redirectTarget.startsWith("/") || redirectTarget.startsWith("//")) {
    return "/scenes";
  }
  return redirectTarget;
};

interface MiddlewareDependencies {
  createServerClient: typeof createServerClient;
  getSupabaseUrl: typeof getSupabaseUrl;
  getSupabaseAnonKey: typeof getSupabaseAnonKey;
  isAdminEmail: typeof isAdminEmail;
  next: (request: NextRequest) => NextResponse;
  redirect: (url: URL) => NextResponse;
  json: (body: unknown, init: { status: number }) => NextResponse;
}

const defaultDependencies: MiddlewareDependencies = {
  createServerClient,
  getSupabaseUrl,
  getSupabaseAnonKey,
  isAdminEmail,
  next: (request) => NextResponse.next({ request }),
  redirect: (url) => NextResponse.redirect(url),
  json: (body, init) => NextResponse.json(body, init),
};

export async function handleMiddleware(
  request: NextRequest,
  dependencies: MiddlewareDependencies = defaultDependencies,
) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/") && !isProtectedApiPath(pathname)) {
    return dependencies.next(request);
  }

  if (
    !isProtectedPagePath(pathname) &&
    !AUTH_PAGE_PATHS.has(pathname) &&
    !isProtectedApiPath(pathname)
  ) {
    return dependencies.next(request);
  }

  const response = dependencies.next(request);

  const supabase = dependencies.createServerClient(
    dependencies.getSupabaseUrl(),
    dependencies.getSupabaseAnonKey(),
    {
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
    },
  );

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
    const safeTarget = resolveSafeRedirectTarget(redirectTarget);
    return dependencies.redirect(new URL(safeTarget, request.url));
  }

  if (
    user &&
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    !dependencies.isAdminEmail(user.email)
  ) {
    return dependencies.redirect(new URL("/", request.url));
  }

  if (!user && isProtectedApiPath(pathname)) {
    return dependencies.json({ error: "Unauthorized" }, { status: 401 });
  }

  return response;
}

export async function middleware(request: NextRequest) {
  return handleMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
