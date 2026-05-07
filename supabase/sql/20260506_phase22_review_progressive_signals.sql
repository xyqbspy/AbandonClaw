-- Phase 22: formal review progressive practice signals

alter table public.phrase_review_logs
add column if not exists variant_rewrite_status text,
add column if not exists variant_rewrite_prompt_id text,
add column if not exists full_output_coverage text;

alter table public.phrase_review_logs
drop constraint if exists phrase_review_logs_variant_rewrite_status_check;

alter table public.phrase_review_logs
add constraint phrase_review_logs_variant_rewrite_status_check
check (
  variant_rewrite_status is null
  or variant_rewrite_status in ('completed', 'not_started')
);

alter table public.phrase_review_logs
drop constraint if exists phrase_review_logs_variant_rewrite_prompt_id_check;

alter table public.phrase_review_logs
add constraint phrase_review_logs_variant_rewrite_prompt_id_check
check (
  variant_rewrite_prompt_id is null
  or variant_rewrite_prompt_id in ('self', 'colleague', 'past')
);

alter table public.phrase_review_logs
drop constraint if exists phrase_review_logs_full_output_coverage_check;

alter table public.phrase_review_logs
add constraint phrase_review_logs_full_output_coverage_check
check (
  full_output_coverage is null
  or full_output_coverage in ('contains_target', 'missing_target', 'not_started')
);
