-- Keep source screenshots, recordings, and approved creative private. The
-- marketing-admin Edge Function is the sole authority that can mint short-lived
-- upload and read URLs for an authenticated Grovio owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-assets',
  'marketing-assets',
  false,
  20971520,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
