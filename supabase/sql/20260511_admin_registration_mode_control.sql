create table if not exists public.app_runtime_settings (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint app_runtime_settings_registration_mode_check
    check (
      key <> 'registration_mode'
      or value in ('closed', 'invite_only', 'open')
    )
);

alter table public.app_runtime_settings enable row level security;
