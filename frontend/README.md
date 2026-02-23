# Tafuta Frontend

React PWA for Tafuta - Kenyan Business Directory

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **Zustand** - State management
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Lucide React** - Icons
- **Vite PWA** - Progressive Web App features

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   └── ...              # Feature-specific components
│   ├── layouts/             # Layout components
│   │   ├── PublicLayout.jsx
│   │   ├── AuthLayout.jsx
│   │   ├── DashboardLayout.jsx
│   │   └── AdminLayout.jsx
│   ├── pages/
│   │   ├── public/          # Public pages
│   │   ├── auth/            # Authentication pages
│   │   ├── dashboard/       # Business owner dashboard
│   │   └── admin/           # Admin dashboard
│   ├── store/               # Zustand stores
│   ├── lib/
│   │   ├── api.js           # API client
│   │   └── utils.js         # Utility functions
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 22+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3000/api
```

### Running with Backend

The Vite dev server is configured to proxy API requests to `http://localhost:3000`.

Make sure the backend is running on port 3000, then start the frontend:

```bash
npm run dev
```

Visit `http://localhost:5173`

## Features

### Public Features
- Business search and discovery
- Category and region filtering
- Business detail pages
- Featured businesses
- Mobile-first responsive design

### User Features
- Registration and login (password + OTP)
- Profile management
- Business creation and management
- Content editing with version history
- Payment for services
- Receipt download

### Admin Features
- Business approval queue
- User management
- Analytics dashboard
- Audit logs
- System configuration

### PWA Features
- Installable on mobile devices
- Offline support with service worker
- Network-first caching strategy
- App-like experience

## API Integration

All API calls are handled through the `src/lib/api.js` module:

```javascript
import { authAPI, businessAPI, searchAPI } from '@/lib/api';

// Example: Login
const response = await authAPI.login({ phone, password });

// Example: Search businesses
const results = await searchAPI.search({ category: 'salon', region: 'Machakos' });
```

## State Management

Using Zustand for global state:

```javascript
import useAuthStore from '@/store/useAuthStore';

function Component() {
  const { user, isAuthenticated, setAuth, logout } = useAuthStore();
  
  // Use state...
}
```

## Routing

Protected routes require authentication:

```javascript
// Public route
<Route path="/" element={<HomePage />} />

// Protected route
<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardLayout />
  </ProtectedRoute>
} />

// Admin route
<Route path="/admin" element={
  <AdminRoute>
    <AdminLayout />
  </AdminRoute>
} />
```

## Building for Production

```bash
# Build
npm run build

# Output will be in dist/
# Deploy the dist/ folder to your web server
```

## PWA Configuration

PWA settings are in `vite.config.js`:

- **Manifest**: App name, icons, theme color
- **Service Worker**: Automatic updates, caching strategies
- **Offline Support**: Network-first for API, cache-first for images

## TODO

### Remaining Implementation

1. **Complete UI Components**
   - Card, Badge, Alert, Dialog, Select, Textarea
   - Loading states, error states
   - Toast notifications

2. **Build All Pages**
   - Public: Home, Search, Business Detail
   - Auth: Login, Register
   - Dashboard: All business owner pages
   - Admin: All admin pages

3. **Implement Features**
   - Form validation with React Hook Form + Zod
   - Image upload handling
   - Multi-language support
   - Search filters and pagination
   - Content editor (JSON-based)
   - Version history UI
   - Payment flow
   - Receipt download

4. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests with Playwright

5. **Optimization**
   - Code splitting
   - Lazy loading
   - Image optimization
   - Performance monitoring

## Next Steps

1. Install dependencies: `npm install`
2. Create remaining UI components
3. Build layout components
4. Implement all pages
5. Test with backend API
6. Deploy to production

## Support

For issues or questions, check the backend API documentation in `backend/README.md`
