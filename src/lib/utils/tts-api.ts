import { buildChunkAudioKey } from "@/lib/shared/tts";

type SentenceTtsPayload = {
  kind: "sentence";
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: "normal" | "slow";
};

type SceneFullSegment = {
  text: string;
  speaker?: string;
};

type SceneFullTtsPayload = {
  kind: "scene_full";
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: SceneFullSegment[];
};

type ChunkTtsPayload = {
  kind: "chunk";
  chunkKey?: string;
  text: string;
};

export type TtsRequestPayload = SentenceTtsPayload | ChunkTtsPayload | SceneFullTtsPayload;

interface TtsResponse {
  url?: string;
  cached?: boolean;
  error?: string;
}

export type TtsPlaybackState = {
  kind: "sentence" | "chunk" | "scene" | null;
  sentenceId?: string;
  chunkKey?: string;
  sceneSlug?: string;
  mode?: "normal" | "slow";
  isLooping?: boolean;
  text?: string;
};

let currentAudio: HTMLAudioElement | null = null;
let playbackGeneration = 0;
let playbackState: TtsPlaybackState = {
  kind: null,
  isLooping: false,
};
const playbackListeners = new Set<(state: TtsPlaybackState) => void>();

const emitPlaybackState = () => {
  for (const listener of playbackListeners) {
    listener(playbackState);
  }
};

const setPlaybackState = (next: TtsPlaybackState) => {
  playbackState = next;
  emitPlaybackState();
};

export const getTtsPlaybackState = () => playbackState;

export const subscribeTtsPlaybackState = (listener: (state: TtsPlaybackState) => void) => {
  playbackListeners.add(listener);
  return () => {
    playbackListeners.delete(listener);
  };
};

export const setTtsLooping = (isLooping: boolean) => {
  setPlaybackState({
    ...playbackState,
    isLooping,
  });
};

const extractError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as TtsResponse;
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // ignore
  }
  return fallback;
};

const speakByBrowser = async (text: string, mode: "normal" | "slow" = "normal") => {
  if (typeof window === "undefined") {
    throw new Error("window is unavailable");
  }
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    throw new Error("speechSynthesis is unavailable");
  }
  await new Promise<void>((resolve, reject) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = mode === "slow" ? 0.8 : 1;
    utter.onend = () => resolve();
    utter.onerror = () => reject(new Error("speechSynthesis playback failed"));
    window.speechSynthesis.cancel();
    utter.text = text;
    window.speechSynthesis.speak(utter);
  });
};

const fallbackSpeakSafe = async (text: string, mode: "normal" | "slow") => {
  try {
    await speakByBrowser(text, mode);
    return true;
  } catch {
    return false;
  }
};

export const stopTtsPlayback = () => {
  playbackGeneration += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  setPlaybackState({
    kind: null,
    isLooping: false,
    text: undefined,
  });
};

const playAudioUrl = async (url: string) => {
  stopTtsPlayback();
  const generation = playbackGeneration + 1;
  playbackGeneration = generation;
  const audio = new Audio(url);
  currentAudio = audio;
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      setPlaybackState({
        kind: null,
        isLooping: playbackState.isLooping ?? false,
        text: undefined,
      });
      resolve();
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      setPlaybackState({
        kind: null,
        isLooping: playbackState.isLooping ?? false,
        text: undefined,
      });
      reject(new Error("audio playback failed"));
    };
    audio
      .play()
      .then(() => {
        // started
      })
      .catch((error) => {
        if (currentAudio === audio) currentAudio = null;
        reject(error);
      });
  });
  if (generation !== playbackGeneration) return;
};

export async function ensureSentenceAudio(params: {
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: "normal" | "slow";
}) {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: "sentence",
      sceneSlug: params.sceneSlug,
      sentenceId: params.sentenceId,
      text: params.text,
      speaker: params.speaker,
      mode: params.mode ?? "normal",
    } satisfies SentenceTtsPayload),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to generate sentence audio."));
  }
  const data = (await response.json()) as TtsResponse;
  if (!data.url) {
    throw new Error("Invalid sentence audio response.");
  }
  return data.url;
}

export async function ensureChunkAudio(params: {
  chunkText: string;
  chunkKey?: string;
}) {
  const key = params.chunkKey ?? buildChunkAudioKey(params.chunkText);
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: "chunk",
      chunkKey: key,
      text: params.chunkText,
    } satisfies ChunkTtsPayload),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to generate chunk audio."));
  }
  const data = (await response.json()) as TtsResponse;
  if (!data.url) {
    throw new Error("Invalid chunk audio response.");
  }
  return data.url;
}

export async function ensureSceneFullAudio(params: {
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: Array<{ text: string; speaker?: string }>;
}) {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: "scene_full",
      sceneSlug: params.sceneSlug,
      sceneType: params.sceneType ?? "monologue",
      segments: params.segments,
    } satisfies SceneFullTtsPayload),
  });
  if (!response.ok) {
    throw new Error(await extractError(response, "Failed to generate full scene audio."));
  }
  const data = (await response.json()) as TtsResponse;
  if (!data.url) {
    throw new Error("Invalid full scene audio response.");
  }
  return data.url;
}

export async function playSentenceAudio(params: {
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: "normal" | "slow";
}) {
  setPlaybackState({
    kind: "sentence",
    sentenceId: params.sentenceId,
    mode: params.mode ?? "normal",
    isLooping: playbackState.isLooping ?? false,
    text: params.text,
  });
  try {
    const url = await ensureSentenceAudio(params);
    await playAudioUrl(url);
    return { ok: true as const, url };
  } catch {
    const spoken = await fallbackSpeakSafe(params.text, params.mode ?? "normal");
    if (spoken) {
      return { ok: true as const, url: null };
    }
    throw new Error("语音播放失败，请稍后重试。");
  } finally {
    setPlaybackState({
      kind: null,
      isLooping: playbackState.isLooping ?? false,
      text: undefined,
    });
  }
}

export async function playChunkAudio(params: { chunkText: string; chunkKey?: string }) {
  const chunkKey = params.chunkKey ?? buildChunkAudioKey(params.chunkText);
  setPlaybackState({
    kind: "chunk",
    chunkKey,
    mode: "normal",
    isLooping: playbackState.isLooping ?? false,
    text: params.chunkText,
  });
  try {
    const url = await ensureChunkAudio({ ...params, chunkKey });
    await playAudioUrl(url);
    return { ok: true as const, url };
  } catch {
    const spoken = await fallbackSpeakSafe(params.chunkText, "normal");
    if (spoken) {
      return { ok: true as const, url: null };
    }
    throw new Error("语音播放失败，请稍后重试。");
  } finally {
    setPlaybackState({
      kind: null,
      isLooping: playbackState.isLooping ?? false,
      text: undefined,
    });
  }
}

export async function playSceneLoopAudio(params: {
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: Array<{ text: string; speaker?: string }>;
}) {
  const activeSceneLoop =
    playbackState.kind === "scene" &&
    playbackState.sceneSlug === params.sceneSlug &&
    Boolean(playbackState.isLooping);
  if (activeSceneLoop) {
    stopTtsPlayback();
    return { ok: true as const, url: null, stopped: true as const };
  }

  stopTtsPlayback();
  setPlaybackState({
    kind: "scene",
    sceneSlug: params.sceneSlug,
    isLooping: true,
    text: params.sceneSlug,
  });
  const generation = playbackGeneration;

  try {
    const url = await ensureSceneFullAudio(params);
    if (
      playbackGeneration !== generation ||
      playbackState.kind !== "scene" ||
      playbackState.sceneSlug !== params.sceneSlug ||
      !playbackState.isLooping
    ) {
      return { ok: true as const, url: null, stopped: true as const };
    }
    const audio = new Audio(url);
    audio.loop = true;
    currentAudio = audio;
    audio.onerror = () => {
      if (currentAudio === audio) {
        currentAudio = null;
      }
      setPlaybackState({
        kind: null,
        isLooping: false,
        text: undefined,
      });
    };
    await audio.play();
    return { ok: true as const, url, stopped: false as const };
  } catch (error) {
    setPlaybackState({
      kind: null,
      isLooping: false,
      text: undefined,
    });
    throw error;
  }
}

// Backward-compatible aliases currently used in reader code.
export const ensureSentenceTtsFromApi = ensureSentenceAudio;
export const ensureChunkTtsFromApi = ensureChunkAudio;
