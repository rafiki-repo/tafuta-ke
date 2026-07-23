-- Migration 018: Seed initial promotional ads for category landing pages
-- Ads are stored in system_config under key 'category_ads'.
-- Each ad: { id, category (null = all categories), headline, body, cta, link }

INSERT INTO system_config (key, value, description)
VALUES (
  'category_ads',
  '[
    {
      "id": "ad-001",
      "category": "Salons",
      "headline": "Learn Professional Hair Styling",
      "body": "Come train at Heniv Hair Academy. Build real skills and start earning income from your talent.",
      "cta": "Ask us how"
    },
    {
      "id": "ad-002",
      "category": "Technology",
      "headline": "IT Skills Training Available",
      "body": "Get certified in computer repair and networking. Affordable training right here in your area.",
      "cta": "Find out more"
    },
    {
      "id": "ad-003",
      "category": null,
      "headline": "Is Your Business on Tafuta?",
      "body": "Get discovered by thousands of local customers. Listing your business is completely free.",
      "cta": "Register now",
      "link": "/register"
    }
  ]'::jsonb,
  'Promotional ads displayed on category landing pages'
)
ON CONFLICT (key) DO NOTHING;
