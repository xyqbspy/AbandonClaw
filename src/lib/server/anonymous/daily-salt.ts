const DAILY_SALT_FALLBACK = "abridge-anon-default-salt-rotate-me";

export const getTodayUtcDateKey = (now: Date = new Date()) =>
  now.toISOString().slice(0, 10);

export const getDailySalt = (now: Date = new Date()) => {
  const base = process.env.ANON_DAILY_SALT_SECRET?.trim() || DAILY_SALT_FALLBACK;
  return `${base}:${getTodayUtcDateKey(now)}`;
};

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const subtleSha256 = async (input: string) => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const encoded = new TextEncoder().encode(input);
  const digest = await subtle.digest("SHA-256", encoded);
  return toHex(new Uint8Array(digest));
};

const nodeSha256 = async (input: string) => {
  try {
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(input).digest("hex");
  } catch {
    return null;
  }
};

export const hashIp = async (rawIp: string, salt: string = getDailySalt()) => {
  const trimmed = rawIp?.trim() || "unknown";
  const subtleResult = await subtleSha256(`${salt}|${trimmed}`);
  if (subtleResult) return subtleResult;
  const nodeResult = await nodeSha256(`${salt}|${trimmed}`);
  if (nodeResult) return nodeResult;
  throw new Error("No SHA-256 implementation available for IP hashing.");
};
