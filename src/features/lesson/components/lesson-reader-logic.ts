import { LessonSentence } from "@/lib/types";

export type SelectionState = {
  text: string;
  sentenceId: string;
  top: number;
  left: number;
};

export type InteractionState = {
  activeSentenceId: string | null;
  activeChunkKey: string | null;
  hoveredChunkKey: string | null;
  selectionState: SelectionState | null;
};

export type InteractionAction =
  | { type: "SENTENCE_SELECTED_FROM_SELECTION"; payload: SelectionState }
  | { type: "SENTENCE_CONTEXT_SET"; payload: { sentenceId: string } }
  | { type: "SELECTION_CLEARED" }
  | {
      type: "CHUNK_ACTIVATED";
      payload: { sentenceId: string; chunkKey: string };
    }
  | { type: "CHUNK_HOVERED"; payload: { chunkKey: string | null } };

export type MobileSentenceGroup = {
  key: string;
  sentenceIds: string[];
  text: string;
  translation: string;
  relatedChunks: string[];
  speaker?: string;
};

export function groupSentencesForMobile(sentences: LessonSentence[]) {
  const groups: Array<typeof sentences> = [];
  let index = 0;

  while (index < sentences.length) {
    const current = sentences[index];
    const next = sentences[index + 1];
    const isCurrentLong = current.text.length > 95;
    const hasSpeaker = Boolean(current.speaker || next?.speaker);

    if (isCurrentLong || !next || hasSpeaker) {
      groups.push([current]);
      index += 1;
      continue;
    }

    const looksLikeQuestion = /[?？！]\s*$/.test(current.text.trim());
    const areBothShort = current.text.length <= 80 && next.text.length <= 80;

    if (looksLikeQuestion || areBothShort) {
      groups.push([current, next]);
      index += 2;
      continue;
    }

    groups.push([current]);
    index += 1;
  }

  return groups;
}

export function interactionReducer(
  state: InteractionState,
  action: InteractionAction,
): InteractionState {
  switch (action.type) {
    case "SENTENCE_SELECTED_FROM_SELECTION":
      return {
        activeSentenceId: action.payload.sentenceId,
        activeChunkKey: null,
        hoveredChunkKey: null,
        selectionState: action.payload,
      };
    case "SENTENCE_CONTEXT_SET":
      return {
        ...state,
        activeSentenceId: action.payload.sentenceId,
        activeChunkKey: null,
        hoveredChunkKey: null,
      };
    case "SELECTION_CLEARED":
      return {
        ...state,
        selectionState: null,
      };
    case "CHUNK_ACTIVATED":
      return {
        activeSentenceId: action.payload.sentenceId,
        activeChunkKey: action.payload.chunkKey,
        hoveredChunkKey: null,
        selectionState: null,
      };
    case "CHUNK_HOVERED":
      return {
        ...state,
        hoveredChunkKey: action.payload.chunkKey,
      };
    default:
      return state;
  }
}
