# PRD-04: User Interface & Experience

**Product Requirements Document**
**Version**: 1.0
**Last Updated**: Feb 22, 2026
**Status**: Draft

---

## Overview

This PRD defines the user interface and experience for Tafuta MVP, covering public-facing pages, business owner config panel, multi-language support, and PWA features. Focus is on mobile-first, low-bandwidth, Gen Z appeal for suburban/rural Kenya.

**Key Principle**: Simple, fun, modern design that empowers businesses and builds trust.

---

## Design Philosophy

### Target Audience

- **Primary**: Gen Z young adults in suburban/rural Kenya (18-30 years old)
- **Secondary**: Business owners (all ages) managing their listings
- **Device**: Smartphones (optimized for 3G networks)
- **Context**: Low bandwidth, intermittent connectivity

### Design Inspiration

- **Reference**: Joby app (modern, fun, appealing to Gen Z)
- **Reference**: Yelp (business directory UI — see sample-images folder)
- **Style**: Modern, clean, playful without being childish

---

## Brand Identity

### Colors

- **Primary**: Deep Orange (R:237, G:76, B:34) — `#ED4C22`
- **Secondary**: Black — `#000000`
- **Background**: White — `#FFFFFF`
- **Accent**: Light gray for borders/dividers — `#E5E5E5`

### Logo/Branding

- Use Tafuta-icon1 and/or Tafuta-logo1 from sample-images folder
- Icon for PWA home screen install
- Logo in header/navigation

### Typography

- Clean, readable sans-serif fonts
- Large enough for mobile viewing
- Support for English, Swahili, Kikamba, Kikuyu characters

---

## Public-Facing UI

### Home Page

**URL**: `https://tafuta.ke/`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta         [Language] EN │
├─────────────────────────────────────┤
│                                     │
│   Find Local Businesses in Kenya    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Search businesses...          │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Machakos ▼]  [All Categories ▼]  │
│                                     │
├─────────────────────────────────────┤
│  Browse by Category                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │Shop │ │Food │ │Salon│ │Repair│  │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│  Featured Businesses                │
│  ┌─────────────────────────────┐    │
│  │ [Logo] Business Name        │    │
│  │ Verified  •  Salon  •  Mach │    │
│  │ +254...                     │    │
│  └─────────────────────────────┘    │
│                                     │
│  [List Your Business]               │
│                                     │
├─────────────────────────────────────┤
│ About | Contact | Terms | Privacy   │
└─────────────────────────────────────┘
```

**Key Elements:**
- **Header**: Logo, language switcher (EN/SW/KK/KY)
- **Hero section**: Large search bar, region/category dropdowns
- **Category grid**: Visual icons for popular categories
- **Featured businesses**: 3-5 promoted/verified businesses
- **CTA button**: "List Your Business" (prominent, orange)
- **Footer**: Links to about, contact, terms, privacy (appears at bottom of page scroll, not fixed)

**Interactions:**
- Search bar: Real-time filtering as user types
- Dropdowns: Filter by region or category
- Category cards: Navigate to category landing page
- Business cards: Click to view business detail page

### Search Results Page

**URL**: `https://tafuta.ke/search?q=salon&region=machakos`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta         [Language] EN │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ salon                         │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Machakos ▼]  [Salon ▼]           │
│                                     │
│  Showing 24 businesses              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [Logo] Doreen Beauty Parlour│    │
│  │ Verified  •  Salon  •  Mach │    │
│  │ Professional hair & beauty   │    │
│  │ +254712345678               │    │
│  │ [View Website]              │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [Logo] Grace Hair Studio    │    │
│  │ Salon  •  Machakos          │    │
│  │ Hair styling & makeup        │    │
│  │ +254...                     │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Load More]                        │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- **Search bar**: Persistent at top, shows current query
- **Filters**: Region and category dropdowns
- **Results count**: "Showing X businesses"
- **Business cards**:
  - Logo/photo
  - Business name (clickable)
  - Verification badge (if verified)
  - Short description
  - Category and location
  - Phone number
  - "View Website" button (only if paid hosting active)
- **Pagination**: "Load More" button

**Business Card States:**
- **Free listing**: No website link, phone only
- **Paid listing**: "View Website" button visible
- **Promoted**: Subtle badge or border highlight
- **Verified**: Gold star icon next to name

### Business Detail Page

**URL**: `https://tafuta.ke/business/doreen-beauty-parlour`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta         [Language] EN │
├─────────────────────────────────────┤
│  [← Back to Search]                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     [Business Logo]         │    │
│  └─────────────────────────────┘    │
│                                     │
│  Doreen Beauty Parlour  Verified    │
│  Professional hair and beauty       │
│                                     │
│  Kenyatta Avenue, Machakos Town     │
│  +254712345678                      │
│  doreen@example.com                 │
│  doreen.machakos.tafuta.ke          │
│                                     │
│  [Call Now]  [Visit Website]        │
│                                     │
│  About                              │
│  We offer professional hair         │
│  styling, braiding, makeup, and     │
│  nail services for all occasions.   │
│                                     │
│  Hours                              │
│  Mon-Sat: 8:00 AM - 6:00 PM         │
│  Sunday: Closed                     │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- **Back button**: Return to search results
- **Business header**: Logo, name, verification badge
- **Contact info**: Address, phone, email, website
- **Action buttons**: "Call Now" (tel: link), "Visit Website"
- **About section**: Business description
- **Hours**: Operating hours (if provided)

**MVP Note**: Keep detail page simple; no reviews, ratings, or interactive maps in MVP.

### Category Landing Page

**URL**: `https://tafuta.ke/category/salons`

Layout similar to search results, pre-filtered by category. Shows page title "Salons in Kenya", region filter dropdown, breadcrumb (Home > Salons).

### Region Landing Page

**URL**: `https://tafuta.ke/region/machakos`

Layout similar to search results, pre-filtered by region. Shows page title "Businesses in Machakos", category filter dropdown, breadcrumb (Home > Machakos).

---

## Business Owner Config Panel

### Dashboard (Home)

**URL**: `https://tafuta.ke/config`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]      │
├─────────────────────────────────────┤
│ Welcome back, John!                 │
│                                     │
│  Your Businesses                    │
│  ┌─────────────────────────────┐    │
│  │ Doreen Beauty Parlour       │    │
│  │ Status: Active              │    │
│  │ Website: 45 days left       │    │
│  │ [Manage]  [Renew]           │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Grace Hair Studio           │    │
│  │ Status: Pending Approval    │    │
│  │ [Edit Profile]              │    │
│  └─────────────────────────────┘    │
│                                     │
│  [+ Add New Business]               │
│                                     │
│  Quick Actions                      │
│  • Purchase Services                │
│  • View Transactions                │
│  • Edit Profile                     │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- **Header**: Logo, user menu (profile, logout)
- **Welcome message**: Personalized with nickname
- **Business cards**: Status (Active, Pending, Expired), service expiration dates
- **Quick actions**: Common tasks
- **Add business button**: Create new business listing

**Pending Business Message:**
```
┌─────────────────────────────────────┐
│ Pending Approval                    │
│                                     │
│ Your business is being reviewed by  │
│ our team. We'll notify you within   │
│ 24 hours. You can edit your profile │
│ while waiting.                      │
└─────────────────────────────────────┘
```

### Business Profile Editor

**URL**: `https://tafuta.ke/config/business/:id/profile`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]      │
├─────────────────────────────────────┤
│ Edit Business Profile               │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│  Status: Active                     │
│                                     │
│  [EN] [SW] [KK] [KY]               │
│                                     │
│  Business Name *                    │
│  ┌───────────────────────────────┐  │
│  │ Doreen Beauty Parlour         │  │
│  └───────────────────────────────┘  │
│                                     │
│  Category *      Region *           │
│  [Salon ▼]       [Machakos ▼]      │
│                                     │
│  Description                        │
│  ┌───────────────────────────────┐  │
│  │ Professional hair and beauty  │  │
│  │ services...                   │  │
│  └───────────────────────────────┘  │
│                                     │
│  Phone *                            │
│  ┌───────────────────────────────┐  │
│  │ +254712345678                 │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Upload Logo]                      │
│                                     │
│  Version 3 • Last updated Feb 22   │
│  [View History]                     │
│                                     │
│  [Save Changes]  [Cancel]           │
└─────────────────────────────────────┘
```

**Key Elements:**
- **Status indicator**: Shows approval status
- **Language tabs**: Switch between EN/SW/KK/KY for multi-language content
- **Form sections**: Basic info, contact info, location
- **Required fields**: Marked with asterisk (*)
- **Logo upload**: File picker
- **Version indicator**: Shows current version number and last updated date
- **Version history link**: "View History" button

**Technical Implementation:**
- Editor reads/writes to `content_json` field in database
- Form updates specific paths in JSON structure
- On save, system creates history record before updating
- Change summary auto-generated or user-provided

### Content Version History

**URL**: `https://tafuta.ke/config/business/:id/history`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]      │
├─────────────────────────────────────┤
│ Content Version History             │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│  Current Version: 3                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Version 3 (Current)         │    │
│  │ Feb 22, 2026 at 2:30 PM     │    │
│  │ Changed by: You             │    │
│  │ Added new service: Pedicure │    │
│  │ [View]                      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Version 2                   │    │
│  │ Feb 20, 2026 at 3:15 PM     │    │
│  │ Changed by: You             │    │
│  │ Updated business hours      │    │
│  │ [View]  [Restore]           │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Version 1                   │    │
│  │ Jan 15, 2026 at 10:00 AM    │    │
│  │ Changed by: System          │    │
│  │ Initial business creation   │    │
│  │ [View]  [Restore]           │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Key Features:**
- Timeline view in reverse chronological order
- Version details: number, timestamp, who changed it, change summary
- View button: Preview content at that version
- Restore button: Rollback to previous version (with confirmation modal)

**Restore Confirmation Modal:**
```
┌─────────────────────────────────────┐
│ Restore Previous Version?           │
├─────────────────────────────────────┤
│ You are about to restore:           │
│ Version 2 (Feb 20, 2026)            │
│                                     │
│ This will create Version 4 with     │
│ content from Version 2. Current     │
│ changes will be saved in history.   │
│                                     │
│ Reason (optional):                  │
│ ┌─────────────────────────────────┐ │
│ │ Reverting accidental changes    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]  [Restore Version]         │
└─────────────────────────────────────┘
```

### Website Content Editor

**URL**: `https://tafuta.ke/config/business/:id/website`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]      │
├─────────────────────────────────────┤
│ Edit Website Content                │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│  doreen.machakos.tafuta.ke          │
│                                     │
│  [Preview Website]                  │
│                                     │
│  [EN] [SW] [KK] [KY]               │
│                                     │
│  About Section                      │
│  ┌───────────────────────────────┐  │
│  │ We offer professional hair... │  │
│  └───────────────────────────────┘  │
│                                     │
│  Services                           │
│  • Hair styling                     │
│  • Braiding                         │
│  • Makeup                           │
│  [+ Add Service]                    │
│                                     │
│  Operating Hours                    │
│  Monday:    [8:00 AM] - [6:00 PM]   │
│  ...                                │
│  Sunday:    [Closed]                │
│                                     │
│  Gallery (Image Gallery Service)    │
│  ┌───┐ ┌───┐ ┌───┐                  │
│  │ 1 │ │ 2 │ │ 3 │ [+ Add Image]   │
│  └───┘ └───┘ └───┘                  │
│                                     │
│  [Save Changes]  [Cancel]           │
└─────────────────────────────────────┘
```

**Key Elements:**
- **Preview button**: Opens website in new tab
- **Language tabs**: Multi-language content entry
- **Content sections**: About, services, hours, gallery
- **Image gallery**: Upload up to 50 images (only shown if image gallery service purchased)
- **Version indicator**: Shows current content version

**MVP Note**: Website editor is only accessible if business has purchased website hosting service.

**Future Enhancement**: AI-assisted content updates
```
┌─────────────────────────────────────┐
│ AI Assistant (Future)               │
├─────────────────────────────────────┤
│ Tell me what you'd like to change:  │
│ ┌─────────────────────────────────┐ │
│ │ Add a new service: Pedicure for │ │
│ │ 800 KES                         │ │
│ └─────────────────────────────────┘ │
│ [Generate Update]                   │
│                                     │
│ Preview of changes:                 │
│ • Added "Pedicure" to services list │
│ • Price: 800 KES                    │
│                                     │
│ [Apply Changes]  [Cancel]           │
└─────────────────────────────────────┘
```

### Service Management

**URL**: `https://tafuta.ke/config/business/:id/services`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]      │
├─────────────────────────────────────┤
│ Manage Services                     │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│                                     │
│  Active Services                    │
│  ┌─────────────────────────────┐    │
│  │ Website Hosting             │    │
│  │ Expires: Aug 21, 2026       │    │
│  │ 6 months remaining          │    │
│  │ [Renew]                     │    │
│  └─────────────────────────────┘    │
│                                     │
│  Available Services                 │
│  ┌─────────────────────────────┐    │
│  │ Ads                         │    │
│  │ 200 KES/month               │    │
│  │ Promote your business       │    │
│  │ [Purchase]                  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Search Promotion            │    │
│  │ 150 KES/month               │    │
│  │ Appear higher in search     │    │
│  │ [Purchase]                  │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Key Elements:**
- Active services with expiration dates
- Available services with pricing and description
- Purchase and Renew action buttons

### Transaction History

**URL**: `https://tafuta.ke/config/business/:id/transactions`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]      │
├─────────────────────────────────────┤
│ Transaction History                 │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Feb 21, 2026                │    │
│  │ Website Hosting (6 months)  │    │
│  │ 1,392 KES                   │    │
│  │ Completed                   │    │
│  │ [View Receipt]              │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Jan 15, 2026                │    │
│  │ Ads (3 months)              │    │
│  │ 696 KES                     │    │
│  │ Completed                   │    │
│  │ [View Receipt]              │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Load More]                        │
└─────────────────────────────────────┘
```

**Key Elements:**
- Transaction cards: Date, service, amount, status
- Receipt links: Download PDF receipt
- Status indicators: Completed, Pending, Failed
- Load More pagination

### User Management

**URL**: `https://tafuta.ke/config/business/:id/users`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]      │
├─────────────────────────────────────┤
│ Manage Users                        │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│                                     │
│  Team Members                       │
│  ┌─────────────────────────────┐    │
│  │ John Doe (You)              │    │
│  │ Owner                       │    │
│  │ +254712345678               │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Jane Smith                  │    │
│  │ Employee                    │    │
│  │ +254712345679               │    │
│  │ [Edit Role]  [Remove]       │    │
│  └─────────────────────────────┘    │
│                                     │
│  [+ Add Team Member]                │
└─────────────────────────────────────┘
```

**Key Elements:**
- User cards with name, role, phone
- Owner can change roles (Admin/Employee)
- Remove button: Remove user from business
- Add button: Invite new team member by phone

---

## Multi-Language UI

### Language Switcher

**Location**: Top right of every page

**Options**: EN (English), SW (Swahili), KK (Kikamba), KY (Kikuyu)

**Behavior:**
- Persists across sessions (stored in user preferences)
- Applies to all UI text, notifications, emails
- Business content language is independent (owner manages per-language content)

### Translation Coverage

All UI elements must be translated:
- Navigation labels
- Button text
- Form labels and placeholders
- Error messages
- Notification templates
- Email templates
- SMS templates

**Fallback**: If translation missing, display English.

---

## PWA Features

### Installation Prompt

Shown after user visits site 2-3 times:

```
┌─────────────────────────────────────┐
│ Install Tafuta                      │
│                                     │
│ Add Tafuta to your home screen for  │
│ quick access to local businesses.   │
│                                     │
│ [Install]  [Not Now]                │
└─────────────────────────────────────┘
```

### App Icon

- Use Tafuta-icon1 from sample-images
- Multiple sizes for different devices
- Splash screen with logo

### Offline Support

**Network-first caching**: Fetch from server first; fall back to cache only when offline.

**Offline message:**
```
┌─────────────────────────────────────┐
│ You're offline                      │
│                                     │
│ Showing cached results. Connect to  │
│ see the latest businesses.          │
└─────────────────────────────────────┘
```

---

## User Flows

### New Business Owner Registration

1. User visits home page
2. Clicks "List Your Business"
3. Redirected to registration page
4. Enters phone, name, accepts terms
5. Account created; OTP sent to verify phone
6. User enters OTP; phone verified
7. Redirected to config panel
8. Clicks "Add New Business"
9. Fills business profile form
10. Submits → Business status = "pending"
11. Sees "Pending Approval" message
12. Receives notification when approved
13. Business goes live

### Purchasing Services

1. Owner logs into config panel
2. Navigates to "Manage Services"
3. Clicks "Purchase" on desired service
4. Selects number of months
5. Reviews total (with VAT)
6. Clicks "Proceed to Payment"
7. Redirected to PesaPal
8. Completes payment
9. Redirected back to Tafuta
10. Sees "Payment Successful" message
11. Service activated immediately
12. Receives confirmation SMS/email

### Public User Searching

1. User visits home page
2. Enters search query or selects category
3. Selects region
4. Views search results
5. Clicks on business card
6. Views business detail page
7. Clicks "Call Now" or "Visit Website"

---

## Responsive Design

### Breakpoints

- **Mobile**: < 768px (primary focus)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px (adequate, not the focus)

### Mobile-First Approach

- Single column layout on mobile; elements stack vertically
- Full-width buttons
- Touch-friendly tap targets (minimum 44x44px)
- Bottom navigation for config panel on mobile

### Performance Optimization

- Compress images (WebP format)
- Lazy load images below fold
- Minimize CSS/JS bundle size
- Network-first PWA caching (always fetch fresh when online)
- Progressive enhancement (works without JS for basic content)

### Accessibility

- WCAG 2.1 Level AA compliance
- Minimum 4.5:1 color contrast ratio for text
- All interactive elements keyboard-accessible
- Semantic HTML (headings, lists, buttons)
- Alt text for images
- ARIA labels where needed

---

## Testing Requirements

### Usability Testing
- Test with Gen Z users in Kenya
- Test on low-end smartphones
- Test on 3G network conditions
- Test in multiple languages

### Responsive Testing
- Test on various screen sizes (320px - 1920px)
- Test on iOS and Android devices
- Test landscape and portrait orientations

### Performance Testing
- Page load time < 3 seconds on 3G
- Time to interactive < 5 seconds
- Lighthouse PWA score > 90

### Accessibility Testing
- Keyboard navigation
- Screen reader compatibility
- Color contrast validation (WCAG 2.1 AA)
- Touch target size validation (minimum 44x44px)

---

## MVP Exclusions (Post-Launch)

- User reviews and ratings
- Business photo galleries (except paid image gallery service)
- Interactive maps (use address text in MVP)
- Favorite businesses
- Social sharing
- Advanced search filters (price range, hours, etc.)
- Business messaging/chat
- Native iOS/Android app
- Dark mode

---

**End of PRD-04**
