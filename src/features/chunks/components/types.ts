"use client";

import { UserPhraseItemResponse, UserPhraseRelationItemResponse } from "@/lib/utils/phrases-api";

export type MoveIntoClusterCandidate = {
  row: UserPhraseItemResponse;
  sourceClusterId: string | null;
  sourceClusterMainText: string;
  sourceClusterMemberCount: number;
  isSourceMain: boolean;
};

export type MoveIntoClusterGroup = {
  key: string;
  title: string;
  description: string;
  candidates: MoveIntoClusterCandidate[];
  isCluster: boolean;
};

export type FocusPreviewItem = {
  key: string;
  text: string;
  differenceLabel?: string;
  kind: "library-similar" | "suggested-similar" | "contrast" | "current";
  savedItem?: UserPhraseItemResponse | null;
};

export type SavedRelationRowsBySourceId = Record<string, UserPhraseRelationItemResponse[]>;
