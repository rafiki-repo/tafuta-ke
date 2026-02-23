# PRD-04: User Interface & Experience

**Product Requirements Document**  
**Version**: 1.0  
**Last Updated**: Feb 22, 2026  
**Status**: Draft

---

## Overview

This PRD defines the user interface and experience for Tafuta MVP, covering public-facing pages, business owner config panel, and design specifications. Focus is on mobile-first, low-bandwidth, Gen Z appeal for suburban/rural Kenya.

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
- **Reference**: Yelp (business directory UI - see sample-images folder)
- **Style**: Modern, clean, playful without being childish

### Brand Identity

**Colors:**
- **Primary**: Deep Orange (R:237, G:76, B:34) - `#ED4C22`
- **Secondary**: Black - `#000000`
- **Background**: White - `#FFFFFF`
- **Accent**: Light gray for borders/dividers - `#E5E5E5`

**Logo/Branding:**
- Use Tafuta-icon1 and/or Tafuta-logo1 from sample-images folder
- Icon for app install (PWA)
- Logo in header/navigation

**Typography:**
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
│   Find Local Businesses in Kenya   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 🔍 Search businesses...       │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Machakos ▼]  [All Categories ▼] │
│                                     │
├─────────────────────────────────────┤
│  Browse by Category                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ 🏪  │ │ 🍽️  │ │ 💇  │ │ 🔧  │  │
│  │Shop │ │Food │ │Salon│ │Repair│ │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
│                                     │
│  Featured Businesses                │
│  ┌─────────────────────────────┐   │
│  │ [Logo] Business Name        │   │
│  │ ⭐ Verified                  │   │
│  │ Salon • Machakos            │   │
│  │ 📞 +254...                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [View All Businesses]              │
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
- **Footer**: Links to about, contact, terms, privacy
- Note: Footer is not locked to bottom of page but only appears when scrolling to the bottom of the page.

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
│  ┌───────────────────────────────┐ │
│  │ 🔍 salon                      │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Machakos ▼]  [Salon ▼]           │
│                                     │
│  Showing 24 businesses              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [Logo] Doreen Beauty Parlour│   │
│  │ ⭐ Verified                  │   │
│  │ Professional hair & beauty   │   │
│  │ Salon • Machakos Town        │   │
│  │ 📞 +254712345678             │   │
│  │ [View Website]               │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [Logo] Grace Hair Studio    │   │
│  │ Hair styling & makeup        │   │
│  │ Salon • Machakos             │   │
│  │ 📞 +254...                  │   │
│  └─────────────────────────────┘   │
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
  - "View Website" button (if paid hosting)
- **Pagination**: "Load More" button (infinite scroll alternative)

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
│  ┌─────────────────────────────┐   │
│  │     [Business Logo]         │   │
│  └─────────────────────────────┘   │
│                                     │
│  Doreen Beauty Parlour ⭐          │
│  Professional hair and beauty       │
│                                     │
│  📍 Kenyatta Avenue, Machakos Town  │
│  📞 +254712345678                   │
│  ✉️  doreen@example.com             │
│  🌐 doreen.machakos.tafuta.ke       │
│                                     │
│  [Call Now] [Visit Website]         │
│                                     │
│  About                              │
│  We offer professional hair styling,│
│  braiding, makeup, and nail services│
│  for all occasions.                 │
│                                     │
│  Hours                              │
│  Mon-Sat: 8:00 AM - 6:00 PM         │
│  Sunday: Closed                     │
│                                     │
│  Location                           │
│  [Map placeholder]                  │
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
- **Location**: Map placeholder (future: interactive map)

**MVP Note**: Keep detail page simple; no reviews, ratings, or photos in MVP.

### Category Landing Page

**URL**: `https://tafuta.ke/category/salons`

**Layout**: Similar to search results page, pre-filtered by category

**Key Elements:**
- Page title: "Salons in Kenya"
- Region filter dropdown
- List of businesses in category
- Breadcrumb: Home > Salons

### Region Landing Page

**URL**: `https://tafuta.ke/region/machakos`

**Layout**: Similar to search results page, pre-filtered by region

**Key Elements:**
- Page title: "Businesses in Machakos"
- Category filter dropdown
- List of businesses in region
- Breadcrumb: Home > Machakos

---

## Business Owner Config Panel

### Dashboard (Home)

**URL**: `https://tafuta.ke/config` or `https://tafuta.ke/admin`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]     │
├─────────────────────────────────────┤
│ Dashboard                           │
├─────────────────────────────────────┤
│  Welcome back, John! 👋             │
│                                     │
│  Your Businesses                    │
│  ┌─────────────────────────────┐   │
│  │ Doreen Beauty Parlour       │   │
│  │ Status: Active ✓            │   │
│  │ Website: 45 days left       │   │
│  │ [Manage] [Renew]            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Grace Hair Studio           │   │
│  │ Status: Pending Approval ⏳ │   │
│  │ [Edit Profile]              │   │
│  └─────────────────────────────┘   │
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
- **Business cards**: List of user's businesses with status
  - **Active**: Green checkmark, service expiration dates
  - **Pending**: Orange clock icon, "Edit Profile" option
  - **Expired**: Red warning, "Renew" button
- **Quick actions**: Common tasks
- **Add business button**: Create new business listing

**Pending Business Message:**
```
┌─────────────────────────────────────┐
│ ⏳ Pending Approval                 │
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
│ [Logo] Tafuta    [User Menu ▼]     │
├─────────────────────────────────────┤
│ Edit Business Profile               │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│  Status: Active ✓                   │
│                                     │
│  Basic Information                  │
│  Business Name *                    │
│  ┌───────────────────────────────┐ │
│  │ Doreen Beauty Parlour         │ │
│  └───────────────────────────────┘ │
│                                     │
│  Category *                         │
│  [Salon ▼]                          │
│                                     │
│  Region *                           │
│  [Machakos ▼]                       │
│                                     │
│  Description                        │
│  ┌───────────────────────────────┐ │
│  │ Professional hair and beauty  │ │
│  │ services...                   │ │
│  └───────────────────────────────┘ │
│                                     │
│  Contact Information                │
│  Phone *                            │
│  ┌───────────────────────────────┐ │
│  │ +254712345678                 │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Upload Logo]                      │
│                                     │
│  [Save Changes] [Cancel]            │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- **Status indicator**: Shows approval status
- **Form sections**: Basic info, contact info, location
- **Required fields**: Marked with asterisk (*)
- **Logo upload**: Drag-and-drop or file picker
- **Language tabs**: Switch between EN/SW/KK/KY for multi-language content
- **Version indicator**: "Version 3 • Last updated Feb 22, 2026"
- **Version history link**: "View History" button
- **Save button**: Prominent orange button
- **Cancel button**: Secondary gray button

**Multi-Language Support:**
```
[EN] [SW] [KK] [KY]  ← Language tabs

Business Name (English) *
┌───────────────────────────────┐
│ Doreen Beauty Parlour         │
└───────────────────────────────┘

Description (English)
┌───────────────────────────────┐
│ Professional hair and beauty  │
│ services...                   │
└───────────────────────────────┘
```

**Technical Implementation:**
- Editor reads/writes to `content_json` field in database
- Form updates specific paths in JSON structure (e.g., `content_json.profile.en.description`)
- On save, system creates history record before updating
- Change summary auto-generated or user-provided

### Content Version History

**URL**: `https://tafuta.ke/config/business/:id/history`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]     │
├─────────────────────────────────────┤
│ Content Version History             │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│  Current Version: 3                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Version 3 (Current)         │   │
│  │ Feb 22, 2026 at 2:30 PM     │   │
│  │ Changed by: You             │   │
│  │ Added new service: Pedicure │   │
│  │ [View]                      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Version 2                   │   │
│  │ Feb 20, 2026 at 3:15 PM     │   │
│  │ Changed by: You             │   │
│  │ Updated business hours      │   │
│  │ [View] [Restore]            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Version 1                   │   │
│  │ Jan 15, 2026 at 10:00 AM    │   │
│  │ Changed by: System          │   │
│  │ Initial business creation   │   │
│  │ [View] [Restore]            │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Key Features:**
- **Timeline view**: All versions in reverse chronological order
- **Version details**: Version number, timestamp, who changed it, summary
- **View button**: Preview content at that version
- **Restore button**: Rollback to previous version (with confirmation)
- **Current version badge**: Highlight current version

**Restore Confirmation Modal:**
```
┌─────────────────────────────────────┐
│ Restore Previous Version?           │
├─────────────────────────────────────┤
│ You are about to restore:           │
│ Version 2 (Feb 20, 2026)            │
│                                     │
│ This will create a new version      │
│ (Version 4) with the content from   │
│ Version 2. Your current changes     │
│ will be saved in history.           │
│                                     │
│ Reason for rollback (optional):     │
│ ┌─────────────────────────────────┐ │
│ │ Reverting accidental changes    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel] [Restore Version]          │
└─────────────────────────────────────┘
```

### Website Content Editor

**URL**: `https://tafuta.ke/config/business/:id/website`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]     │
├─────────────────────────────────────┤
│ Edit Website Content                │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│  Website: doreen.machakos.tafuta.ke │
│                                     │
│  [Preview Website]                  │
│                                     │
│  About Section                      │
│  ┌───────────────────────────────┐ │
│  │ We offer professional hair... │ │
│  └───────────────────────────────┘ │
│                                     │
│  Services                           │
│  • Hair styling                     │
│  • Braiding                         │
│  • Makeup                           │
│  [+ Add Service]                    │
│                                     │
│  Operating Hours                    │
│  Monday:    [8:00 AM] - [6:00 PM]   │
│  Tuesday:   [8:00 AM] - [6:00 PM]   │
│  ...                                │
│  Sunday:    [Closed]                │
│                                     │
│  Gallery (Image Gallery Service)    │
│  ┌───┐ ┌───┐ ┌───┐                 │
│  │ 1 │ │ 2 │ │ 3 │ [+ Add Image]   │
│  └───┘ └───┘ └───┘                 │
│                                     │
│  [Save Changes] [Cancel]            │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- **Preview button**: Opens website in new tab
- **Content sections**: About, services, hours, gallery
- **Rich text editor**: Simple formatting (bold, italic, lists)
- **Image gallery**: Upload up to 50 images (if service purchased)
- **Language tabs**: Multi-language content entry
- **Version indicator**: Shows current content version
- **Auto-save**: Draft changes saved locally (not to database)

**Technical Implementation:**
- Editor modifies `content_json.website` section
- Visual editor provides UI for JSON structure
- On save, creates history record with change summary
- Preview renders from current `content_json` state

**MVP Note**: Website editor only available if business has purchased website hosting service.

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
│ [Apply Changes] [Cancel]            │
└─────────────────────────────────────┘
```

### Service Management

**URL**: `https://tafuta.ke/config/business/:id/services`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]     │
├─────────────────────────────────────┤
│ Manage Services                     │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│                                     │
│  Active Services                    │
│  ┌─────────────────────────────┐   │
│  │ Website Hosting             │   │
│  │ Expires: Aug 21, 2026       │   │
│  │ 6 months remaining          │   │
│  │ [Renew]                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  Available Services                 │
│  ┌─────────────────────────────┐   │
│  │ Ads                         │   │
│  │ 200 KES/month               │   │
│  │ Promote your business       │   │
│  │ [Purchase]                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Search Promotion            │   │
│  │ 150 KES/month               │   │
│  │ Appear higher in search     │   │
│  │ [Purchase]                  │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- **Active services**: List with expiration dates
- **Available services**: Cards with pricing and description
- **Purchase buttons**: Navigate to payment flow
- **Renew buttons**: Quick renewal for expiring services

### Transaction History

**URL**: `https://tafuta.ke/config/business/:id/transactions`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]     │
├─────────────────────────────────────┤
│ Transaction History                 │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Feb 21, 2026                │   │
│  │ Website Hosting (6 months)  │   │
│  │ 1,392 KES                   │   │
│  │ Status: Completed ✓         │   │
│  │ [View Receipt]              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Jan 15, 2026                │   │
│  │ Ads (3 months)              │   │
│  │ 696 KES                     │   │
│  │ Status: Completed ✓         │   │
│  │ [View Receipt]              │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Load More]                        │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- **Transaction cards**: Date, service, amount, status
- **Receipt links**: Download PDF receipt
- **Status indicators**: Completed (green), Pending (orange), Failed (red)
- **Pagination**: Load more button

### User Management

**URL**: `https://tafuta.ke/config/business/:id/users`

**Layout:**

```
┌─────────────────────────────────────┐
│ [Logo] Tafuta    [User Menu ▼]     │
├─────────────────────────────────────┤
│ Manage Users                        │
├─────────────────────────────────────┤
│  Doreen Beauty Parlour              │
│                                     │
│  Team Members                       │
│  ┌─────────────────────────────┐   │
│  │ John Doe (You)              │   │
│  │ Owner                       │   │
│  │ +254712345678               │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Jane Smith                  │   │
│  │ Employee                    │   │
│  │ +254712345679               │   │
│  │ [Edit Role] [Remove]        │   │
│  └─────────────────────────────┘   │
│                                     │
│  [+ Add Team Member]                │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements:**
- **User cards**: Name, role, phone
- **Role management**: Owner can change roles (Admin/Employee)
- **Remove button**: Remove user from business
- **Add button**: Invite new team member by phone

---

## Design Components

### Navigation

**Top Navigation (Public):**
- Logo (left)
- Search bar (center, desktop only)
- Language switcher (right)
- "List Your Business" button (right, orange)

**Top Navigation (Config Panel):**
- Logo (left)
- Business name (center)
- User menu dropdown (right)
  - Profile
  - My Businesses
  - Logout

**Side Navigation (Config Panel, Desktop):**
- Dashboard
- Business Profile
- Website Content
- Services
- Transactions
- Team Members

**Bottom Navigation (Config Panel, Mobile):**
- Dashboard icon
- Business icon
- Services icon
- More menu

### Buttons

**Primary Button (Orange):**
- Background: `#ED4C22`
- Text: White
- Border radius: 8px
- Padding: 12px 24px
- Font weight: Bold

**Secondary Button (Gray):**
- Background: White
- Text: Black
- Border: 1px solid `#E5E5E5`
- Border radius: 8px
- Padding: 12px 24px

**Icon Button:**
- Circular or square
- Icon only (no text)
- Used for actions like edit, delete

### Cards

**Business Card:**
- White background
- Border: 1px solid `#E5E5E5`
- Border radius: 12px
- Padding: 16px
- Shadow: Subtle drop shadow on hover

**Service Card:**
- Similar to business card
- Includes pricing badge (orange)
- "Purchase" button at bottom

### Forms

**Input Fields:**
- Border: 1px solid `#E5E5E5`
- Border radius: 8px
- Padding: 12px
- Focus: Orange border `#ED4C22`

**Dropdowns:**
- Similar to input fields
- Chevron icon on right

**Text Areas:**
- Multi-line input
- Resize: Vertical only

**File Upload:**
- Drag-and-drop zone
- Dashed border
- "Click to upload" text
- File type and size limits shown

### Status Indicators

**Badges:**
- **Verified**: Gold star icon + "Verified" text
- **Pending**: Orange clock icon + "Pending Approval"
- **Active**: Green checkmark + "Active"
- **Expired**: Red warning icon + "Expired"

**Progress Bars:**
- Show service expiration progress
- Orange fill, gray background

### Loading States

**Spinner:**
- Orange circular spinner
- Center of screen or inline

**Skeleton Screens:**
- Gray placeholder boxes
- Animate shimmer effect
- Used for business cards while loading

### Error States

**Error Message:**
- Red background `#FEE2E2`
- Red text `#DC2626`
- Error icon
- Clear error description

**Empty State:**
- Icon or illustration
- "No businesses found" message
- Suggestion to adjust filters or add business

---

## Responsive Design

### Breakpoints

- **Mobile**: < 768px (primary focus)
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile-First Approach

**Design for mobile first, enhance for larger screens:**
- Single column layout on mobile
- Stack elements vertically
- Full-width buttons
- Collapsible sections
- Bottom navigation for config panel

**Touch-Friendly:**
- Minimum tap target: 44x44px
- Adequate spacing between interactive elements
- Swipe gestures for navigation (future)

### Performance Optimization

**Low-Bandwidth Considerations:**
- Compress images (WebP format)
- Lazy load images below fold
- Minimize CSS/JS bundle size
- Cache static assets
- Progressive enhancement (works without JS)

---

## Accessibility

### WCAG 2.1 Level AA Compliance

**Color Contrast:**
- Text on white: Minimum 4.5:1 ratio
- Orange buttons: White text for contrast

**Keyboard Navigation:**
- All interactive elements accessible via keyboard
- Visible focus indicators
- Logical tab order

**Screen Readers:**
- Semantic HTML (headings, lists, buttons)
- Alt text for images
- ARIA labels where needed

**Language Support:**
- `lang` attribute on HTML elements
- Right-to-left (RTL) support (future)

---

## Multi-Language UI

### Language Switcher

**Location**: Top right of every page

**Format**: Dropdown or flag icons
- EN (English)
- SW (Swahili)
- KK (Kikamba)
- KY (Kikuyu)

**Behavior:**
- Persists across sessions (stored in user preferences)
- Applies to all UI text, notifications, emails
- Business content language independent (owner manages)

### Translation Coverage

**All UI elements translated:**
- Navigation labels
- Button text
- Form labels and placeholders
- Error messages
- Notification templates
- Email templates
- SMS templates

**Fallback**: If translation missing, display English

---

## PWA Features

### Installation Prompt

**When**: After user visits site 2-3 times

**Prompt**:
```
┌─────────────────────────────────────┐
│ Install Tafuta                      │
│                                     │
│ Add Tafuta to your home screen for  │
│ quick access to local businesses.   │
│                                     │
│ [Install] [Not Now]                 │
└─────────────────────────────────────┘
```

### App Icon

- Use Tafuta-icon1 from sample-images
- Multiple sizes for different devices
- Splash screen with logo

### Offline Support

**Network-first caching:**
- Fetch from server first
- Fall back to cache if offline
- Show offline indicator when no connection

**Offline message:**
```
┌─────────────────────────────────────┐
│ ⚠️ You're offline                   │
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
5. Receives OTP, verifies
6. Account created, redirected to config panel
7. Clicks "Add New Business"
8. Fills business profile form
9. Submits → Business status = "pending"
10. Sees "Pending Approval" message
11. Receives notification when approved
12. Business goes live

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
2. Enters search query (e.g., "salon")
3. Selects region (e.g., "Machakos")
4. Clicks search or presses enter
5. Views search results
6. Clicks on business card
7. Views business detail page
8. Clicks "Call Now" or "Visit Website"

---

## MVP Exclusions (Post-Launch)

- User reviews and ratings
- Business photo galleries (except paid service)
- Interactive maps (use static map placeholder)
- Favorite businesses (marked as [Future] in requirements)
- Social sharing
- Advanced search filters (price range, hours, etc.)
- Business messaging/chat
- Mobile app (native iOS/Android)
- Dark mode
- Customizable themes

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

### Accessibility Testing

- Keyboard navigation
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Color contrast validation
- Touch target size validation

### Performance Testing

- Page load time < 3 seconds on 3G
- Time to interactive < 5 seconds
- Lighthouse score > 90

---

## Dependencies

- **Frontend Framework**: React 18+
- **UI Library**: TailwindCSS or similar
- **Icons**: Lucide or similar icon library
- **Internationalization**: next-intl
- **PWA**: Service Worker, Web App Manifest
- **Design Assets**: Tafuta-icon1, Tafuta-logo1 from sample-images

---

**End of PRD-04**
