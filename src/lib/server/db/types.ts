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
export type SceneMasteryStage =
  | "listening"
  | "focus"
  | "sentence_practice"
  | "scene_practice"
  | "variant_unlocked"
  | "mastered";
export type SceneTrainingStep =
  | "listen"
  | "focus_expression"
  | "practice_sentence"
  | "scene_practice"
  | "done";
export type ScenePracticeMode =
  | "cloze"
  | "guided_recall"
  | "sentence_recall"
  | "full_dictation";
export type ScenePracticeRunStatus = "in_progress" | "completed" | "abandoned";
export type SceneVariantRunStatus = "in_progress" | "completed" | "abandoned";
export type ScenePracticeAssessmentLevel =
  | "incorrect"
  | "keyword"
  | "structure"
  | "complete";

export interface UserSceneProgressRow {
  id: string;
  user_id: string;
  scene_id: string;
  status: LearningStatus;
  progress_percent: number;
  mastery_stage: SceneMasteryStage;
  mastery_percent: number;
  last_sentence_index: number | null;
  last_variant_index: number | null;
  started_at: string | null;
  last_viewed_at: string | null;
  completed_at: string | null;
  variant_unlocked_at: string | null;
  last_practiced_at: string | null;
  total_study_seconds: number;
  today_study_seconds: number;
  saved_phrase_count: number;
  focused_expression_count: number;
  practiced_sentence_count: number;
  scene_practice_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserSceneSessionRow {
  id: string;
  user_id: string;
  scene_id: string;
  current_step: SceneTrainingStep;
  selected_block_id: string | null;
  full_play_count: number;
  opened_expression_count: number;
  practiced_sentence_count: number;
  scene_practice_completed: boolean;
  is_done: boolean;
  started_at: string;
  ended_at: string | null;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserScenePracticeRunRow {
  id: string;
  user_id: string;
  scene_id: string;
  session_id: string | null;
  practice_set_id: string;
  source_type: "original" | "variant";
  source_variant_id: string | null;
  status: ScenePracticeRunStatus;
  current_mode: ScenePracticeMode;
  completed_modes: string[];
  started_at: string;
  completed_at: string | null;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserScenePracticeAttemptRow {
  id: string;
  run_id: string;
  user_id: string;
  scene_id: string;
  session_id: string | null;
  practice_set_id: string;
  mode: ScenePracticeMode;
  exercise_id: string;
  sentence_id: string | null;
  user_answer: string;
  assessment_level: ScenePracticeAssessmentLevel;
  is_correct: boolean;
  attempt_index: number;
  metadata_json: unknown;
  created_at: string;
}

export interface UserSceneVariantRunRow {
  id: string;
  user_id: string;
  scene_id: string;
  session_id: string | null;
  variant_set_id: string;
  active_variant_id: string | null;
  viewed_variant_ids: string[];
  status: SceneVariantRunStatus;
  started_at: string;
  completed_at: string | null;
  last_active_at: string;
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

export interface PhraseRow {
  id: string;
  normalized_text: string;
  display_text: string;
  translation: string | null;
  usage_note: string | null;
  difficulty: string | null;
  tags: unknown;
  created_at: string;
  updated_at: string;
}

export type UserPhraseStatus = "saved" | "archived";
export type UserPhraseReviewStatus = "saved" | "reviewing" | "mastered" | "archived";
export type UserPhraseAiEnrichmentStatus = "pending" | "done" | "failed";
export type UserPhraseRelationType = "similar" | "contrast";

export interface UserPhraseRow {
  id: string;
  user_id: string;
  phrase_id: string;
  status: UserPhraseStatus;
  review_status: UserPhraseReviewStatus;
  review_count: number;
  correct_count: number;
  incorrect_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  mastered_at: string | null;
  source_scene_id: string | null;
  source_scene_slug: string | null;
  source_type: "scene" | "manual" | null;
  source_note: string | null;
  source_sentence_index: number | null;
  source_sentence_text: string | null;
  source_chunk_text: string | null;
  ai_enrichment_status: UserPhraseAiEnrichmentStatus | null;
  ai_semantic_focus: string | null;
  ai_typical_scenario: string | null;
  ai_example_sentences: unknown;
  ai_enrichment_error: string | null;
  learning_item_type: "expression" | "sentence" | null;
  saved_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserPhraseRelationRow {
  id: string;
  user_id: string;
  source_user_phrase_id: string;
  target_user_phrase_id: string;
  relation_type: UserPhraseRelationType;
  created_at: string;
  updated_at: string;
}

export interface UserExpressionClusterRow {
  id: string;
  user_id: string;
  main_user_phrase_id: string | null;
  title: string | null;
  semantic_focus: string | null;
  created_at: string;
  updated_at: string;
}

export type UserExpressionClusterMemberRole = "main" | "variant";

export interface UserExpressionClusterMemberRow {
  id: string;
  cluster_id: string;
  user_phrase_id: string;
  role: UserExpressionClusterMemberRole;
  created_at: string;
  updated_at: string;
}

export type PhraseReviewResult = "again" | "hard" | "good";

export interface PhraseReviewLogRow {
  id: string;
  user_id: string;
  phrase_id: string;
  user_phrase_id: string;
  review_result: PhraseReviewResult;
  was_correct: boolean;
  reviewed_at: string;
  scheduled_next_review_at: string | null;
  source: string | null;
  created_at: string;
}

export interface ScenePhraseRecommendationStateRow {
  id: string;
  user_id: string;
  scene_slug: string;
  normalized_text: string;
  source_chunk_text: string | null;
  last_recommended_at: string;
  recommended_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChunkRow {
  id: string;
  normalized_text: string;
  display_text: string;
  translation: string | null;
  chunk_type: "chunk";
  difficulty: string | null;
  created_at: string;
  updated_at: string;
}

export type UserChunkStatus = "encountered" | "practiced" | "familiar";

export interface UserChunkRow {
  id: string;
  user_id: string;
  chunk_id: string;
  status: UserChunkStatus;
  encounter_count: number;
  practice_count: number;
  mastery_score: number;
  first_seen_at: string;
  last_seen_at: string;
  last_practiced_at: string | null;
  source_scene_id: string | null;
  source_scene_slug: string | null;
  source_sentence_index: number | null;
  source_sentence_text: string | null;
  created_at: string;
  updated_at: string;
}
