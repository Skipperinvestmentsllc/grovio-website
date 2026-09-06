-- One private, owner-managed brand profile drives creative instructions and
-- keeps the actual product truth out of generic prompts and browser storage.
create table public.marketing_brand_profiles (
  workspace text primary key default 'default' check (workspace = 'default'),
  name text not null check (char_length(name) between 1 and 120),
  website text,
  colors jsonb not null default '[]'::jsonb check (jsonb_typeof(colors) = 'array'),
  font text,
  description text not null check (char_length(description) between 1 and 3000),
  voice text not null check (char_length(voice) between 1 and 3000),
  audience text not null check (char_length(audience) between 1 and 2000),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger touch_marketing_brand_profiles_updated_at
  before update on public.marketing_brand_profiles
  for each row execute procedure public.touch_marketing_updated_at();

revoke all on table public.marketing_brand_profiles from anon, authenticated;
alter table public.marketing_brand_profiles enable row level security;
