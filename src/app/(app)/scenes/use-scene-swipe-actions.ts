"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ACTION_WIDTH = 96;
const OPEN_THRESHOLD = 48;
const QUICK_OPEN_THRESHOLD = 24;
const MAX_OVERSHOOT = 18;

type GestureState = {
  sceneId: string;
  startX: number;
  startY: number;
  startOffset: number;
  horizontalLocked: boolean;
  verticalCancelled: boolean;
};

export function useSceneSwipeActions() {
  const [openSwipeSceneId, setOpenSwipeSceneId] = useState<string | null>(null);
  const [swipeOffsetMap, setSwipeOffsetMap] = useState<Record<string, number>>({});
  const gestureRef = useRef<GestureState | null>(null);

  const setCardOffset = useCallback((sceneId: string, offset: number) => {
    setSwipeOffsetMap((prev) => {
      const next = { ...prev };
      if (offset === 0) {
        delete next[sceneId];
      } else {
        next[sceneId] = offset;
      }
      return next;
    });
  }, []);

  const closeOpenedSwipe = useCallback((exceptSceneId?: string | null) => {
    setOpenSwipeSceneId((prev) => {
      if (!prev || prev === exceptSceneId) return prev ?? null;
      setCardOffset(prev, 0);
      return null;
    });
  }, [setCardOffset]);

  const openSwipe = useCallback((sceneId: string) => {
    closeOpenedSwipe(sceneId);
    setCardOffset(sceneId, -ACTION_WIDTH);
    setOpenSwipeSceneId(sceneId);
  }, [closeOpenedSwipe, setCardOffset]);

  const closeSwipe = useCallback((sceneId: string) => {
    setCardOffset(sceneId, 0);
    setOpenSwipeSceneId((prev) => (prev === sceneId ? null : prev));
  }, [setCardOffset]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("[data-swipe-row]") ||
        target?.closest("[data-delete-modal]") ||
        target?.closest("[data-import-dialog]")
      ) {
        return;
      }
      closeOpenedSwipe();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closeOpenedSwipe]);

  const getRowGestureHandlers = useCallback((params: {
    sceneId: string;
    swipeEnabled: boolean;
    swipeOffset: number;
    onWarmup: () => void;
  }) => {
    const { sceneId, swipeEnabled, swipeOffset, onWarmup } = params;
    return {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        onWarmup();
        if (!swipeEnabled) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        gestureRef.current = {
          sceneId,
          startX: event.clientX,
          startY: event.clientY,
          startOffset: swipeOffset,
          horizontalLocked: false,
          verticalCancelled: false,
        };
        (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.sceneId !== sceneId || !swipeEnabled) return;

        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;

        if (!gesture.horizontalLocked && !gesture.verticalCancelled) {
          if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
            gesture.horizontalLocked = true;
          } else if (Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) {
            gesture.verticalCancelled = true;
          }
        }

        if (gesture.verticalCancelled || !gesture.horizontalLocked) return;

        let nextX = gesture.startOffset + dx;
        if (nextX > 0) {
          nextX = Math.min(nextX * 0.28, MAX_OVERSHOOT);
        }
        if (nextX < -ACTION_WIDTH) {
          const extra = nextX + ACTION_WIDTH;
          nextX = -ACTION_WIDTH + extra * 0.28;
          nextX = Math.max(nextX, -ACTION_WIDTH - MAX_OVERSHOOT);
        }

        closeOpenedSwipe(sceneId);
        setCardOffset(sceneId, nextX);
      },
      onPointerUp: () => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.sceneId !== sceneId || !swipeEnabled) return;
        gestureRef.current = null;
        if (gesture.verticalCancelled) return;
        const currentX = swipeOffsetMap[sceneId] ?? swipeOffset;
        const absX = Math.abs(currentX);
        if (
          currentX <= -OPEN_THRESHOLD ||
          (gesture.startOffset === -ACTION_WIDTH && absX > QUICK_OPEN_THRESHOLD)
        ) {
          openSwipe(sceneId);
        } else {
          closeSwipe(sceneId);
        }
      },
      onPointerCancel: () => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.sceneId !== sceneId || !swipeEnabled) return;
        gestureRef.current = null;
        closeSwipe(sceneId);
      },
    };
  }, [closeOpenedSwipe, closeSwipe, openSwipe, setCardOffset, swipeOffsetMap]);

  return {
    openSwipeSceneId,
    swipeOffsetMap,
    closeOpenedSwipe,
    closeSwipe,
    getRowGestureHandlers,
  };
}
