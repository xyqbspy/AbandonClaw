const ANON_ID_STORAGE_KEY = "abridge:anon_id";
const ANON_ID_HEADER = "X-Anonymous-Id";
const ANON_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ANONYMOUS_HEADER_NAME = ANON_ID_HEADER;
export const ANONYMOUS_STORAGE_KEY = ANON_ID_STORAGE_KEY;

export const isValidAnonymousId = (value: unknown): value is string =>
  typeof value === "string" && ANON_ID_REGEX.test(value);

const generateUuidV4 = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const readStored = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ANON_ID_STORAGE_KEY);
    return isValidAnonymousId(raw) ? raw : null;
  } catch {
    return null;
  }
};

const writeStored = (value: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANON_ID_STORAGE_KEY, value);
  } catch {
    // localStorage 不可用(隐私模式 / 配额耗尽)— 调用方自行降级
  }
};

export const getOrCreateAnonymousId = (): string => {
  const existing = readStored();
  if (existing) return existing;
  const generated = generateUuidV4();
  writeStored(generated);
  return generated;
};

export const peekAnonymousId = (): string | null => readStored();

export const clearAnonymousId = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ANON_ID_STORAGE_KEY);
  } catch {
    // 同上
  }
};

export const buildAnonymousHeaders = (anonId?: string): Record<string, string> => {
  const value = anonId ?? readStored();
  if (!isValidAnonymousId(value)) return {};
  return { [ANON_ID_HEADER]: value };
};
