"use client";

import { useCallback, useRef, useState } from "react";

type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
};

export function useSpeech() {
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setSpeakingText(null);
  }, [supported]);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      const clean = text.trim();
      if (!clean || !supported) return false;

      stop();

      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = options?.lang ?? "en-US";
      utter.rate = options?.rate ?? 1;
      utter.pitch = options?.pitch ?? 1;
      utter.onstart = () => setSpeakingText(clean);
      utter.onend = () => setSpeakingText((prev) => (prev === clean ? null : prev));
      utter.onerror = () => setSpeakingText((prev) => (prev === clean ? null : prev));

      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
      return true;
    },
    [stop, supported],
  );

  return {
    speak,
    stop,
    supported,
    speakingText,
  };
}
