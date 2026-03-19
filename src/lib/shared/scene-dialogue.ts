import {
  ParsedScene,
  ParsedSceneChunk,
  ParsedSceneDialogueLine,
  ParsedSceneSpeaker,
  ParsedSceneSection,
} from "@/lib/types/scene-parser";

const normalizeSceneType = (value: unknown): "dialogue" | "monologue" | null => {
  if (value === "dialogue" || value === "monologue") return value;
  return null;
};

const normalizeSpeaker = (value: unknown, fallbackIndex: number): ParsedSceneSpeaker => {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (normalized === "A" || normalized === "B") return normalized;
  }
  return fallbackIndex % 2 === 0 ? "A" : "B";
};

const fallbackChunkFromLineText = (lineText: string): ParsedSceneChunk[] => {
  const text = lineText.trim();
  if (!text) return [];
  return [
    {
      key: text.slice(0, 60),
      text,
      translation: text,
      grammarLabel: "Chunk",
      meaningInSentence: text,
      usageNote: "Useful expression in this context.",
      examples: [{ en: text, zh: text }],
    },
  ];
};

export const buildDialogueFromSections = (
  sections: ParsedSceneSection[],
): ParsedSceneDialogueLine[] => {
  const dialogue: ParsedSceneDialogueLine[] = [];
  let index = 0;
  for (const section of sections) {
    for (const sentence of section.sentences) {
      const text = sentence.text?.trim() ?? "";
      if (!text) continue;
      dialogue.push({
        id: sentence.id || `dlg-${index + 1}`,
        speaker: normalizeSpeaker(sentence.speaker, index),
        text,
        translation: sentence.translation?.trim() || text,
        tts: sentence.audioText?.trim() || text,
        chunks:
          Array.isArray(sentence.chunks) && sentence.chunks.length > 0
            ? sentence.chunks
            : fallbackChunkFromLineText(text),
      });
      index += 1;
    }
  }
  return dialogue;
};

export const buildSectionsFromDialogue = (
  dialogue: ParsedSceneDialogueLine[],
): ParsedSceneSection[] => {
  const sentences = dialogue.map((line, index) => {
    const text = line.text?.trim() ?? "";
    const translation = line.translation?.trim() || text;
    return {
      id: line.id || `s${index + 1}`,
      speaker: normalizeSpeaker(line.speaker, index),
      text,
      translation,
      audioText: line.tts?.trim() || text,
      chunks:
        Array.isArray(line.chunks) && line.chunks.length > 0
          ? line.chunks
          : fallbackChunkFromLineText(text),
    };
  });

  return [
    {
      id: "dialogue-main",
      title: "Dialogue",
      summary: sentences[0]?.text.slice(0, 80) || "Dialogue scene",
      sentences,
    },
  ];
};

export const normalizeParsedSceneDialogue = (scene: ParsedScene): ParsedScene => {
  const rawType = normalizeSceneType(scene.type);
  const hasDialogue = Array.isArray(scene.dialogue) && scene.dialogue.length > 0;
  const hasSections = Array.isArray(scene.sections) && scene.sections.length > 0;
  const hasDialogueWithSpeaker =
    hasDialogue &&
    scene.dialogue.some((line) => line?.speaker === "A" || line?.speaker === "B");

  let dialogue: ParsedSceneDialogueLine[] = [];
  if (hasDialogueWithSpeaker) {
    dialogue = scene.dialogue.reduce<ParsedSceneDialogueLine[]>((result, line, index) => {
      const text = line.text?.trim() ?? "";
      if (!text) return result;
      result.push({
        id: line.id || `dlg-${index + 1}`,
        speaker: normalizeSpeaker(line.speaker, index),
        text,
        translation: line.translation?.trim() || text,
        tts: line.tts?.trim() || text,
        chunks:
          Array.isArray(line.chunks) && line.chunks.length > 0
            ? line.chunks
            : fallbackChunkFromLineText(text),
      });
      return result;
    }, []);
  }

  const inferredType: "dialogue" | "monologue" =
    rawType ?? (dialogue.length > 0 ? "dialogue" : "monologue");
  const sections =
    hasSections
      ? scene.sections
      : dialogue.length > 0
        ? buildSectionsFromDialogue(dialogue)
        : [];

  return {
    ...scene,
    type: inferredType,
    dialogue,
    sections,
  };
};
