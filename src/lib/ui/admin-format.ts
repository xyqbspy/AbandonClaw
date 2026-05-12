const ADMIN_TIME_ZONE = "Asia/Shanghai";

const ADMIN_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  timeZone: ADMIN_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const normalizeIsoFraction = (value: string) =>
  value.replace(/\.(\d{3})\d+(?=Z|[+-]\d{2}:?\d{2}$)/, ".$1");

export function formatAdminDateTime(value: string | null | undefined, fallback = "-") {
  if (!value) return fallback;
  const date = new Date(normalizeIsoFraction(value));
  if (Number.isNaN(date.getTime())) return fallback;

  const parts = ADMIN_DATE_TIME_FORMATTER.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");

  if (!year || !month || !day || !hour || !minute) return fallback;
  return `${year}/${month}/${day} ${hour}:${minute}`;
}
