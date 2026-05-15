const DEFAULT_REDIRECT_TARGET = "/today";

export const getAuthRedirectTargetFromSearchParams = (
  searchParams: Pick<URLSearchParams, "get">,
) =>
  searchParams.get("redirectTo") ??
  searchParams.get("redirect") ??
  searchParams.get("next");

export const isSafeRedirectTarget = (
  redirectTarget: string | null | undefined,
): redirectTarget is string =>
  Boolean(
    redirectTarget &&
      redirectTarget.startsWith("/") &&
      !redirectTarget.startsWith("//"),
  );

export const resolveSafeRedirectTarget = (
  redirectTarget: string | null | undefined,
  fallback = DEFAULT_REDIRECT_TARGET,
): string => {
  if (!isSafeRedirectTarget(redirectTarget)) {
    return fallback;
  }
  return redirectTarget;
};

export const buildAuthRedirectHref = (
  pathname: string,
  redirectTarget: string | null | undefined,
) => {
  if (!isSafeRedirectTarget(redirectTarget)) {
    return pathname;
  }
  return `${pathname}?redirect=${encodeURIComponent(redirectTarget)}`;
};
