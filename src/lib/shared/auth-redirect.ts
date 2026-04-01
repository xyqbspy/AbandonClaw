const DEFAULT_REDIRECT_TARGET = "/scenes";

export const isSafeRedirectTarget = (redirectTarget: string | null | undefined) =>
  Boolean(
    redirectTarget &&
      redirectTarget.startsWith("/") &&
      !redirectTarget.startsWith("//"),
  );

export const resolveSafeRedirectTarget = (
  redirectTarget: string | null | undefined,
  fallback = DEFAULT_REDIRECT_TARGET,
) => {
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
