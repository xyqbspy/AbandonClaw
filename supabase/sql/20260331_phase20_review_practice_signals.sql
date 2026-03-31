-- Phase 20: formal review practice signals

alter table public.phrase_review_logs
add column if not exists recognition_state text,
add column if not exists output_confidence text,
add column if not exists full_output_status text;

alter table public.phrase_review_logs
drop constraint if exists phrase_review_logs_recognition_state_check;

alter table public.phrase_review_logs
add constraint phrase_review_logs_recognition_state_check
check (recognition_state is null or recognition_state in ('recognized', 'unknown'));

alter table public.phrase_review_logs
drop constraint if exists phrase_review_logs_output_confidence_check;

alter table public.phrase_review_logs
add constraint phrase_review_logs_output_confidence_check
check (output_confidence is null or output_confidence in ('high', 'low'));

alter table public.phrase_review_logs
drop constraint if exists phrase_review_logs_full_output_status_check;

alter table public.phrase_review_logs
add constraint phrase_review_logs_full_output_status_check
check (full_output_status is null or full_output_status in ('completed', 'not_started'));
