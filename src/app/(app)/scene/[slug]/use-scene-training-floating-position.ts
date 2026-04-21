"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";

const viewportGap = 8;
const topGap = 88;

function safelySetPointerCapture(element: HTMLElement | null, pointerId: number) {
  if (typeof element?.setPointerCapture !== "function") return;
  try {
    element.setPointerCapture(pointerId);
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return;
    throw error;
  }
}

function safelyReleasePointerCapture(element: HTMLElement | null, pointerId: number) {
  if (typeof element?.releasePointerCapture !== "function") return;
  if (
    typeof element.hasPointerCapture === "function" &&
    !element.hasPointerCapture(pointerId)
  ) {
    return;
  }
  try {
    element.releasePointerCapture(pointerId);
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return;
    throw error;
  }
}

export function useSceneTrainingFloatingPosition({
  sceneId,
  collapsedStepLabel,
  setPanelOpen,
  overlayDismissBlockedUntilRef,
}: {
  sceneId: string;
  collapsedStepLabel: string;
  setPanelOpen: Dispatch<SetStateAction<boolean>>;
  overlayDismissBlockedUntilRef: { current: number };
}) {
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") {
      return { x: 0, y: 116 };
    }
    return {
      x: Math.max(8, window.innerWidth - 152 - 8),
      y: 116,
    };
  });
  const [dragActive, setDragActive] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight,
  }));
  const [fabSize, setFabSize] = useState({ width: 152, height: 44 });
  const iconButtonRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    activated: boolean;
    cancelled: boolean;
    timer: number | null;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
    activated: false,
    cancelled: false,
    timer: null,
  });

  const viewportWidth = viewportSize.width || (typeof window === "undefined" ? 390 : window.innerWidth);
  const viewportHeight =
    viewportSize.height || (typeof window === "undefined" ? 844 : window.innerHeight);
  const positionStorageKey = `scene-training-fab-position:v3:${sceneId}`;
  const fabWidth = fabSize.width;
  const fabHeight = fabSize.height;
  const panelWidth = Math.min(
    viewportWidth - viewportGap * 2,
    viewportWidth < 640 ? Math.max(304, Math.floor(viewportWidth * 0.84)) : 344,
  );
  const panelMaxHeight = Math.max(260, viewportHeight - topGap - viewportGap * 2);

  const clampPosition = useCallback(
    (nextPosition: { x: number; y: number }) => {
      return {
        x: Math.min(
          Math.max(viewportGap, nextPosition.x),
          Math.max(viewportGap, viewportWidth - fabWidth - viewportGap),
        ),
        y: Math.min(
          Math.max(topGap, nextPosition.y),
          Math.max(topGap, viewportHeight - fabHeight - viewportGap),
        ),
      };
    },
    [fabHeight, fabWidth, viewportHeight, viewportWidth],
  );

  const clearDragTimer = useCallback(() => {
    if (dragStateRef.current.timer !== null) {
      window.clearTimeout(dragStateRef.current.timer);
      dragStateRef.current.timer = null;
    }
  }, []);

  const resetDragState = useCallback(() => {
    clearDragTimer();
    dragStateRef.current.pointerId = null;
    dragStateRef.current.moved = false;
    dragStateRef.current.activated = false;
    dragStateRef.current.cancelled = false;
    setDragActive(false);
  }, [clearDragTimer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedPosition = window.localStorage.getItem(positionStorageKey);
    const fallbackPosition = {
      x: Math.max(viewportGap, window.innerWidth - fabWidth - viewportGap),
      y: 116,
    };
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition) as { x?: number; y?: number };
        const parsedX =
          typeof parsed.x === "number" && parsed.x >= viewportWidth / 2
            ? parsed.x
            : fallbackPosition.x;
        // Restores the persisted floating position after the client viewport is known.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPosition(
          clampPosition({
            x: parsedX,
            y: typeof parsed.y === "number" ? parsed.y : fallbackPosition.y,
          }),
        );
        return;
      } catch {
        // Ignore invalid cached position.
      }
    }
    setPosition(clampPosition(fallbackPosition));
  }, [clampPosition, fabWidth, positionStorageKey, viewportWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(positionStorageKey, JSON.stringify(position));
  }, [position, positionStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateFabSize = () => {
      const nextWidth = iconButtonRef.current?.offsetWidth ?? 152;
      const nextHeight = iconButtonRef.current?.offsetHeight ?? 44;
      setFabSize((currentSize) =>
        currentSize.width === nextWidth && currentSize.height === nextHeight
          ? currentSize
          : { width: nextWidth, height: nextHeight },
      );
    };
    updateFabSize();
    const handleResize = () => {
      updateFabSize();
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
      setPosition((currentPosition) => clampPosition(currentPosition));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [clampPosition]);

  useEffect(() => {
    const nextWidth = iconButtonRef.current?.offsetWidth;
    const nextHeight = iconButtonRef.current?.offsetHeight;
    if (!nextWidth || !nextHeight) return;
    // Keeps the floating entry geometry in sync with label-driven size changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFabSize((currentSize) =>
      currentSize.width === nextWidth && currentSize.height === nextHeight
        ? currentSize
        : { width: nextWidth, height: nextHeight },
    );
  }, [collapsedStepLabel]);

  useEffect(() => () => clearDragTimer(), [clearDragTimer]);

  const showPanelOnLeft =
    position.x + fabWidth + 8 + panelWidth > viewportWidth - viewportGap;
  const rawPanelLeft = showPanelOnLeft ? -(panelWidth + 8) : fabWidth + 8;
  const minPanelLeft = viewportGap - position.x;
  const maxPanelLeft = viewportWidth - viewportGap - panelWidth - position.x;
  const panelLeft = Math.min(Math.max(rawPanelLeft, minPanelLeft), Math.max(minPanelLeft, maxPanelLeft));
  const desiredPanelTop = Math.min(
    Math.max(position.y - 8, topGap),
    Math.max(topGap, viewportHeight - panelMaxHeight - viewportGap),
  );
  const minPanelTop = topGap - position.y;
  const maxPanelTop = viewportHeight - viewportGap - panelMaxHeight - position.y;
  const panelTop = Math.min(
    Math.max(desiredPanelTop - position.y, minPanelTop),
    Math.max(minPanelTop, maxPanelTop),
  );

  const handleIconPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: position.x,
        originY: position.y,
        moved: false,
        activated: false,
        cancelled: false,
        timer: window.setTimeout(() => {
          if (dragStateRef.current.pointerId !== event.pointerId) return;
          dragStateRef.current.activated = true;
          setDragActive(true);
          safelySetPointerCapture(iconButtonRef.current, event.pointerId);
        }, 180),
      };
    },
    [position.x, position.y],
  );

  const handleIconPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (dragStateRef.current.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const deltaX = event.clientX - dragStateRef.current.startX;
      const deltaY = event.clientY - dragStateRef.current.startY;

      if (!dragStateRef.current.activated) {
        return;
      }

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragStateRef.current.moved = true;
      }
      event.preventDefault();
      setPosition(
        clampPosition({
          x: dragStateRef.current.originX + deltaX,
          y: dragStateRef.current.originY + deltaY,
        }),
      );
    },
    [clampPosition],
  );

  const handleIconPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (dragStateRef.current.cancelled) {
        resetDragState();
        return;
      }
      if (dragStateRef.current.pointerId !== event.pointerId) return;
      const { activated, moved } = dragStateRef.current;
      clearDragTimer();

      if (activated) {
        safelyReleasePointerCapture(event.currentTarget, event.pointerId);
      }

      if (activated && moved) {
        setPosition((currentPosition) => {
          const snappedX =
            currentPosition.x + fabWidth / 2 < viewportWidth / 2
              ? viewportGap
              : Math.max(viewportGap, viewportWidth - fabWidth - viewportGap);
          return clampPosition({
            x: snappedX,
            y: currentPosition.y,
          });
        });
        resetDragState();
        return;
      }

      setPanelOpen((prev) => {
        if (!prev) {
          overlayDismissBlockedUntilRef.current = Date.now() + 240;
        }
        return !prev;
      });
      resetDragState();
    },
    [
      clampPosition,
      clearDragTimer,
      fabWidth,
      overlayDismissBlockedUntilRef,
      resetDragState,
      setPanelOpen,
      viewportWidth,
    ],
  );

  const handleIconPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      clearDragTimer();
      if (dragStateRef.current.activated) {
        safelyReleasePointerCapture(event.currentTarget, event.pointerId);
      }
      resetDragState();
    },
    [clearDragTimer, resetDragState],
  );

  return {
    dragActive,
    fabHeight,
    handleIconPointerCancel,
    handleIconPointerDown,
    handleIconPointerMove,
    handleIconPointerUp,
    iconButtonRef,
    panelLeft,
    panelMaxHeight,
    panelTop,
    panelWidth,
    position,
  };
}
