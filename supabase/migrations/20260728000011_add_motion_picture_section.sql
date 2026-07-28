ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'motion_picture';

INSERT INTO website_sections (page_slug, section_type, title, is_visible, position, config)
SELECT 'home', 'motion_picture', 'Motion Picture', true, 20,
  '{
    "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "subtext": "CAPTURING THE ESSENCE OF THE STREETS. RAW, UNFILTERED, AND IN CONSTANT MOTION."
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM website_sections WHERE page_slug = 'home' AND section_type = 'motion_picture'
);
