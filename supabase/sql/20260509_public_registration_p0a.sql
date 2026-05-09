create table if not exists public.registration_invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  max_uses integer not null check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  check (used_count <= max_uses)
);

create table if not exists public.registration_invite_attempts (
  id uuid primary key default gen_random_uuid(),
  invite_code_id uuid references public.registration_invite_codes(id) on delete set null,
  email text not null,
  status text not null check (
    status in ('pending', 'used', 'rejected', 'failed', 'needs_repair')
  ),
  auth_user_id uuid,
  failure_reason text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists registration_invite_codes_active_idx
  on public.registration_invite_codes (is_active, expires_at);

create index if not exists registration_invite_attempts_email_idx
  on public.registration_invite_attempts (email, created_at desc);

create index if not exists registration_invite_attempts_code_idx
  on public.registration_invite_attempts (invite_code_id, created_at desc);

drop trigger if exists set_registration_invite_codes_updated_at
  on public.registration_invite_codes;
create trigger set_registration_invite_codes_updated_at
  before update on public.registration_invite_codes
  for each row execute function public.set_updated_at();

drop trigger if exists set_registration_invite_attempts_updated_at
  on public.registration_invite_attempts;
create trigger set_registration_invite_attempts_updated_at
  before update on public.registration_invite_attempts
  for each row execute function public.set_updated_at();

alter table public.registration_invite_codes enable row level security;
alter table public.registration_invite_attempts enable row level security;
