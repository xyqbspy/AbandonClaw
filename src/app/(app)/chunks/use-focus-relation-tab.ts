"use client";

import { useState } from "react";

export type FocusDetailConfirmAction =
  | "set-cluster-main"
  | "set-standalone-main"
  | "delete-expression";

export type FocusRelationTabKey = "similar" | "contrast";

export type UseFocusRelationTabResult = {
  focusRelationTab: FocusRelationTabKey;
  setFocusRelationTab: React.Dispatch<React.SetStateAction<FocusRelationTabKey>>;
  expandedFocusMainId: string | null;
  setExpandedFocusMainId: React.Dispatch<React.SetStateAction<string | null>>;
  focusRelationActiveText: string;
  setFocusRelationActiveText: React.Dispatch<React.SetStateAction<string>>;
  detailConfirmAction: FocusDetailConfirmAction | null;
  setDetailConfirmAction: React.Dispatch<
    React.SetStateAction<FocusDetailConfirmAction | null>
  >;
  focusDetailActionsOpen: boolean;
  setFocusDetailActionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useFocusRelationTab(): UseFocusRelationTabResult {
  const [focusRelationTab, setFocusRelationTab] =
    useState<FocusRelationTabKey>("similar");
  const [expandedFocusMainId, setExpandedFocusMainId] = useState<string | null>(
    null,
  );
  const [focusRelationActiveText, setFocusRelationActiveText] = useState("");
  const [detailConfirmAction, setDetailConfirmAction] =
    useState<FocusDetailConfirmAction | null>(null);
  const [focusDetailActionsOpen, setFocusDetailActionsOpen] = useState(false);

  return {
    focusRelationTab,
    setFocusRelationTab,
    expandedFocusMainId,
    setExpandedFocusMainId,
    focusRelationActiveText,
    setFocusRelationActiveText,
    detailConfirmAction,
    setDetailConfirmAction,
    focusDetailActionsOpen,
    setFocusDetailActionsOpen,
  };
}
