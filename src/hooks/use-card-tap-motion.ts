"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";

type TapMotionOptions = {
  ignoreSelector?: string;
  activationDurationMs?: number;
};

type TapMotionProps = {
  "data-pressed": "true" | "false";
  "data-activated": "true" | "false";
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
};

const DEFAULT_ACTIVATION_MS = 820;

export function useCardTapMotion() {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [activatedId, setActivatedId] = useState<string | null>(null);
  const activationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (!activationTimeoutRef.current) return;
      clearTimeout(activationTimeoutRef.current);
    };
  }, []);

  const isIgnoredTarget = useCallback((target: EventTarget | null, ignoreSelector?: string) => {
    if (!ignoreSelector) return false;
    return target instanceof Element && Boolean(target.closest(ignoreSelector));
  }, []);

  const triggerActivation = useCallback((id: string, durationMs: number) => {
    setActivatedId(id);
    if (activationTimeoutRef.current) {
      clearTimeout(activationTimeoutRef.current);
    }
    activationTimeoutRef.current = setTimeout(() => {
      setActivatedId((prev) => (prev === id ? null : prev));
    }, durationMs);
  }, []);

  const getTapMotionProps = useCallback(
    (id: string, options?: TapMotionOptions): TapMotionProps => {
      const ignoreSelector = options?.ignoreSelector;
      const durationMs = options?.activationDurationMs ?? DEFAULT_ACTIVATION_MS;

      return {
        "data-pressed": pressedId === id ? "true" : "false",
        "data-activated": activatedId === id ? "true" : "false",
        onPointerDown: (event) => {
          if (isIgnoredTarget(event.target, ignoreSelector)) return;
          setPressedId(id);
        },
        onPointerUp: (event) => {
          if (isIgnoredTarget(event.target, ignoreSelector)) return;
          setPressedId((prev) => (prev === id ? null : prev));
          triggerActivation(id, durationMs);
        },
        onPointerCancel: () => {
          setPressedId((prev) => (prev === id ? null : prev));
        },
        onPointerLeave: () => {
          setPressedId((prev) => (prev === id ? null : prev));
        },
        onClick: (event) => {
          if (isIgnoredTarget(event.target, ignoreSelector)) return;
          if (event.detail === 0) {
            triggerActivation(id, durationMs);
          }
        },
      };
    },
    [activatedId, isIgnoredTarget, pressedId, triggerActivation],
  );

  return { getTapMotionProps };
}
