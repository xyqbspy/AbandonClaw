create table if not exists public.registration_email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null default 'signup' check (purpose in ('signup')),
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  last_sent_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists registration_email_verification_codes_email_idx
  on public.registration_email_verification_codes (email, purpose, created_at desc);

create index if not exists registration_email_verification_codes_expires_idx
  on public.registration_email_verification_codes (expires_at);

drop trigger if exists set_registration_email_verification_codes_updated_at
  on public.registration_email_verification_codes;
create trigger set_registration_email_verification_codes_updated_at
  before update on public.registration_email_verification_codes
  for each row execute function public.set_updated_at();

alter table public.registration_email_verification_codes enable row level security;
