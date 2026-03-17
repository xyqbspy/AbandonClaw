-- Phase 6: formal review-loop MVP

alter table public.user_phrases
add column if not exists review_status text not null default 'saved',
add column if not exists review_count int not null default 0,
add column if not exists correct_count int not null default 0,
add column if not exists incorrect_count int not null default 0,
add column if not exists last_reviewed_at timestamptz,
add column if not exists next_review_at timestamptz,
add column if not exists mastered_at timestamptz;

alter table public.user_phrases
drop constraint if exists user_phrases_review_status_check;

alter table public.user_phrases
add constraint user_phrases_review_status_check
check (review_status in ('saved', 'reviewing', 'mastered', 'archived'));

create index if not exists user_phrases_user_review_status_idx
on public.user_phrases(user_id, review_status);

create index if not exists user_phrases_user_next_review_at_idx
on public.user_phrases(user_id, next_review_at asc);

create index if not exists user_phrases_user_review_due_idx
on public.user_phrases(user_id, review_status, next_review_at asc);

create table if not exists public.phrase_review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase_id uuid not null references public.phrases(id) on delete cascade,
  user_phrase_id uuid not null references public.user_phrases(id) on delete cascade,
  review_result text not null,
  was_correct boolean not null,
  reviewed_at timestamptz not null default now(),
  scheduled_next_review_at timestamptz,
  source text,
  created_at timestamptz not null default now()
);

alter table public.phrase_review_logs
drop constraint if exists phrase_review_logs_review_result_check;

alter table public.phrase_review_logs
add constraint phrase_review_logs_review_result_check
check (review_result in ('again', 'hard', 'good'));

create index if not exists phrase_review_logs_user_reviewed_at_idx
on public.phrase_review_logs(user_id, reviewed_at desc);

create index if not exists phrase_review_logs_user_phrase_reviewed_at_idx
on public.phrase_review_logs(user_phrase_id, reviewed_at desc);

create index if not exists phrase_review_logs_user_phrase_key_reviewed_at_idx
on public.phrase_review_logs(user_id, phrase_id, reviewed_at desc);

alter table public.phrase_review_logs enable row level security;

drop policy if exists "phrase_review_logs_select_own" on public.phrase_review_logs;
create policy "phrase_review_logs_select_own"
on public.phrase_review_logs for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "phrase_review_logs_insert_own" on public.phrase_review_logs;
create policy "phrase_review_logs_insert_own"
on public.phrase_review_logs for insert
to authenticated
with check (user_id = auth.uid());
