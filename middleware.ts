import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { resolveSafeRedirectTarget } from "@/lib/shared/auth-redirect";
import { isAdminEmail } from "@/lib/shared/admin";
import {
  attachRequestIdToResponse,
  getOrCreateRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/server/request-context";

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
const PROTECTED_API_PREFIXES = [
  "/api/me",
  "/api/scenes",
  "/api/admin",
  "/api/learning",
  "/api/review",
  "/api/phrases",
  "/api/recommendations",
  "/api/tts",
  "/api/expression-map",
  "/api/explain-selection",
  "/api/practice",
  "/api/scene",
];

const isProtectedPagePath = (pathname: string) =>
  PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

const isProtectedApiPath = (pathname: string) =>
  PROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

interface MiddlewareDependencies {
  createServerClient: typeof createServerClient;
  getSupabaseUrl: typeof getSupabaseUrl;
  getSupabaseAnonKey: typeof getSupabaseAnonKey;
  isAdminEmail: typeof isAdminEmail;
  next: (request: NextRequest, requestId: string) => NextResponse;
  redirect: (url: URL) => NextResponse;
  json: (body: unknown, init: { status: number }) => NextResponse;
}

const defaultDependencies: MiddlewareDependencies = {
  createServerClient,
  getSupabaseUrl,
  getSupabaseAnonKey,
  isAdminEmail,
  next: (request, requestId) => {
    const headers = new Headers(request.headers);
    headers.set(REQUEST_ID_HEADER, requestId);
    return NextResponse.next({
      request: {
        headers,
      },
    });
  },
  redirect: (url) => NextResponse.redirect(url),
  json: (body, init) => NextResponse.json(body, init),
};

export async function handleMiddleware(
  request: NextRequest,
  dependencies: MiddlewareDependencies = defaultDependencies,
) {
  const { pathname, search } = request.nextUrl;
  const requestId = getOrCreateRequestId(request);

  if (pathname.startsWith("/api/") && !isProtectedApiPath(pathname)) {
    return attachRequestIdToResponse(dependencies.next(request, requestId), requestId);
  }

  if (
    !isProtectedPagePath(pathname) &&
    !AUTH_PAGE_PATHS.has(pathname) &&
    !isProtectedApiPath(pathname)
  ) {
    return attachRequestIdToResponse(dependencies.next(request, requestId), requestId);
  }

  const response = attachRequestIdToResponse(
    dependencies.next(request, requestId),
    requestId,
  );

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
    return attachRequestIdToResponse(NextResponse.redirect(redirectUrl), requestId);
  }

  if (user && AUTH_PAGE_PATHS.has(pathname)) {
    const redirectTarget = request.nextUrl.searchParams.get("redirect");
    const safeTarget = resolveSafeRedirectTarget(redirectTarget);
    return attachRequestIdToResponse(
      dependencies.redirect(new URL(safeTarget, request.url)),
      requestId,
    );
  }

  if (
    user &&
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    !dependencies.isAdminEmail(user.email)
  ) {
    return attachRequestIdToResponse(
      dependencies.redirect(new URL("/", request.url)),
      requestId,
    );
  }

  if (!user && isProtectedApiPath(pathname)) {
    return attachRequestIdToResponse(
      dependencies.json({ error: "Unauthorized", requestId }, { status: 401 }),
      requestId,
    );
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
