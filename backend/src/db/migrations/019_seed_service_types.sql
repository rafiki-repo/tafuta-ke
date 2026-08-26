-- Seed initial service type definitions into system_config.
-- Each entry has: id (slug), label, description, price_per_month (KES), enabled flag.
INSERT INTO system_config (key, value, description)
VALUES (
  'service_types',
  '[
    {"id": "website_hosting", "label": "Website Hosting",    "description": "One-page business website at /site/:tag",            "price_per_month": 500,  "enabled": true},
    {"id": "ads",             "label": "Directory Ads",      "description": "Promoted placement in search results",               "price_per_month": 300,  "enabled": true},
    {"id": "search_promotion","label": "Search Promotion",   "description": "Boosted ranking in search results",                  "price_per_month": 200,  "enabled": true},
    {"id": "image_gallery",   "label": "Image Gallery",      "description": "Extended photo gallery on business profile",         "price_per_month": 150,  "enabled": true},
    {"id": "flyer",           "label": "Digital Flyer",      "description": "Shareable promotional flyer for the business",       "price_per_month": 200,  "enabled": false}
  ]',
  'Paid service type definitions managed via admin console'
)
ON CONFLICT (key) DO NOTHING;
