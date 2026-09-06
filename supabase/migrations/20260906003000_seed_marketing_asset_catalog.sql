-- The studio starts with real, editable Grovio brand and product assets.
-- Files are served from the website's versioned marketing library; the owner
-- can replace, approve, unapprove, or remove each entry through Marketing HQ.
with catalog(kind, label, source_url, alt_text, notes, approved) as (
  values
    ('logo', 'Grovio brand mark', 'https://grovioapp.com/assets/marketing-library/grovio-brand-mark.svg', 'Grovio plant-in-home brand mark with tagline', 'Original vector source from the Grovio brand assets.', true),
    ('logo', 'Grovio primary logo', 'https://grovioapp.com/assets/marketing-library/grovio-primary-logo.png', 'Grovio plant-in-home logo and Grow Simply, Homeschool Confidently tagline', 'Primary full logo from Grovio Downloads.', true),
    ('logo', 'Grovio green wordmark', 'https://grovioapp.com/assets/marketing-library/grovio-green-wordmark.jpg', 'Grovio green wordmark on white', 'Use where a compact wordmark is needed.', true),
    ('screenshot', 'Planner, attendance, portfolio app screen', 'https://grovioapp.com/assets/marketing-library/product-planner-attendance-portfolio.png', 'Grovio app screen showing homeschool planning, attendance, and portfolio records', 'Product screenshot from Grovio Downloads.', true),
    ('screenshot', 'Grow Simply product screen', 'https://grovioapp.com/assets/marketing-library/product-grow-simply.png', 'Grovio product screen with the Grow Simply, Homeschool Confidently message', 'Product screenshot from Grovio Downloads.', true),
    ('screenshot', 'Attendance mockup', 'https://grovioapp.com/assets/marketing-library/product-attendance-mockup.png', 'Grovio attendance tracking interface on a device mockup', 'Product screenshot from Grovio Downloads.', true),
    ('screenshot', 'Homeschool day at a glance', 'https://grovioapp.com/assets/marketing-library/product-day-at-a-glance.png', 'Grovio screen showing a homeschool day at a glance', 'Product screenshot from Grovio Downloads.', true),
    ('screenshot', 'One-tap attendance', 'https://grovioapp.com/assets/marketing-library/product-one-tap-attendance.png', 'Grovio one-tap attendance screen', 'Product screenshot from Grovio Downloads.', true),
    ('screenshot', 'Grovio Guide screen', 'https://grovioapp.com/assets/feature-guide.png', 'Grovio Guide shown on a phone', 'Existing website product screenshot.', true),
    ('screenshot', 'Portfolio screen', 'https://grovioapp.com/assets/feature-portfolio.png', 'Grovio portfolio screen', 'Existing website product screenshot.', true),
    ('screenshot', 'Planner rhythm screen', 'https://grovioapp.com/assets/feature-planner-rhythm.png', 'Grovio planner rhythm screen', 'Existing website product screenshot.', true),
    ('screenshot', 'Attendance export screen', 'https://grovioapp.com/assets/feature-attendance-export.png', 'Grovio attendance export screen', 'Existing website product screenshot.', true),
    ('screenshot', 'Home screen toast', 'https://grovioapp.com/assets/feature-home-toast.png', 'Grovio home screen', 'Existing website product screenshot.', true),
    ('screenshot', 'Planner choice screen', 'https://grovioapp.com/assets/feature-planner-choice.png', 'Grovio planner choice screen', 'Existing website product screenshot.', true),
    ('image', 'Pinterest Pin 01', 'https://grovioapp.com/assets/marketing-library/pin-01-final.jpg', 'Existing Grovio Pinterest creative', 'Final Pinterest source creative from Grovio Downloads.', true),
    ('image', 'Pinterest Pin 02', 'https://grovioapp.com/assets/marketing-library/pin-02-final.jpg', 'Existing Grovio Pinterest creative', 'Final Pinterest source creative from Grovio Downloads.', true),
    ('image', 'Pinterest Pin 03', 'https://grovioapp.com/assets/marketing-library/pin-03-final.jpg', 'Existing Grovio Pinterest creative', 'Final Pinterest source creative from Grovio Downloads.', true),
    ('image', 'Pinterest Pin 01 v1', 'https://grovioapp.com/assets/marketing-library/pin-01-v1.png', 'Existing Grovio Pinterest creative', 'Existing Pinterest source creative from Grovio Downloads.', true),
    ('image', 'Social post 01 final', 'https://grovioapp.com/assets/marketing-library/social-post-01-final.png', 'Existing Grovio social post', 'Final social source creative from Grovio Downloads.', true),
    ('image', 'Social post 03 v3', 'https://grovioapp.com/assets/marketing-library/social-post-03-v3.png', 'Existing Grovio social post', 'Final social source creative from Grovio Downloads.', true),
    ('image', 'Social post 04 v5', 'https://grovioapp.com/assets/marketing-library/social-post-04-v5.png', 'Existing Grovio social post', 'Final social source creative from Grovio Downloads.', true),
    ('image', 'Social post 05 final', 'https://grovioapp.com/assets/marketing-library/social-post-05-final.png', 'Existing Grovio social post', 'Final social source creative from Grovio Downloads.', true),
    ('image', 'Social post 06 closer', 'https://grovioapp.com/assets/marketing-library/social-post-06-closer.png', 'Existing Grovio social post', 'Final social source creative from Grovio Downloads.', true),
    ('image', 'Social post 07 raw reference', 'https://grovioapp.com/assets/marketing-library/social-post-07-raw.png', 'Existing Grovio social post reference', 'Raw working visual retained for reference; requires review before use.', false),
    ('image', 'Watercolor social post', 'https://grovioapp.com/assets/marketing-library/grovio-post-watercolors.png', 'Grovio watercolor social creative', 'Existing Grovio social source creative.', true),
    ('image', 'Social post cover', 'https://grovioapp.com/assets/marketing-library/grovio-post-cover.png', 'Grovio social cover creative', 'Existing Grovio social source creative.', true),
    ('image', 'Reading social post', 'https://grovioapp.com/assets/marketing-library/grovio-post-reading.png', 'Grovio reading social creative', 'Existing Grovio social source creative.', true),
    ('image', 'Morning social post', 'https://grovioapp.com/assets/marketing-library/grovio-post-morning.png', 'Grovio morning social creative', 'Existing Grovio social source creative.', true),
    ('image', 'Outdoor social post', 'https://grovioapp.com/assets/marketing-library/grovio-post-outdoor.png', 'Grovio outdoor social creative', 'Existing Grovio social source creative.', true),
    ('image', 'Grovio Start Here carousel slide', 'https://grovioapp.com/assets/marketing-library/grovio-start-here-slide-02.png', 'Grovio Start Here carousel slide', 'Existing Grovio carousel source creative.', true),
    ('image', 'Homeschool mom lifestyle image', 'https://grovioapp.com/assets/marketing-library/lifestyle-homeschool-mom.jpg', 'Warm homeschool mother lifestyle visual', 'Existing Grovio lifestyle source image.', true),
    ('image', 'Portfolio lifestyle image', 'https://grovioapp.com/assets/marketing-library/lifestyle-portfolio.jpg', 'Homeschool portfolio lifestyle visual', 'Existing Grovio lifestyle source image.', true),
    ('image', 'Homeschool lifestyle image', 'https://grovioapp.com/assets/marketing-library/lifestyle-homeschool.jpg', 'Warm homeschool lifestyle visual', 'Existing Grovio lifestyle source image.', true),
    ('video', 'Tuesday final Reel', 'https://grovioapp.com/assets/marketing-library/reel-tuesday-final.mp4', 'Existing Grovio vertical Reel', 'Final Reel source from Grovio Downloads.', true),
    ('video', 'Nobody is grading you Reel', 'https://grovioapp.com/assets/marketing-library/reel-tuesday-nobodys-grading-you.mp4', 'Existing Grovio vertical Reel about homeschooling without judgement', 'Final Reel source from Grovio Downloads.', true),
    ('template', 'Vertical Reel background', 'https://grovioapp.com/assets/marketing-library/reel-background.jpg', 'Grovio vertical Reel background', 'Reusable background for vertical video work.', true),
    ('template', 'Social background 03', 'https://grovioapp.com/assets/marketing-library/social-background-03.png', 'Grovio social post background', 'Reusable social design background.', true),
    ('template', 'Social background 08', 'https://grovioapp.com/assets/marketing-library/social-background-08.png', 'Grovio social post background', 'Reusable social design background.', true)
)
insert into public.marketing_assets (kind, label, source_url, alt_text, notes, approved)
select kind, label, source_url, alt_text, notes, approved
from catalog
where not exists (
  select 1
  from public.marketing_assets existing
  where existing.source_url = catalog.source_url
);
