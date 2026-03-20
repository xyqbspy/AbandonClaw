"use client";

import { useEffect, useState } from "react";
import {
  getTtsPlaybackState,
  subscribeTtsPlaybackState,
  type TtsPlaybackState,
} from "@/lib/utils/tts-api";

export function useTtsPlaybackState() {
  const [state, setState] = useState<TtsPlaybackState>(getTtsPlaybackState());

  useEffect(() => subscribeTtsPlaybackState(setState), []);

  return state;
}

