"use client";

import { useState } from "react";
import { ExpressionMapResponse } from "@/lib/types/expression-map";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

export type ExpressionMapState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  data: ExpressionMapResponse | null;
  sourceExpression: UserPhraseItemResponse | null;
  openingForId: string | null;
};

export type ExpressionMapSetters = {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setData: React.Dispatch<React.SetStateAction<ExpressionMapResponse | null>>;
  setSourceExpression: React.Dispatch<
    React.SetStateAction<UserPhraseItemResponse | null>
  >;
  setOpeningForId: React.Dispatch<React.SetStateAction<string | null>>;
};

export type UseExpressionMapResult = {
  state: ExpressionMapState;
  setters: ExpressionMapSetters;
  resetError: () => void;
  close: () => void;
};

export function useExpressionMap(): UseExpressionMapResult {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExpressionMapResponse | null>(null);
  const [sourceExpression, setSourceExpression] =
    useState<UserPhraseItemResponse | null>(null);
  const [openingForId, setOpeningForId] = useState<string | null>(null);

  const resetError = () => setError(null);
  const close = () => setOpen(false);

  return {
    state: { open, loading, error, data, sourceExpression, openingForId },
    setters: {
      setOpen,
      setLoading,
      setError,
      setData,
      setSourceExpression,
      setOpeningForId,
    },
    resetError,
    close,
  };
}
