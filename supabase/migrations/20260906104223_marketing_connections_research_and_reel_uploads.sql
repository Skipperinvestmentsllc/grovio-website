-- Secure, short-lived OAuth state for channels whose callbacks cannot carry a
-- Supabase session. Client secrets, code verifiers, and refresh tokens remain
-- server-side only.
create table public.marketing_oauth_sessions (
  state text primary key check (char_length(state) between 24 and 300),
  provider text not null check (provider in ('tiktok', 'x', 'reddit')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index marketing_oauth_sessions_expiry_idx
  on public.marketing_oauth_sessions (expires_at);

revoke all on table public.marketing_oauth_sessions from anon, authenticated;
alter table public.marketing_oauth_sessions enable row level security;

-- Account-level aggregates keep analytics truthful when a post was published
-- outside the studio and therefore cannot be matched to a draft automatically.
create table public.marketing_account_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'pinterest', 'x', 'reddit', 'google_search_console', 'appsflyer', 'posthog')),
  metric_date date not null,
  source text not null default 'platform_api' check (char_length(source) between 1 and 80),
  posts integer not null default 0 check (posts >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  reach integer not null default 0 check (reach >= 0),
  engagements integer not null default 0 check (engagements >= 0),
  outbound_clicks integer not null default 0 check (outbound_clicks >= 0),
  saves integer not null default 0 check (saves >= 0),
  video_views integer not null default 0 check (video_views >= 0),
  followers integer,
  raw_metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_metrics) = 'object'),
  synced_at timestamptz not null default now(),
  unique (platform, metric_date, source)
);

create index marketing_account_metrics_daily_platform_date_idx
  on public.marketing_account_metrics_daily (platform, metric_date desc);

revoke all on table public.marketing_account_metrics_daily from anon, authenticated;
alter table public.marketing_account_metrics_daily enable row level security;

-- Research is stored as a dated, reviewable brief. It is input to creative
-- work, never a claim that an algorithm knows which content will perform.
create table public.marketing_research_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('brand_landscape', 'content_performance')),
  title text not null check (char_length(title) between 1 and 240),
  report_markdown text not null check (char_length(report_markdown) between 1 and 30000),
  source_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(source_urls) = 'array'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index marketing_research_reports_type_created_idx
  on public.marketing_research_reports (report_type, created_at desc);

revoke all on table public.marketing_research_reports from anon, authenticated;
alter table public.marketing_research_reports enable row level security;

alter table public.marketing_brand_profiles
  add column if not exists quality_guidelines text not null default 'Every piece must be accurate, useful, specific to a real parent question, and reviewed before publishing.',
  add column if not exists research_refreshed_at timestamptz;

-- Finished vertical videos are source files, not AI-generated stand-ins.
update storage.buckets
set file_size_limit = 104857600
where id = 'marketing-assets';
