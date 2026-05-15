"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BuiltinPhraseItemResponse,
  getBuiltinPhrasesFromApi,
} from "@/lib/utils/phrases-api";

export const useBuiltinPhrasesData = () => {
  const [loading, setLoading] = useState(true);
  const [phrases, setPhrases] = useState<BuiltinPhraseItemResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadBuiltinPhrases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBuiltinPhrasesFromApi({ limit: 120 });
      setPhrases(result.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载必备表达失败。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBuiltinPhrases();
  }, [loadBuiltinPhrases]);

  return {
    loading,
    phrases,
    setPhrases,
    error,
    loadBuiltinPhrases,
  };
};
