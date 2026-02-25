# PRD-05: Admin Dashboard & Configuration

**Product Requirements Document**
**Version**: 1.0
**Last Updated**: Feb 22, 2026
**Status**: Draft

---

## Overview

This PRD defines the internal admin dashboard and configuration tools for Tafuta staff to manage the platform. Focus is on essential admin functions needed for MVP launch, including business approval, user management, system configuration, and monitoring.

**Key Principle**: Empower admin staff and marketing agents to efficiently manage the platform while maintaining quality control.

---

## Admin Roles & Permissions

### Role Hierarchy

```
admin_users:
  - admin_user_id (UUID, primary key)
  - user_id (UUID, foreign key to users table)
  - role (enum: super_admin, admin, support_staff)
  - is_active (boolean, default: true)
  - created_at (timestamp)
  - created_by (UUID, nullable)
```

### Permission Matrix

| Feature | Super Admin | Admin | Support Staff |
|---------|-------------|-------|---------------|
| Approve/reject businesses | ✓ | ✓ | ✓ |
| Suspend/delete businesses | ✓ | ✓ | ✗ |
| Manage admin users | ✓ | ✗ | ✗ |
| Adjust subscriptions | ✓ | ✓ | ✗ |
| Process refunds | ✓ | ✓ | ✗ |
| View auth logs | ✓ | ✓ | ✓ |
| View audit logs | ✓ | ✓ | ✓ |
| Edit system config | ✓ | ✗ | ✗ |
| View analytics | ✓ | ✓ | ✓ |
| Send notifications | ✓ | ✓ | ✗ |

**MVP Note**: Marketing agents are not admin users in MVP; they use support staff accounts if given admin access.

---

## Admin Dashboard UI

### Dashboard Home

**URL**: `https://tafuta.ke/admin`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ [Tafuta Logo] Admin Dashboard    [Admin Name ▼] [Logout]│
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ Pending │ │ Active  │ │ Total   │ │ Revenue │        │
│ │ Approval│ │ Business│ │ Users   │ │ (Month) │        │
│ │   12    │ │   456   │ │  1,234  │ │ 125,000 │        │
│ │ Review  │ │         │ │         │ │   KES   │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
│                                                          │
│ Quick Actions                                            │
│ • Review Pending Businesses (12)                         │
│ • View Recent Transactions                               │
│ • Check Auth Logs                                        │
│ • Send Notification                                      │
│                                                          │
│ Recent Activity                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 2:30 PM - New business registered: "Grace Salon"   │  │
│ │ 2:15 PM - Payment completed: Doreen Beauty (1,392) │  │
│ │ 1:45 PM - Business approved: "Kiki's Restaurant"   │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Alerts                                                   │
│ 12 businesses pending approval (>24 hours: 3)           │
│ 5 services expiring in next 7 days                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Key Metrics:**
- **Pending Approval**: Count of businesses awaiting review (alert if > 10)
- **Active Businesses**: Total businesses with `status = 'active'`
- **Total Users**: Registered user accounts
- **Revenue (Month)**: Total revenue for current month

**Recent Activity**: Last 10 system events (registrations, payments, approvals). Refresh every 30 seconds.

**Alerts**: Pending businesses > 24 hours old; services expiring soon; failed payments requiring attention.

### Side Navigation

```
Dashboard
Businesses
  ├── Pending Approval
  ├── All Businesses
  └── Suspended
Users
  ├── All Users
  └── Suspended Users
Transactions
  ├── All Transactions
  └── Refunds
Services
  ├── Active Subscriptions
  └── Expiring Soon
Logs
  ├── Auth Logs
  └── Audit Logs
System
  ├── Configuration
  ├── Admin Users
  └── Notifications
Analytics
```

---

## Business Management

### Pending Business Approval Queue

**URL**: `https://tafuta.ke/admin/businesses/pending`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Pending Business Approvals (12)                          │
├─────────────────────────────────────────────────────────┤
│ Sort: [Oldest First ▼]  Filter: [All Regions ▼]         │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Grace Hair Studio                                  │  │
│ │ Submitted: 2 days ago by John Doe (+254712345678)  │  │
│ │ Category: Salon  •  Region: Machakos               │  │
│ │ Phone: +254712345679  •  Email: grace@example.com  │  │
│ │                                                    │  │
│ │ Description:                                       │  │
│ │ Professional hair styling and makeup services...   │  │
│ │                                                    │  │
│ │ [View Full Profile]  [Approve]  [Reject]           │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Kiki's Restaurant                                  │  │
│ │ Submitted: 1 day ago by Jane Smith (+254712345680) │  │
│ │ Category: Restaurant  •  Region: Kisumu            │  │
│ │ Phone: +254712345681  •  Email: kiki@example.com   │  │
│ │                                                    │  │
│ │ [View Full Profile]  [Approve]  [Reject]           │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [Load More]                                              │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- Sort options: Oldest first, newest first, by region
- Filter options: By region, by category
- Age indicator: Highlight businesses pending > 24 hours
- Bulk actions: Select multiple, approve/reject all

**Approval Modal:**

```
┌─────────────────────────────────────┐
│ Approve Business?                   │
├─────────────────────────────────────┤
│ Grace Hair Studio                   │
│                                     │
│ This business will become visible   │
│ in public listings and the owner    │
│ will be notified via SMS/email.     │
│                                     │
│ [Cancel]  [Approve Business]        │
└─────────────────────────────────────┘
```

**Rejection Modal:**

```
┌─────────────────────────────────────┐
│ Reject Business?                    │
├─────────────────────────────────────┤
│ Grace Hair Studio                   │
│                                     │
│ Reason for rejection: *             │
│ ┌─────────────────────────────────┐ │
│ │ Incomplete information          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Common reasons:                     │
│ • Incomplete information            │
│ • Invalid phone number              │
│ • Duplicate listing                 │
│ • Inappropriate content             │
│                                     │
│ [Cancel]  [Reject Business]         │
└─────────────────────────────────────┘
```

**Notification System:**
- **Daily digest email**: "You have X pending businesses" (sent at 9 AM)
- **Alert threshold**: When pending > 10, show alert on dashboard

### All Businesses List

**URL**: `https://tafuta.ke/admin/businesses`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ All Businesses (456)                                     │
├─────────────────────────────────────────────────────────┤
│ Search: [Business name, phone, email...]                 │
│ Status: [All ▼]  Region: [All ▼]  Category: [All ▼]     │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Doreen Beauty Parlour          Status: Active      │  │
│ │ Owner: John Doe (+254712345678)                    │  │
│ │ Salon  •  Machakos  •  Verified                    │  │
│ │ Services: Website Hosting (expires Aug 21, 2026)   │  │
│ │ [View]  [Edit]  [Suspend]  [More ▼]                │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Page 1 of 23  [Previous]  [Next]                        │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- Search by business name, owner name, phone, email
- Filters: Status, region, category, verification tier
- Actions: View details, edit, suspend, delete
- Bulk actions: Export to CSV, bulk suspend

**Business Detail View:**

```
┌─────────────────────────────────────────────────────────┐
│ Business Details: Doreen Beauty Parlour                 │
├─────────────────────────────────────────────────────────┤
│ Status: Active  •  Verification: Verified               │
│ Created: Jan 15, 2026  •  Approved: Jan 15, 2026        │
│ Approved by: Admin User (admin@tafuta.ke)               │
│                                                          │
│ Basic Information                                        │
│ • Business Name: Doreen Beauty Parlour                   │
│ • Category: Salon                                        │
│ • Region: Machakos  •  City: Machakos Town               │
│ • Address: Kenyatta Avenue                               │
│ • Phone: +254712345678                                   │
│ • Email: doreen@example.com                              │
│ • Website: doreen.machakos.tafuta.ke                     │
│                                                          │
│ Owner Information                                        │
│ • Name: John Doe  •  Phone: +254712345678               │
│ • Role: Owner                                            │
│                                                          │
│ Active Services                                          │
│ • Website Hosting: 6 months, expires Aug 21, 2026        │
│ • Ads: 3 months, expires May 21, 2026                    │
│                                                          │
│ Transaction History                                      │
│ • Feb 21, 2026: Website Hosting (6 months) - 1,392 KES  │
│ • Jan 15, 2026: Ads (3 months) - 696 KES                 │
│                                                          │
│ Content Version                                          │
│ • Current Version: 3                                     │
│ • Last Updated: Feb 22, 2026 by John Doe                 │
│ [View Content History]                                   │
│                                                          │
│ [Edit Profile]  [Adjust Services]  [Suspend]  [Delete]  │
└─────────────────────────────────────────────────────────┘
```

**Admin Content History View:**

```
┌─────────────────────────────────────────────────────────┐
│ Content History: Doreen Beauty Parlour                  │
├─────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐  │
│ │ Version 3 (Current)                                │  │
│ │ Feb 22, 2026 at 2:30 PM                            │  │
│ │ Changed by: John Doe (Owner)  •  Type: owner_edit  │  │
│ │ Summary: Added new service: Pedicure               │  │
│ │ [View Content]  [Rollback to Previous]             │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Version 2                                          │  │
│ │ Feb 20, 2026 at 3:15 PM                            │  │
│ │ Changed by: John Doe (Owner)  •  Type: owner_edit  │  │
│ │ Summary: Updated business hours                    │  │
│ │ [View Content]  [Restore This Version]             │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Admin Rollback Capability:**
- Admin can view full content history for any business
- Admin can rollback to any previous version
- Rollback creates a new version (doesn't delete history)
- Rollback logged in audit trail with admin user_id and reason
- Business owner notified of admin rollback

### Business Actions

**Suspend Business:**
```
┌─────────────────────────────────────┐
│ Suspend Business?                   │
├─────────────────────────────────────┤
│ Doreen Beauty Parlour               │
│                                     │
│ Reason for suspension: *            │
│ ┌─────────────────────────────────┐ │
│ │ Violation of terms              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ This will:                          │
│ • Hide business from public search  │
│ • Disable website                   │
│ • Notify owner via SMS/email        │
│ • Log action in audit trail         │
│                                     │
│ [Cancel]  [Suspend Business]        │
└─────────────────────────────────────┘
```

**Delete Business (Soft Delete):**
```
┌─────────────────────────────────────┐
│ Delete Business?                    │
├─────────────────────────────────────┤
│ Doreen Beauty Parlour               │
│                                     │
│ This action cannot be undone.       │
│                                     │
│ Reason for deletion: *              │
│ ┌─────────────────────────────────┐ │
│ │ Owner requested deletion        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Type business name to confirm:      │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]  [Delete Business]         │
└─────────────────────────────────────┘
```

---

## User Management

### All Users List

**URL**: `https://tafuta.ke/admin/users`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ All Users (1,234)                                        │
├─────────────────────────────────────────────────────────┤
│ Search: [Name, phone, email...]                          │
│ Status: [All ▼]  Verification: [All ▼]                   │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ John Doe                          Status: Active   │  │
│ │ +254712345678  •  john@example.com                 │  │
│ │ Verification: Basic  •  Joined: Jan 15, 2026       │  │
│ │ Businesses: 2 (Owner: 2)                           │  │
│ │ [View]  [Suspend]  [More ▼]                        │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Page 1 of 62  [Previous]  [Next]                        │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- Search by name, phone, email
- Filters: Status, verification tier
- Actions: View details, suspend, delete
- Export: CSV export of user list

**User Detail View:**

```
┌─────────────────────────────────────────────────────────┐
│ User Details: John Doe                                   │
├─────────────────────────────────────────────────────────┤
│ Status: Active  •  Verification: Basic                   │
│ Created: Jan 15, 2026  •  Last Active: Feb 22, 2026      │
│                                                          │
│ Contact Information                                      │
│ • Full Name: John Doe  •  Nickname: Johnny               │
│ • Phone: +254712345678 (verified)                        │
│ • Email: john@example.com                                │
│ • Language: English                                      │
│                                                          │
│ Businesses                                               │
│ • Doreen Beauty Parlour (Owner)                          │
│ • Grace Hair Studio (Owner)                              │
│                                                          │
│ Activity                                                 │
│ • Last Login: Feb 22, 2026 at 2:30 PM                    │
│ • Failed Login Attempts: 0                               │
│                                                          │
│ Notification Preferences                                 │
│ • Marketing SMS: Opted In                                │
│ • Marketing Email: Opted Out                             │
│                                                          │
│ [Suspend User]  [Delete User]  [View Auth Logs]         │
└─────────────────────────────────────────────────────────┘
```

---

## Transaction Management

### All Transactions

**URL**: `https://tafuta.ke/admin/transactions`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ All Transactions                                         │
├─────────────────────────────────────────────────────────┤
│ Date Range: [Last 30 Days ▼]                             │
│ Status: [All ▼]  Type: [All ▼]                           │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Feb 21, 2026 2:30 PM                               │  │
│ │ Doreen Beauty Parlour                              │  │
│ │ Website Hosting (6 months)                         │  │
│ │ 1,392 KES  •  Status: Completed                    │  │
│ │ PesaPal Ref: TFT-TX-123456                         │  │
│ │ [View Receipt]  [View Details]                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Total: 125,000 KES (this period)                         │
│ Page 1 of 45  [Previous]  [Next]                        │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- Filters: Date range, status, transaction type
- Export: CSV export for accounting
- Search by business name, reference number
- Total revenue metric for selected period

### Refund Management

**URL**: `https://tafuta.ke/admin/refunds`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Refund Requests                                          │
├─────────────────────────────────────────────────────────┤
│ Status: [Pending ▼]                                      │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Refund Request #RF-001                             │  │
│ │ Created: Feb 20, 2026 by Admin User                │  │
│ │                                                    │  │
│ │ Business: Doreen Beauty Parlour                    │  │
│ │ Owner: John Doe (+254712345678)                    │  │
│ │                                                    │  │
│ │ Services to Refund:                                │  │
│ │ • Website Hosting: 2 months                        │  │
│ │                                                    │  │
│ │ Refund Amount: 400 KES                             │  │
│ │ Processing Fee (5%): 20 KES                        │  │
│ │ Net Refund: 380 KES                                │  │
│ │                                                    │  │
│ │ Notes: Customer request due to relocation          │  │
│ │ Status: Pending Approval                           │  │
│ │ [Approve]  [Reject]                                │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Refund Workflow:**
1. Admin creates refund request (in-person at office)
2. System calculates refund amount and 5% processing fee
3. Admin approves request
4. Admin disburses cash to customer
5. Admin marks refund as completed
6. System updates subscriptions and generates refund receipt

---

## Service Management

### Active Subscriptions

**URL**: `https://tafuta.ke/admin/services/active`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Active Service Subscriptions                             │
├─────────────────────────────────────────────────────────┤
│ Service Type: [All ▼]  Expiring: [All ▼]                │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Doreen Beauty Parlour                              │  │
│ │ Website Hosting                                    │  │
│ │ Expires: Aug 21, 2026 (6 months remaining)         │  │
│ │ Status: Active                                     │  │
│ │ [Adjust]  [View Details]                           │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Manual Adjustment Modal:**

```
┌─────────────────────────────────────┐
│ Adjust Subscription                 │
├─────────────────────────────────────┤
│ Doreen Beauty Parlour               │
│ Service: Website Hosting            │
│                                     │
│ Current Values:                     │
│ • Months Paid: 6                    │
│ • Expiration: Aug 21, 2026          │
│                                     │
│ New Months Paid:                    │
│ ┌─────────────────────────────────┐ │
│ │ 8                               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ New Expiration Date:                │
│ ┌─────────────────────────────────┐ │
│ │ Oct 21, 2026                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Reason for adjustment: *            │
│ ┌─────────────────────────────────┐ │
│ │ Compensation for 2-day downtime │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]  [Save Adjustment]         │
└─────────────────────────────────────┘
```

All manual adjustments are logged in the audit trail with actor, old values, new values, and reason.

### Expiring Soon

**URL**: `https://tafuta.ke/admin/services/expiring`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Services Expiring Soon (5)                               │
├─────────────────────────────────────────────────────────┤
│ Timeframe: [Next 7 Days ▼]                               │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Grace Hair Studio                                  │  │
│ │ Ads Service                                        │  │
│ │ Expires: Feb 25, 2026 (3 days)                     │  │
│ │ Owner: Jane Smith (+254712345679)                  │  │
│ │ [Send Reminder]  [View Business]                   │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Filters: Next 7 days, next 30 days, expired
- Bulk actions: Send reminder to all
- System sends automatic reminders at 7 days, 3 days, 1 day before expiry

---

## Logs & Monitoring

### Authentication Logs

**URL**: `https://tafuta.ke/admin/logs/auth`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Authentication Logs                                      │
├─────────────────────────────────────────────────────────┤
│ User: [All ▼]  Event: [All ▼]  Date: [Last 7 Days ▼]    │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Feb 22, 2026 2:30 PM                               │  │
│ │ Login Success                                      │  │
│ │ User: John Doe (+254712345678)                     │  │
│ │ IP: 192.168.1.1  •  Device: iPhone Safari          │  │
│ │ [View Details]                                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Feb 22, 2026 2:15 PM                               │  │
│ │ Login Failed                                       │  │
│ │ Phone: +254712345999                               │  │
│ │ Reason: Invalid OTP                                │  │
│ │ IP: 192.168.1.2  •  Device: Android Chrome         │  │
│ │ [View Details]                                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Page 1 of 120  [Previous]  [Next]                       │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- Filters: User, event type, date range
- Search by phone number, IP address
- Export: CSV for security audits
- Alerts: Flag suspicious activity (multiple failed attempts)

### Audit Logs

**URL**: `https://tafuta.ke/admin/logs/audit`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Audit Logs                                               │
├─────────────────────────────────────────────────────────┤
│ Actor: [All ▼]  Action: [All ▼]  Date: [Last 7 Days ▼]  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Feb 22, 2026 3:45 PM                               │  │
│ │ Action: adjusted_expiration                        │  │
│ │ Actor: admin@tafuta.ke (Admin User)                │  │
│ │ Entity: service_subscription (Doreen Beauty)       │  │
│ │ Old: 6 months, expires Aug 21                      │  │
│ │ New: 8 months, expires Oct 21                      │  │
│ │ Reason: "Compensation for 2-day downtime"          │  │
│ │ [View Details]                                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Feb 22, 2026 2:35 PM                               │  │
│ │ Action: content_rollback                           │  │
│ │ Actor: admin@tafuta.ke (Admin User)                │  │
│ │ Entity: business_content (Doreen Beauty)           │  │
│ │ Rolled back from: Version 3 to Version 2           │  │
│ │ Reason: "Inappropriate content added by owner"     │  │
│ │ [View Details]                                     │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Logged Actions:**
- Business approvals/rejections
- Business suspensions/deletions
- User suspensions/deletions
- Subscription adjustments
- Refund processing
- Content rollbacks (admin-initiated)
- System configuration changes
- Admin user management

**Retention**: Audit logs retained for 7 years (compliance requirement).

---

## System Configuration

### System Config Editor

**URL**: `https://tafuta.ke/admin/system/config`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ System Configuration                                     │
├─────────────────────────────────────────────────────────┤
│ Super Admin Only                                         │
│                                                          │
│ Legal Identity (for VAT receipts)                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Business Name: eBiashara Rahisi Ltd                │  │
│ │ KRA PIN: P051234567X                               │  │
│ │ VAT Registration Number: 0123456789                │  │
│ │ Business Address: Nairobi, Kenya                   │  │
│ │ Business Registration Number: CPR/2024/123456      │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Service Pricing                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Website Hosting: 200 KES/month                     │  │
│ │ Ads: 200 KES/month                                 │  │
│ │ Search Promotion: 150 KES/month                    │  │
│ │ Image Gallery: 100 KES/month                       │  │
│ │ [Edit Pricing]                                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ VAT Rate: 16%  [Edit VAT Rate]                          │
│                                                          │
│ [Save Changes]                                           │
└─────────────────────────────────────────────────────────┘
```

System config changes are logged in audit trail and require Super Admin role.

### Admin User Management

**URL**: `https://tafuta.ke/admin/system/admins`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Admin Users                                              │
├─────────────────────────────────────────────────────────┤
│ Super Admin Only                                         │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Admin User                                         │  │
│ │ admin@tafuta.ke  •  Role: Super Admin              │  │
│ │ Active  •  Created: Jan 1, 2026                    │  │
│ │ [Edit]  [Deactivate]                               │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Support Staff                                      │  │
│ │ support@tafuta.ke  •  Role: Support Staff          │  │
│ │ Active  •  Created: Jan 15, 2026                   │  │
│ │ [Edit]  [Deactivate]                               │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [+ Add Admin User]                                       │
└─────────────────────────────────────────────────────────┘
```

**Add Admin User Modal:**

```
┌─────────────────────────────────────┐
│ Add Admin User                      │
├─────────────────────────────────────┤
│ Email: *                            │
│ ┌─────────────────────────────────┐ │
│ │ newadmin@tafuta.ke              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Role: *                             │
│ [Super Admin ▼]                     │
│                                     │
│ Link to existing user (optional):   │
│ ┌─────────────────────────────────┐ │
│ │ Search by phone...              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]  [Add Admin User]          │
└─────────────────────────────────────┘
```

---

## Notification System

### Send Notification

**URL**: `https://tafuta.ke/admin/notifications/send`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Send Notification                                        │
├─────────────────────────────────────────────────────────┤
│ Recipients: *                                            │
│ ○ All Users                                              │
│ ○ All Business Owners                                    │
│ ○ Specific Business                                      │
│ ○ Specific User                                          │
│                                                          │
│ Channel: *                                               │
│ [x] SMS  [x] Email  [x] In-App                          │
│                                                          │
│ Language: [English ▼]                                    │
│                                                          │
│ Subject (Email only):                                    │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Important Update from Tafuta                       │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Message: *                                               │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Dear {nickname},                                   │  │
│ │                                                    │  │
│ │ We are excited to announce...                      │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Available variables: {nickname}, {business_name}         │
│                                                          │
│ Preview:                                                 │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Dear John,                                         │  │
│ │ We are excited to announce...                      │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Estimated Recipients: 1,234 users                        │
│ Estimated Cost: 123 KES (SMS only)                       │
│                                                          │
│ [Cancel]  [Send Notification]                            │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Recipient targeting: All users, business owners, specific business/user
- Multi-channel: SMS, email, in-app
- Multi-language: Select language for message
- Template variables: Personalize with user data
- Preview before sending
- Cost estimate shown for SMS

---

## Analytics & Reporting

### Analytics Dashboard

**URL**: `https://tafuta.ke/admin/analytics`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Analytics                                                │
├─────────────────────────────────────────────────────────┤
│ Date Range: [Last 30 Days ▼]                             │
│                                                          │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ New     │ │ New     │ │ Revenue │ │ Active  │        │
│ │ Users   │ │ Business│ │         │ │ Services│        │
│ │   234   │ │    45   │ │ 125,000 │ │   456   │        │
│ │ +12%    │ │  +8%    │ │  +15%   │ │  +5%    │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
│                                                          │
│ Revenue Trend                                            │
│ [Line chart showing revenue over time]                   │
│                                                          │
│ Top Categories                                           │
│ 1. Salons (123 businesses)                               │
│ 2. Restaurants (89 businesses)                           │
│ 3. Shops (67 businesses)                                 │
│                                                          │
│ Top Regions                                              │
│ 1. Machakos (234 businesses)                             │
│ 2. Kisumu (222 businesses)                               │
│                                                          │
│ Service Breakdown                                        │
│ • Website Hosting: 345 active (76%)                      │
│ • Ads: 123 active (27%)                                  │
│ • Search Promotion: 89 active (20%)                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Key Metrics:** New users, new businesses, revenue, active services (all with % change vs prior period); top categories and regions; service adoption rates.

**Export Options:** CSV, PDF report.

---

## API Endpoints (Admin)

### Business Management
- `GET /api/admin/businesses/pending` - List pending businesses
- `POST /api/admin/businesses/:id/approve` - Approve business
- `POST /api/admin/businesses/:id/reject` - Reject business with reason
- `POST /api/admin/businesses/:id/suspend` - Suspend business
- `DELETE /api/admin/businesses/:id` - Soft delete business
- `GET /api/admin/businesses` - List all businesses with filters

### User Management
- `GET /api/admin/users` - List all users with filters
- `POST /api/admin/users/:id/suspend` - Suspend user
- `DELETE /api/admin/users/:id` - Soft delete user (anonymize PII)

### Service Management
- `PATCH /api/subscriptions/:id/adjust` - Manually adjust subscription
- `GET /api/admin/services/expiring` - List expiring services

### Refund Management
- `POST /api/refunds/request` - Create refund request
- `PATCH /api/refunds/:id/approve` - Approve refund
- `PATCH /api/refunds/:id/complete` - Mark refund as completed
- `GET /api/admin/refunds` - List all refunds

### Logs
- `GET /api/admin/auth-logs` - View authentication logs
- `GET /api/admin/audit-logs` - View audit logs

### System Configuration
- `GET /api/admin/system/config` - Get system configuration (Super Admin)
- `PATCH /api/admin/system/config` - Update system configuration (Super Admin)
- `GET /api/admin/system/admins` - List admin users (Super Admin)
- `POST /api/admin/system/admins` - Add admin user (Super Admin)
- `DELETE /api/admin/system/admins/:id` - Remove admin user (Super Admin)

### Notifications & Analytics
- `POST /api/admin/notifications/send` - Send notification
- `GET /api/admin/analytics` - Get analytics data

**Detailed API specs**: See PRD-03-api.md

---

## Security Requirements

### Admin Authentication

- **Separate admin login**: Different from public user login
- **Email + password**: Admin users use email/password (no OTP)
- **Session timeout**: 30 minutes of inactivity
- **2FA**: Optional; recommended post-MVP
- **IP whitelisting**: Optional restriction to office IP (post-MVP)

### Audit Trail

All admin actions are logged with: actor (admin user_id), action, timestamp, affected entity, old and new values, and reason (required for sensitive actions). Audit logs retained for 7 years.

### Role-Based Access Control

- Enforce permissions on every API request
- UI hides actions the current user cannot perform
- Log unauthorized access attempts

---

## Testing Requirements

### Unit Tests
- Permission checks for all admin roles
- Business approval/rejection logic
- Subscription adjustment calculations
- Refund processing logic

### Integration Tests
- Business approval flow (pending → approved → owner notified)
- User suspension flow (active → suspended → reinstated)
- Admin refund processing (request → approve → complete)
- Fee schedule update affecting new payments only

### E2E Tests
- Admin approves pending business → business becomes visible in public listings
- Admin suspends user → user cannot log in → admin reinstates → user can log in
- Admin adjusts subscription → owner receives notification

---

## MVP Exclusions (Post-Launch)

- Advanced analytics (conversion funnels, cohort analysis)
- Automated business verification (AI/ML)
- Bulk import/export tools
- Custom admin roles with granular permissions
- Admin mobile app
- Real-time notifications (WebSocket)
- Scheduled reports and custom dashboards
- Marketing agent portal (separate from admin)
- Business performance insights
- A/B testing tools

---

**End of PRD-05**
