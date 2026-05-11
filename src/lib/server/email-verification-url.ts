import { resolveSafeRedirectTarget } from "@/lib/shared/auth-redirect";

const DEFAULT_EMAIL_VERIFICATION_TARGET = "/scenes";
const EMAIL_VERIFICATION_ERROR_TARGET = "/verify-email?error=callback";

export const buildEmailVerificationRedirectTo = (
  request: Pick<Request, "url">,
  next: string | null | undefined = DEFAULT_EMAIL_VERIFICATION_TARGET,
) => {
  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set(
    "next",
    resolveSafeRedirectTarget(next, DEFAULT_EMAIL_VERIFICATION_TARGET),
  );
  return callbackUrl.toString();
};

export const getEmailVerificationCallbackSuccessTarget = (request: Request) =>
  resolveSafeRedirectTarget(
    new URL(request.url).searchParams.get("next"),
    DEFAULT_EMAIL_VERIFICATION_TARGET,
  );

export const getEmailVerificationCallbackErrorTarget = () =>
  EMAIL_VERIFICATION_ERROR_TARGET;
