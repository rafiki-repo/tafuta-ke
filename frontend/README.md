# Tafuta Frontend

React PWA for Tafuta — Kenyan Business Directory.

## Tech Stack

- **React 18** — UI library
- **Vite** — Build tool and dev server
- **React Router** — Client-side routing
- **TailwindCSS** — Utility-first CSS
- **Zustand** — State management
- **Axios** — HTTP client
- **Lucide React** — Icons
- **Vite PWA** — Progressive Web App features

## Getting Started

### Prerequisites

- Node.js 22+
- Backend API running on port 3000

### Installation

```bash
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
```

### Environment Variables

The dev server proxies `/api/*` to `http://localhost:3000`. No `.env` file is required for local development unless you want to override the API URL:

```env
# frontend/.env  (optional — only needed if backend is not on port 3000)
VITE_API_URL=http://localhost:3000/api
```

## Project Structure

```
frontend/
├── public/                  # Static assets (favicon, icons, manifests)
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Alert.jsx
│   │   ├── Badge.jsx
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Footer.jsx
│   │   ├── Header.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Spinner.jsx
│   │   └── Textarea.jsx
│   ├── layouts/             # Page layout wrappers
│   │   ├── AdminLayout.jsx
│   │   ├── AuthLayout.jsx
│   │   ├── DashboardLayout.jsx
│   │   └── PublicLayout.jsx
│   ├── pages/
│   │   ├── admin/           # Admin dashboard pages
│   │   ├── auth/            # Login, register
│   │   ├── dashboard/       # Business owner pages (BusinessEditor, etc.)
│   │   └── public/          # Home, search, business detail
│   ├── store/               # Zustand stores (auth, etc.)
│   ├── lib/
│   │   ├── api.js           # Axios API client (all endpoints)
│   │   └── utils.js         # Utility functions
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## API Integration

All API calls go through `src/lib/api.js`:

```javascript
import { authAPI, businessAPI, searchAPI, paymentAPI, adminAPI } from '@/lib/api';

// Auth
await authAPI.login({ phone, password });
await authAPI.requestOTP({ phone });

// Businesses
await businessAPI.create({ business_name, category, region, content_json });
await businessAPI.update(id, { content_json, business_tag });

// Photos
await businessAPI.uploadPhoto(id, formData);   // multipart/form-data
await businessAPI.listPhotos(id);
await businessAPI.updatePhotoTransform(id, slug, { image_type, transform });
await businessAPI.deletePhoto(id, slug, imageType);
await businessAPI.getPhotoConfig();

// Search
await searchAPI.search({ category, region, q });
```

## Features

### Implemented
- Business search and discovery with category/region filters
- Business detail pages
- Featured businesses
- User registration and login (password + OTP)
- Profile management
- Business creation and editing (Basic, Contact, Location, Hours tabs)
- Business tag (`business_tag`) with auto-generation from business name
- Content version history and rollback
- Payment flow (PesaPal)
- Receipt download
- Admin: business approval queue, user management, analytics, audit logs, system config
- PWA: installable, service worker, offline support, cache-first images

### In Progress (Phase 3)
- Photos tab in BusinessEditor (image upload, transform preview, management)
- ImageManager component with Canvas 2D live preview
- Business logo thumbnails in search results
- Banner/gallery display on business detail pages

## PWA Configuration

Configured in `vite.config.js`:

- **Cache strategy:** Network-first for API calls, cache-first for images (30-day retention)
- **Offline:** Core pages work offline via service worker
- **Installable:** Full manifest with Tafuta icons and theme colour

## Building for Production

```bash
npm run build
# Output in dist/ — deploy this folder; Caddy serves it as the SPA root
```
