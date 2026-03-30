import { SceneListItemResponse } from "@/lib/utils/scenes-api";

export const SCENE_STATUS_TEXT_CLASSNAME: Record<
  SceneListItemResponse["learningStatus"],
  string
> = {
  not_started: "text-[var(--app-scene-status-not-started)]",
  in_progress: "text-[var(--app-scene-status-in-progress)]",
  completed: "text-[var(--app-scene-status-completed)]",
  paused: "text-[var(--app-scene-status-paused)]",
};
