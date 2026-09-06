-- The studio keeps a parent creative record for carousels and static social
-- posts. Individual generated slide files remain private marketing assets and
-- are referenced from marketing_content.structured_data.
alter table public.marketing_content
  drop constraint marketing_content_content_type_check;

alter table public.marketing_content
  add constraint marketing_content_content_type_check
  check (content_type in (
    'guide_article', 'pin', 'reel', 'tiktok', 'x_post', 'reddit_reply',
    'carousel', 'image_post'
  ));
