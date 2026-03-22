export type AdminNoticeTone = "success" | "info" | "danger";

export function buildAdminHref(
  pathname: string,
  params: Record<string, string | number | null | undefined>,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function normalizeAdminReturnTo(
  value: FormDataEntryValue | string | null | undefined,
  fallback: string,
) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw.startsWith("/admin")) return fallback;
  return raw;
}

export function appendAdminNotice(
  href: string,
  notice: string,
  tone: AdminNoticeTone = "success",
) {
  const url = new URL(href, "http://localhost");
  url.searchParams.set("notice", notice);
  url.searchParams.set("noticeTone", tone);
  return `${url.pathname}${url.search}`;
}

export function readAdminNotice(params: Record<string, string | string[] | undefined>) {
  const notice = typeof params.notice === "string" ? params.notice : "";
  const tone =
    params.noticeTone === "danger" || params.noticeTone === "info" || params.noticeTone === "success"
      ? params.noticeTone
      : "success";

  if (!notice) return null;
  return { notice, tone } as const;
}

export function readAdminStringParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  return typeof params[key] === "string" ? params[key] : "";
}

export function readAdminPositivePage(
  params: Record<string, string | string[] | undefined>,
  fallback = 1,
  key = "page",
) {
  const value = readAdminStringParam(params, key);
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}
