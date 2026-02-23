GAPS AND QUESTIONS FROM CLAUDE:
SEE RESPONSE FROM TED THE SOFTWARE ENGINEER BELOW MARKED WITH THE TEXT [Ted]

# High-Level Requirements Document Review

[Claude] I've reviewed `@c:\~Local\github\tafuta\docs\tafuta-Requirements.md:1-383` and identified the following gaps and questions that need to be addressed at the high-level requirements level:

## Critical Gaps

### 1. **Business Directory & Search Functionality**
- **Missing**: Core search functionality details (how users search for businesses, search filters, search ranking/relevance)
[Ted] Searching will be similar to Yelp. See the images in docs/sample-images. 
[Ted] If on the main page, user is presented with entire list of businesses ordered by a Tufuta defined ranking that is focused more on giving multiple businesses opportunity to be seen, but allowing a slight advantage to businesses that pay for promotion.
[Ted] If on a landing page, business list will be filtered based on region or topic as defined in the URL parameters.
[Ted] The user can type into the search bar to filter results. 
[Ted] User is presented with other regions and topics and can click them to navigate to other landing pages or further filter results.

- **Missing**: Topic/category taxonomy definition (what categories exist, how they're organized)
[Ted] For MVP let the topic list be flat.
[Ted] For MVP let the category list be flat.

- **Missing**: Region/location taxonomy (what regions/cities are supported)
[Ted] For MVP let the region list be flat.

- **Missing**: Landing page structure and content strategy for topic-specific pages
[Ted] Keep it simple. Using a flow similar to Yelp, but further simplified.

- **Gap**: Line 51 mentions "semi-custom domain" hosting but no requirements for domain management, DNS setup, or SSL certificates
[Ted] DNS management will be handled by the backend through CLoudFlare API calls. Let Caddy handle the SSL cerrtificates. Include Caddy as a required deployment component.

### 2. **Website Hosting Service**
- **Missing**: What constitutes a "single page website"? (templates, customization options, content limits)
[Ted] The single page website will be template based with only 1 template in the MVP.
[Ted] Here is an example of the template: https://heartofkenya.com/machakos/doreenbeautyparlour 
[Ted] The basic template will not include the list of images in the middle of the single page. By paying for additional promotion, the business profile can include he list of products or images in the middle of the single page.

- **Missing**: Website creation/editing workflow for business owners
[Ted] All content for the single page will be included in a single JSON file.
[Ted] The fields in theJSON file can be managed by the user through the config panel.
[Ted] The JSON file will be used to generate the single page website.

- **Missing**: Content management requirements (text, images, videos, contact forms, etc.)
[Ted] Images will be uploaded to the backend through the config panel. There will be no videos in the MVP. Contact forms will not be included in the MVP. As descibed above, text will be managed through the config panel - and needs to include mutliple languages.

- **Missing**: Website activation/deactivation behavior when payments lapse
[Ted] I'm not sure what you are asking. The app needs to be able to recognize when a business profile has reached the end of "paid services" (months) and deactivate the website or any promotions.

- **Missing**: Storage limits and bandwidth considerations
[Ted] MVP will not include storage limits and bandwidth considerations.

### 3. **Ads/Promotions System**
- **Incomplete**: Lines 272-277 mention ads but provide no detail on:
  - Ad types and formats [Ted] Ad templates will be provided. All add info will be included in a single JSON file. One related image will be refered to in the JSON file. Image will be located in the images/ads folder.
  - Ad placement rules and rotation [Ted] Ads will be placed randomly in any business list. Ads will be rotated based on a Tafuta defined ranking.
  - Ad pricing model (cost per impression, per click, per month?) [Ted] Ads will be priced based on cost per month.
  - Ad creation workflow [Ted] Ads will be created through the config panel by the business owner/admin or by a Tufuta admin. Ads will be associated with a business profile. Ads will be paid for by the business owner/admin or by a Tufuta admin.
  - Ad performance tracking/analytics [Ted] Ads will include super simpleperformance tracking/analytics such as # of times clicked and # of times seen.
  - How ads relate to the payment/balance system [Ted] Ads will be paid for by the business owner/admin in the same manner as other web hosting services.

### 4. **Payment & Service Model Clarity**
- **Ambiguity**: Line 26 mentions "monthly or in advance" payments and tracking "number of months paid for," but:
  - What specific services are paid monthly? (website hosting only? ads? premium listings?) [Ted] Web hosting, ads, search ranking promotion (causes your ad to show up higher and/or more oftenin search results), and a "premium listing" status that will add a gold star to their listing (must meet certain criteria - payment pays for person to review the business to make sure they meet the criteria).
  - What is free vs. paid? [Ted] free basic listing with no promotion, no one-page webiste, and no ads.
  - How are different service types priced? [Ted] TBD. Exmaple, 200 KES per month for web hosting.
  - The fee schedule section (163-167) is too vague - needs actual service types defined [Ted] Service types are the same as the services listed above: web hosting, ads, promotion, and premium listing.
  [Ted] Forgot to mention, Businesses can qualify for discounts. Example: if business has 5 or more employees paid at or above minimum wage, they get a 50% discount. We need to include a way to track and apply the discounts. And manage when the discounts were last reviewed by Tafuta staff so we can trigger a review when the discount period expires (or remove discount when it expires).

- **Gap**: No clear service tiers or packages defined (e.g., Basic Directory Listing free, Website Hosting [X KES/month], Premium Promotion) [Ted] See above

### 5. **Business Profile vs. Website Distinction**
- **Unclear**: The relationship between:
  - Free directory listing (always visible)
  - Business profile page
  - Paid single-page website
  - Are these three different things or the same thing with different states? [Ted] Same thing with different states. If the user changes any content in the config panel, it will affect all three assuming the config item changed is exposed via the relavant template.

### 6. **Geographic Scope**
- **Missing**: Which regions/cities in Kenya are supported at launch? [Ted] MVP will be Machakos, and Kisumi only.
- **Missing**: Geolocation requirements (how precise? GPS coordinates vs. city/region selection?) [Ted] The precision will be whatever gets entered in the config panel. In the future the user should be able to click "use my current location" while standing in their business location.

## Important Questions

### 7. **User Roles & Permissions**
- Line 99 references "permissions defined in PRD-01" for Employee role, but at high-level: what can Employees actually do vs. not do? [Ted] TBD. Assume the employee can manage the business profile and website content/images.
- **Missing**: Admin user roles (are there different types of Tafuta admins? Super admin vs. support staff?) [Ted] Assume 3 levels of Tafuta staff: Super Admin, Admin, and Support Staff (or just 'staff').

### 8. **Data Privacy & Compliance**
- **Gap**: No mention of GDPR/international users (is this Kenya-only? What if diaspora users sign up?) [Ted] Kenya only.
- **Gap**: Data export requirements (can users download their data?) [Ted] yes.
- **Gap**: Right to be forgotten vs. "financial records retained" - how is this reconciled in user communications? [Ted] If the user requests deletion, the user's PII will be anonymized. Financial records will be retained but are at that point anonymous. NOTE: Any data required to be retained for legal purposes will be retained.

### 9. **Performance & Scale**
- **Missing**: Expected user/business volume at launch and 1-year projection [Ted] who cares? Please don't BLOAT the requirements document.
- **Missing**: Search performance requirements (response time targets)
- Line 334 mentions "2x expected peak load" but no baseline defined [Ted] It has to be as fast as possible. Are you really going to program this any differently because I say "it has to be 2x expected peak load"? Feel free to remove the "2x" comment from the Requirements document.

### 10. **Multi-Language Support**
- **Incomplete**: Lines 65-66 mention future languages but:
  - Who translates content? (admin enters translations, but what about user-generated business content?) [Ted] Users/Admin enters translations.
  - Do business profiles support multiple languages? [Ted] yes.
  - How does language switching work in the UI? [Ted] I have an example of how it works on my current website. Would you like to make a design decision on best-proactice or research best-practice or just accept my example?

### 11. **Mobile App vs. Web**
- **Unclear**: Is this a responsive web app only, or will there be native mobile apps? [Ted] Responsive web app only.
- Line 64 says "smartphones only" but the tech stack shows Next.js (web framework)
[Ted] Please review all tech stack choices and adjust them to match the goals of the requirements.

### 12. **Business Verification Process**
- **Missing**: What does "admin has confirmed identity" actually require? (documents? in-person verification? phone call?) [Ted] MVP anything that the Tafuta staff deems necessary.
- **Missing**: What benefits do verified businesses get vs. unverified? [Ted] MVP the only difference will be a small indicator "verified" icon next to their listing.

## Minor Gaps

### 13. **Notification Delivery**
- Lines 187-194 define notification rules but don't specify:
  - Retry logic for failed SMS/email [Ted] REALLY? You put something this detailed in the high-level requirements document?
  - Delivery confirmation tracking [Ted] Sure - seems like this should be in the PRD. Please don't BLOAT the requirements document.
  - Notification history/archive for users [Ted] I'm not sure what this means. If you are asking if there should be a log of messages sent to the user, then yes. Is this really necessary in the high-level requirements document?

### 14. **Refund Processing**
- Line 156-158: "Tafuta Admin records a refund request" - is there a user-facing refund request form, or must users contact support? [Ted] No. User will visit the Tafuta office to request a refund.

### 15. **Session Management**
- Line 107: "60-minute timeout with activity-based extension" - what's the maximum session duration? [Ted] I'm not sure why you are asking the time-out maximum on a line that says 60-minutes. How about 60-minutes? Can we also add that if the user is actively using the app, the session will not time out? How this should be implemented seems like a PRD issue.

### 16. **Document Naming Inconsistency**
- Lines 377-382 reference "Yangu-REQUIREMENTS.md" and "Yangu" but the document is about "Tafuta" - this needs correction [Ted] I just fixed this. Good catch.

