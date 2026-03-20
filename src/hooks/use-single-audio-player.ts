"use client";

import { useCallback, useEffect, useState } from "react";

type AudioSnapshot = {
  key: string | null;
  label: string | null;
};

type PlayPayload = {
  url: string;
  key: string;
  label?: string | null;
};

let globalAudio: HTMLAudioElement | null = null;
let globalSnapshot: AudioSnapshot = {
  key: null,
  label: null,
};
const listeners = new Set<(snapshot: AudioSnapshot) => void>();

const emit = () => {
  for (const listener of listeners) {
    listener(globalSnapshot);
  }
};

const setSnapshot = (snapshot: AudioSnapshot) => {
  globalSnapshot = snapshot;
  emit();
};

const stopGlobalAudio = () => {
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.currentTime = 0;
    globalAudio = null;
  }
  if (globalSnapshot.key || globalSnapshot.label) {
    setSnapshot({ key: null, label: null });
  }
};

const playGlobalAudio = async (payload: PlayPayload) => {
  stopGlobalAudio();

  const audio = new Audio(payload.url);
  globalAudio = audio;
  setSnapshot({
    key: payload.key,
    label: payload.label ?? null,
  });

  audio.onended = () => {
    if (globalAudio === audio) {
      globalAudio = null;
      setSnapshot({ key: null, label: null });
    }
  };
  audio.onerror = () => {
    if (globalAudio === audio) {
      globalAudio = null;
      setSnapshot({ key: null, label: null });
    }
  };

  try {
    await audio.play();
  } catch (error) {
    if (globalAudio === audio) {
      globalAudio = null;
      setSnapshot({ key: null, label: null });
    }
    throw error;
  }
};

const playGlobalAudioUntilEnd = async (payload: PlayPayload) => {
  stopGlobalAudio();

  const audio = new Audio(payload.url);
  globalAudio = audio;
  setSnapshot({
    key: payload.key,
    label: payload.label ?? null,
  });

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      if (globalAudio === audio) {
        globalAudio = null;
        setSnapshot({ key: null, label: null });
      }
      resolve();
    };
    audio.onerror = () => {
      if (globalAudio === audio) {
        globalAudio = null;
        setSnapshot({ key: null, label: null });
      }
      reject(new Error("audio play failed"));
    };
    audio.play().catch((error) => {
      if (globalAudio === audio) {
        globalAudio = null;
        setSnapshot({ key: null, label: null });
      }
      reject(error);
    });
  });
};

export function useSingleAudioPlayer() {
  const [snapshot, setLocalSnapshot] = useState<AudioSnapshot>(globalSnapshot);

  useEffect(() => {
    listeners.add(setLocalSnapshot);
    return () => {
      listeners.delete(setLocalSnapshot);
    };
  }, []);

  const stop = useCallback(() => {
    stopGlobalAudio();
  }, []);

  const play = useCallback(async (payload: PlayPayload) => {
    await playGlobalAudio(payload);
  }, []);
  const playUntilEnd = useCallback(async (payload: PlayPayload) => {
    await playGlobalAudioUntilEnd(payload);
  }, []);

  return {
    playingKey: snapshot.key,
    playingLabel: snapshot.label,
    play,
    playUntilEnd,
    stop,
  };
}
