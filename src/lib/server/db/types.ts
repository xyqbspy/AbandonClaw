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
  input_json: unknown;
  output_json: unknown;
  model: string | null;
  prompt_version: string | null;
  created_by: string | null;
  created_at: string;
}
