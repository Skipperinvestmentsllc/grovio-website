-- Grovio Marketing HQ
--
-- This is intentionally an internal-only workspace. The browser never reads
-- these tables directly: every operation passes through the authenticated
-- marketing-admin Edge Function. That keeps platform credentials, editorial
-- drafts, and social-monitoring notes out of the public Data API.

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  objective text not null default 'awareness' check (objective in ('awareness', 'guide_growth', 'activation', 'launch', 'seasonal')),
  status text not null default 'idea' check (status in ('idea', 'active', 'paused', 'complete', 'archived')),
  pillar text,
  audience text,
  summary text,
  primary_cta text,
  utm_campaign text not null unique check (utm_campaign ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  starts_on date,
  ends_on date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.marketing_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  kind text not null check (kind in ('image', 'video', 'screenshot', 'logo', 'template', 'document')),
  label text not null check (char_length(label) between 1 and 160),
  source_url text,
  storage_path text,
  alt_text text,
  notes text,
  approved boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_url is not null or storage_path is not null)
);

create table public.marketing_content (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  featured_asset_id uuid references public.marketing_assets(id) on delete set null,
  content_type text not null check (content_type in ('guide_article', 'pin', 'reel', 'tiktok', 'x_post', 'reddit_reply')),
  status text not null default 'draft' check (status in ('idea', 'draft', 'in_review', 'approved', 'scheduled', 'published', 'archived')),
  title text not null check (char_length(title) between 1 and 240),
  slug text,
  excerpt text,
  body_markdown text,
  primary_keyword text,
  supporting_keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(supporting_keywords) = 'array'),
  search_intent text,
  seo_title text,
  meta_description text,
  canonical_url text,
  target_url text,
  structured_data jsonb,
  caption text,
  scheduled_for timestamptz,
  published_at timestamptz,
  external_id text,
  external_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (content_type <> 'guide_article' or slug is not null),
  check (published_at is null or status = 'published')
);

create unique index marketing_content_guide_slug_unique
  on public.marketing_content (slug)
  where content_type = 'guide_article' and slug is not null;

create table public.marketing_channel_posts (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.marketing_content(id) on delete cascade,
  channel text not null check (channel in ('instagram', 'facebook', 'tiktok', 'pinterest', 'x', 'reddit')),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'scheduled', 'published', 'failed', 'archived')),
  copy text,
  destination_url text,
  scheduled_for timestamptz,
  published_at timestamptz,
  platform_post_id text,
  platform_post_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, channel)
);

create table public.marketing_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  channel_post_id uuid not null references public.marketing_channel_posts(id) on delete cascade,
  metric_date date not null,
  impressions integer not null default 0 check (impressions >= 0),
  reach integer not null default 0 check (reach >= 0),
  engagements integer not null default 0 check (engagements >= 0),
  outbound_clicks integer not null default 0 check (outbound_clicks >= 0),
  saves integer not null default 0 check (saves >= 0),
  video_views integer not null default 0 check (video_views >= 0),
  raw_metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_metrics) = 'object'),
  synced_at timestamptz not null default now(),
  unique (channel_post_id, metric_date)
);

create table public.marketing_reddit_communities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name ~ '^r/[A-Za-z0-9_]{3,21}$'),
  url text not null,
  status text not null default 'watching' check (status in ('watching', 'participating', 'paused', 'not_a_fit')),
  rules_url text,
  topic_notes text,
  participation_notes text,
  last_reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketing_reddit_opportunities (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.marketing_reddit_communities(id) on delete cascade,
  source_url text not null,
  source_title text not null,
  source_excerpt text,
  relevance_score smallint check (relevance_score between 0 and 100),
  recommended_stage text not null default 'helpful' check (recommended_stage in ('helpful', 'contextual', 'transparent_mention')),
  draft_reply text,
  status text not null default 'new' check (status in ('new', 'watching', 'drafted', 'approved', 'replied', 'dismissed')),
  not_before timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (community_id, source_url)
);

create index marketing_content_campaign_updated_idx
  on public.marketing_content (campaign_id, updated_at desc);
create index marketing_content_status_updated_idx
  on public.marketing_content (status, updated_at desc);
create index marketing_channel_posts_status_scheduled_idx
  on public.marketing_channel_posts (status, scheduled_for);
create index marketing_metrics_daily_channel_date_idx
  on public.marketing_metrics_daily (channel_post_id, metric_date desc);
create index marketing_reddit_opportunities_status_created_idx
  on public.marketing_reddit_opportunities (status, created_at desc);

create or replace function public.touch_marketing_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_marketing_campaigns_updated_at
  before update on public.marketing_campaigns
  for each row execute procedure public.touch_marketing_updated_at();
create trigger touch_marketing_assets_updated_at
  before update on public.marketing_assets
  for each row execute procedure public.touch_marketing_updated_at();
create trigger touch_marketing_content_updated_at
  before update on public.marketing_content
  for each row execute procedure public.touch_marketing_updated_at();
create trigger touch_marketing_channel_posts_updated_at
  before update on public.marketing_channel_posts
  for each row execute procedure public.touch_marketing_updated_at();
create trigger touch_marketing_reddit_communities_updated_at
  before update on public.marketing_reddit_communities
  for each row execute procedure public.touch_marketing_updated_at();
create trigger touch_marketing_reddit_opportunities_updated_at
  before update on public.marketing_reddit_opportunities
  for each row execute procedure public.touch_marketing_updated_at();

-- Internal data only. Edge Functions use the service role after verifying an
-- owner session; the public Data API receives no grants and no RLS policy.
revoke all on table public.marketing_campaigns from anon, authenticated;
revoke all on table public.marketing_assets from anon, authenticated;
revoke all on table public.marketing_content from anon, authenticated;
revoke all on table public.marketing_channel_posts from anon, authenticated;
revoke all on table public.marketing_metrics_daily from anon, authenticated;
revoke all on table public.marketing_reddit_communities from anon, authenticated;
revoke all on table public.marketing_reddit_opportunities from anon, authenticated;

alter table public.marketing_campaigns enable row level security;
alter table public.marketing_assets enable row level security;
alter table public.marketing_content enable row level security;
alter table public.marketing_channel_posts enable row level security;
alter table public.marketing_metrics_daily enable row level security;
alter table public.marketing_reddit_communities enable row level security;
alter table public.marketing_reddit_opportunities enable row level security;
