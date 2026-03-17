export interface ReviewSessionExpression {
  userPhraseId: string;
  text?: string;
  expressionFamilyId?: string | null;
}

export type ReviewSessionPayload = {
  createdAt: number;
  expiresAt: number;
  source?: string;
  expressionUserPhraseIds: string[];
};

const STORAGE_KEY = "review-session-v1";
const SESSION_TTL_MS = 15 * 60 * 1000;

const uniqueIds = (rows: ReviewSessionExpression[]) =>
  Array.from(
    new Set(
      rows
        .map((item) => item.userPhraseId?.trim())
        .filter((item): item is string => Boolean(item)),
    ),
  );

const writeSession = (payload: ReviewSessionPayload) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Non-blocking.
  }
};

export function startReviewSession(options?: {
  expressions?: ReviewSessionExpression[];
  source?: string;
  router?: { push: (href: string) => void };
}) {
  const ids = uniqueIds(options?.expressions ?? []);
  const createdAt = Date.now();
  writeSession({
    createdAt,
    expiresAt: createdAt + SESSION_TTL_MS,
    source: options?.source,
    expressionUserPhraseIds: ids,
  });

  const href = "/review";
  if (options?.router) {
    options.router.push(href);
    return;
  }
  if (typeof window !== "undefined") {
    window.location.href = href;
  }
}

export function clearReviewSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-blocking.
  }
}

export function readReviewSession(): ReviewSessionPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReviewSessionPayload>;
    if (!Array.isArray(parsed.expressionUserPhraseIds)) {
      clearReviewSession();
      return null;
    }
    const createdAt = typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now();
    const expiresAt =
      typeof parsed.expiresAt === "number" ? parsed.expiresAt : createdAt + SESSION_TTL_MS;
    if (Date.now() > expiresAt) {
      clearReviewSession();
      return null;
    }
    return {
      createdAt,
      expiresAt,
      source: typeof parsed.source === "string" ? parsed.source : undefined,
      expressionUserPhraseIds: parsed.expressionUserPhraseIds
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 50),
    };
  } catch {
    clearReviewSession();
    return null;
  }
}
