import { useCallback, useState } from "react";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { regenerateChunkAudioBatch } from "@/lib/utils/tts-api";
import type { buildFocusDetailViewModel } from "@/features/chunks/components/focus-detail-selectors";

import {
  notifyChunksFocusDetailNoSourceSentence,
  notifyChunksFocusDetailRegenerateAudioFailed,
  notifyChunksFocusDetailRegenerateAudioSuccess,
} from "./chunks-focus-detail-notify";

type FocusDetailLite = {
  savedItem: {
    exampleSentences?: Array<{ en?: string | null }> | null;
  } | null;
} | null;

type UseDetailAudioActionsArgs = {
  focusDetail: FocusDetailLite;
  focusDetailViewModel: ReturnType<typeof buildFocusDetailViewModel>;
  setFocusDetailActionsOpen: (open: boolean) => void;
};

export type UseDetailAudioActionsReturn = {
  regenerating: boolean;
  regenerate: () => Promise<void>;
};

export function useDetailAudioActions({
  focusDetail,
  focusDetailViewModel,
  setFocusDetailActionsOpen,
}: UseDetailAudioActionsArgs): UseDetailAudioActionsReturn {
  const [regenerating, setRegenerating] = useState(false);

  const regenerate = useCallback(async () => {
    if (!focusDetail || regenerating) return;

    const fallbackExamples =
      focusDetail.savedItem?.exampleSentences ??
      focusDetailViewModel.activeAssistItem?.examples ??
      [];
    const candidateTexts = [
      focusDetailViewModel.detailSpeakText,
      ...fallbackExamples.map((example: { en?: string | null }) => example.en?.trim() ?? ""),
    ]
      .map((text) => text.trim())
      .filter(Boolean);
    const uniqueTexts = Array.from(new Set(candidateTexts));

    if (uniqueTexts.length === 0) {
      notifyChunksFocusDetailNoSourceSentence();
      return;
    }

    setRegenerating(true);
    try {
      await regenerateChunkAudioBatch(
        uniqueTexts.map((text) => ({
          chunkText: text,
          chunkKey: buildChunkAudioKey(text),
        })),
      );
      setFocusDetailActionsOpen(false);
      notifyChunksFocusDetailRegenerateAudioSuccess();
    } catch (error) {
      notifyChunksFocusDetailRegenerateAudioFailed(
        error instanceof Error ? error.message : null,
      );
    } finally {
      setRegenerating(false);
    }
  }, [
    focusDetail,
    focusDetailViewModel,
    regenerating,
    setFocusDetailActionsOpen,
  ]);

  return { regenerating, regenerate };
}
