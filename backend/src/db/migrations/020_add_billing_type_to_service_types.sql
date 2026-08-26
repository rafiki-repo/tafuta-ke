-- Add billing_type to each service type definition.
-- monthly = recurring subscription charged per month
-- one_time = single purchase, no expiry (e.g. flyer generation)
UPDATE system_config
SET value = '[
  {"id": "website_hosting",  "label": "Website Hosting",  "billing_type": "monthly",  "description": "One-page business website at /site/:tag",          "price": 500, "enabled": true},
  {"id": "ads",              "label": "Directory Ads",    "billing_type": "monthly",  "description": "Promoted placement in search results",             "price": 300, "enabled": true},
  {"id": "search_promotion", "label": "Search Promotion", "billing_type": "monthly",  "description": "Boosted ranking in search results",                "price": 200, "enabled": true},
  {"id": "image_gallery",    "label": "Image Gallery",    "billing_type": "monthly",  "description": "Extended photo gallery on business profile",       "price": 150, "enabled": true},
  {"id": "flyer",            "label": "Digital Flyer",    "billing_type": "one_time", "description": "Shareable promotional flyer for the business",     "price": 200, "enabled": false}
]'
WHERE key = 'service_types';
