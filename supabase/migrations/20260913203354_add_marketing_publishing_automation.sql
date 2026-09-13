-- Marketing publishing infrastructure
--
-- A scheduled calendar item, a successful TikTok Inbox upload, and a live
-- platform post are deliberately different states. This makes the operator
-- interface truthful while leaving room for each provider's approval rules.

alter table public.marketing_channel_posts
  drop constraint if exists marketing_channel_posts_status_check;

alter table public.marketing_channel_posts
  add constraint marketing_channel_posts_status_check
  check (status in (
    'draft', 'in_review', 'approved', 'scheduled', 'queued',
    'published', 'failed', 'archived'
  ));

alter table public.marketing_channel_posts
  add column if not exists platform_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(platform_config) = 'object'),
  add column if not exists provider_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(provider_payload) = 'object'),
  add column if not exists delivery_attempts integer not null default 0
    check (delivery_attempts >= 0),
  add column if not exists last_delivery_attempt_at timestamptz,
  add column if not exists delivery_error text;

-- Avoid importing the same manually published Instagram item twice. Imported
-- identifiers are namespaced (for example, `instagram:12345`) so they cannot
-- collide with future platforms.
create unique index if not exists marketing_content_external_id_unique
  on public.marketing_content (external_id)
  where external_id is not null;

-- These rules describe opt-in flows; they hold no credentials. The only rule
-- initially supported is Instagram -> TikTok Inbox, which always leaves the
-- creator with the final review/post action in TikTok.
create table if not exists public.marketing_channel_automations (
  id uuid primary key default gen_random_uuid(),
  source_platform text not null check (source_platform in ('instagram')),
  destination_platform text not null check (destination_platform in ('tiktok')),
  mode text not null default 'tiktok_upload_queue'
    check (mode in ('tiktok_upload_queue')),
  enabled boolean not null default false,
  requires_creator_review boolean not null default true,
  last_run_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_platform, destination_platform)
);

create trigger touch_marketing_channel_automations_updated_at
  before update on public.marketing_channel_automations
  for each row execute procedure public.touch_marketing_updated_at();

create index if not exists marketing_channel_posts_due_delivery_idx
  on public.marketing_channel_posts (status, scheduled_for)
  where status = 'scheduled';

revoke all on table public.marketing_channel_automations from anon, authenticated;
alter table public.marketing_channel_automations enable row level security;
