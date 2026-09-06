-- Platform credentials are encrypted by the Edge Function before they reach
-- Postgres. This table deliberately has no client-side grants or RLS policies:
-- only the owner-protected Marketing HQ Edge Functions can read it.
create table public.marketing_channel_connections (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in (
    'instagram', 'facebook', 'tiktok', 'pinterest', 'x', 'reddit',
    'google_search_console', 'appsflyer', 'posthog'
  )),
  external_account_id text not null,
  account_name text,
  scopes text[] not null default '{}',
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  status text not null default 'connected' check (status in (
    'connected', 'needs_reauth', 'paused', 'disconnected', 'error'
  )),
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  connected_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, external_account_id)
);

create index marketing_channel_connections_platform_status_idx
  on public.marketing_channel_connections (platform, status, updated_at desc);

create trigger touch_marketing_channel_connections_updated_at
  before update on public.marketing_channel_connections
  for each row execute procedure public.touch_marketing_updated_at();

revoke all on table public.marketing_channel_connections from anon, authenticated;
alter table public.marketing_channel_connections enable row level security;
