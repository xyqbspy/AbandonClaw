"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { peekAnonymousId } from "@/lib/anonymous-client";

export type AnonymousPromptLevel = "L1" | "L2" | "L3";

export type AnonymousQuotaSnapshot = {
  capability: string;
  dailyLimit: number | null;
  dailyRemaining: number | null;
  sessionLimit: number | null;
  sessionRemaining: number | null;
  resetAt: string | null;
};

const QUOTA_HEADER_NAMES = {
  type: "X-Quota-Type",
  dailyLimit: "X-Quota-Daily-Limit",
  dailyRemaining: "X-Quota-Daily-Remaining",
  sessionLimit: "X-Quota-Session-Limit",
  sessionRemaining: "X-Quota-Session-Remaining",
  resetAt: "X-Quota-Reset-At",
} as const;

const STORAGE_PREFIX = "abridge:anon:";

const parseInteger = (raw: string | null): number | null => {
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.trunc(value);
};

export const readQuotaFromResponse = (
  response: { headers: { get: (name: string) => string | null } },
): AnonymousQuotaSnapshot | null => {
  const capability = response.headers.get(QUOTA_HEADER_NAMES.type);
  if (!capability) return null;
  return {
    capability,
    dailyLimit: parseInteger(response.headers.get(QUOTA_HEADER_NAMES.dailyLimit)),
    dailyRemaining: parseInteger(response.headers.get(QUOTA_HEADER_NAMES.dailyRemaining)),
    sessionLimit: parseInteger(response.headers.get(QUOTA_HEADER_NAMES.sessionLimit)),
    sessionRemaining: parseInteger(
      response.headers.get(QUOTA_HEADER_NAMES.sessionRemaining),
    ),
    resetAt: response.headers.get(QUOTA_HEADER_NAMES.resetAt),
  };
};

const sessionStorageKey = (suffix: string) => `${STORAGE_PREFIX}${suffix}`;

const safeReadSessionFlag = (key: string): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

const safeWriteSessionFlag = (key: string, value: boolean) => {
  if (typeof window === "undefined") return;
  try {
    if (value) window.sessionStorage.setItem(key, "true");
    else window.sessionStorage.removeItem(key);
  } catch {
    // sessionStorage 不可用,L2/L3 dismiss 状态无法持久化时仍可继续渲染
  }
};

export type AnonymousModeState = {
  isAnonymous: boolean;
  anonId: string | null;
  quotaByCapability: Record<string, AnonymousQuotaSnapshot>;
  syncQuota: (snapshot: AnonymousQuotaSnapshot) => void;
  syncFromResponse: (response: {
    headers: { get: (name: string) => string | null };
  }) => void;
  getSessionFlag: (suffix: string) => boolean;
  setSessionFlag: (suffix: string, value: boolean) => void;
  promptVisible: Record<AnonymousPromptLevel, boolean>;
  showRegisterPrompt: (level: AnonymousPromptLevel) => void;
  dismissRegisterPrompt: (level: AnonymousPromptLevel) => void;
};

export const useAnonymousMode = (params: {
  isAuthenticated: boolean;
  initialQuotaSnapshots?: AnonymousQuotaSnapshot[];
}): AnonymousModeState => {
  const { isAuthenticated, initialQuotaSnapshots = [] } = params;

  const [anonId, setAnonId] = useState<string | null>(null);
  const [quotaByCapability, setQuotaByCapability] = useState<
    Record<string, AnonymousQuotaSnapshot>
  >(() => {
    const initial: Record<string, AnonymousQuotaSnapshot> = {};
    for (const snapshot of initialQuotaSnapshots) {
      initial[snapshot.capability] = snapshot;
    }
    return initial;
  });

  const [promptVisible, setPromptVisible] = useState<Record<AnonymousPromptLevel, boolean>>({
    L1: false,
    L2: false,
    L3: false,
  });

  const isAnonymous = !isAuthenticated;

  useEffect(() => {
    if (!isAnonymous) {
      setAnonId(null);
      return;
    }
    setAnonId(peekAnonymousId());
  }, [isAnonymous]);

  useEffect(() => {
    if (isAnonymous) {
      setPromptVisible((prev) => ({ ...prev, L1: true }));
    } else {
      setPromptVisible({ L1: false, L2: false, L3: false });
    }
  }, [isAnonymous]);

  const syncQuota = useCallback((snapshot: AnonymousQuotaSnapshot) => {
    setQuotaByCapability((prev) => ({ ...prev, [snapshot.capability]: snapshot }));
  }, []);

  const syncFromResponse = useCallback(
    (response: { headers: { get: (name: string) => string | null } }) => {
      const snapshot = readQuotaFromResponse(response);
      if (snapshot) syncQuota(snapshot);
    },
    [syncQuota],
  );

  const showRegisterPrompt = useCallback((level: AnonymousPromptLevel) => {
    if (level === "L2") {
      const key = sessionStorageKey("prompt:L2:dismissed");
      if (safeReadSessionFlag(key)) return;
    }
    setPromptVisible((prev) => ({ ...prev, [level]: true }));
  }, []);

  const dismissRegisterPrompt = useCallback((level: AnonymousPromptLevel) => {
    setPromptVisible((prev) => ({ ...prev, [level]: false }));
    if (level === "L2") {
      safeWriteSessionFlag(sessionStorageKey("prompt:L2:dismissed"), true);
    }
  }, []);

  return useMemo<AnonymousModeState>(
    () => ({
      isAnonymous,
      anonId,
      quotaByCapability,
      syncQuota,
      syncFromResponse,
      getSessionFlag: (suffix) => safeReadSessionFlag(sessionStorageKey(suffix)),
      setSessionFlag: (suffix, value) =>
        safeWriteSessionFlag(sessionStorageKey(suffix), value),
      promptVisible,
      showRegisterPrompt,
      dismissRegisterPrompt,
    }),
    [
      isAnonymous,
      anonId,
      quotaByCapability,
      syncQuota,
      syncFromResponse,
      promptVisible,
      showRegisterPrompt,
      dismissRegisterPrompt,
    ],
  );
};

export const isQuotaCritical = (snapshot: AnonymousQuotaSnapshot): boolean =>
  snapshot.sessionRemaining !== null && snapshot.sessionRemaining <= 1;

export const isQuotaExhausted = (snapshot: AnonymousQuotaSnapshot): boolean =>
  snapshot.sessionRemaining === 0 || snapshot.dailyRemaining === 0;
