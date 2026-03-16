export interface ProfileRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
  english_level: string | null;
  created_at: string;
  updated_at: string;
}

export interface SceneRow {
  id: string;
  slug: string;
  title: string;
  theme: string | null;
  source_text: string | null;
  scene_json: unknown;
  translation: string | null;
  difficulty: string | null;
  origin: "seed" | "imported";
  is_public: boolean;
  created_by: string | null;
  model: string | null;
  prompt_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface SceneVariantRow {
  id: string;
  scene_id: string;
  variant_index: number;
  variant_json: unknown;
  retain_chunk_ratio: number | null;
  theme: string | null;
  model: string | null;
  prompt_version: string | null;
  cache_key: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AiCacheRow {
  id: string;
  cache_key: string;
  cache_type: string;
  status: "success" | "error";
  input_hash: string | null;
  source_ref: string | null;
  input_json: unknown;
  output_json: unknown;
  meta_json: unknown;
  model: string | null;
  prompt_version: string | null;
  created_by: string | null;
  expires_at: string | null;
  created_at: string;
}

export type LearningStatus = "not_started" | "in_progress" | "completed" | "paused";

export interface UserSceneProgressRow {
  id: string;
  user_id: string;
  scene_id: string;
  status: LearningStatus;
  progress_percent: number;
  last_sentence_index: number | null;
  last_variant_index: number | null;
  started_at: string | null;
  last_viewed_at: string | null;
  completed_at: string | null;
  total_study_seconds: number;
  today_study_seconds: number;
  saved_phrase_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserDailyLearningStatsRow {
  id: string;
  user_id: string;
  date: string;
  study_seconds: number;
  scenes_started: number;
  scenes_completed: number;
  review_items_completed: number;
  phrases_saved: number;
  created_at: string;
  updated_at: string;
}
