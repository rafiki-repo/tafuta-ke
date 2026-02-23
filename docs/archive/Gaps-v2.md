# Gaps-v2: Follow-up Questions and New Concerns

**Date**: Feb 19, 2026  
**Status**: Awaiting Ted's responses

NOTE: My answers are below preceded by the text [Ted]

---

## Answers to Ted's Questions from Gaps-v1

### Q1: Multi-Language UI Switching
**Ted asked**: "I have an example of how it works on my current website. Would you like to make a design decision on best-practice or research best-practice or just accept my example?"

**Response needed**: Please share the example from your current website. I can then either:
- Accept your example as-is if it works well for Tafuta's use case
- Research best practices and compare with your example
- Make a design recommendation

For now, I'll defer this to PRD-01 (Authentication & User Management) where language preference handling will be detailed.

[Ted] Base on your evaluation in Language-Switch-Analysis.md, I would like to start with using the next-intl approach - but plan for a future state where we do NOT have to put 3 lines of code in place of each html tag that needs translation and we do not have to spearate the content from the html.

---

## New Gaps and Concerns from Ted's Answers

### Critical Issues

#### 1. **Business Profile vs. Directory Listing Confusion**
**Issue**: Ted stated that "free directory listing", "business profile page", and "paid single-page website" are "the same thing with different states." However, this creates ambiguity:

- Does a free business get a subdomain (e.g., businessname.machakos.tafuta.ke)? [Ted] If the business only has a free directory, then the subdomain field will be blank.
- If yes, what shows on that subdomain for free businesses vs. paid? [Ted] There is no subdomain for free business listings.
- Or does the free listing only appear in search results with no dedicated page? [Ted] The free listing will only appear in search results. No dedicated page.
- What is the user experience when someone clicks on a free business listing? [Ted] There is nothing to click on for free business listings.

**Recommendation**: Clarify the distinction between:
- **Directory listing** (appears in search results)
- **Business detail page** (what users see when they click a listing)
- **Hosted website** (paid feature with custom subdomain)

#### 2. **Search Ranking Algorithm Details**
**Issue**: Two different ranking systems mentioned:
- Main page: "Tafuta-defined ranking that gives multiple businesses opportunity to be seen, but allows slight advantage to businesses that pay for promotion"
- Ads: "rotated based on Tafuta-defined ranking"

**Questions**:
- Are these the same algorithm or different? [Ted] One ranking engine will determine the order in which the ads and listings are displayed. That engine will be adjusted over time and can start with a simple approach.
- What factors determine ranking? (payment status, verification tier, recency, user engagement, rotation to ensure fairness?) [Ted] Payment status determines visibility (if they are listed at all). Verification tier only affects the icon visibility "verified vendor" as stated previously. So the factors include promotion status and rotation to ensure fairness.
- How much advantage do paying businesses get? (e.g., 2x more likely to appear in top 10?) [Ted] Yes! Exactly!
- Should this be configurable by admin or hardcoded? [Ted] Configurable by admin. And the core algorithm may change over time - but will be adjusted by our programmer (you).

**Concern**: Without defining the ranking logic at a high level, the PRD authors won't know what data to track or what admin controls to build. [Ted] For the first 6 months no one will care. Just need to get the businesses into a list that people can search. We can iterate from there. Think AGILE.

#### 3. **Service Payment Model Inconsistency**
**Issue**: The requirements state businesses pay for services, but the database schema shows:
- `balances` table has `business_id` (correct)
- `transactions` table has `business_id` (correct)
- But earlier text mentions "users can pay for website hosting, promotions, and services" and "transfer tokens from their personal wallet to the business wallet"
[Ted] Scratch "transfer tokens from their personal wallet to the business wallet" - that was left over from a previous project. Please remove it. Users can pay their current bill based on services they have requested... and can prepay for future services (only items they have currently requested).

**Questions**:
- Do users have personal wallets/balances, or only businesses? [Ted] No wallet. No KES balance. Only number of months of paid services. Probably needs to be itemized by service in case the user pays for 6 months of hosting, then adds a promotion and only pays for 3 months of the promotion.
- If users have wallets, what are they used for? [Ted] Then don't have wallets.
- The schema doesn't show a user wallet - is this intentional? [Ted] Then don't have wallets.
- Should we remove references to "personal wallet" and "transfer tokens from personal wallet to business wallet"? [Ted] Yes. Then don't have wallets.

**Recommendation**: Clarify whether the payment model is:
- **Option A**: Only businesses have balances; users (as Owners) pay directly for business services [Ted] Yes - this option only.
- **Option B**: Users have personal wallets AND businesses have wallets; users transfer funds to businesses [Ted] no.

#### 4. **Discount System Complexity**
**Issue**: Ted introduced a discount system with review cycles and expiration. This adds significant complexity:

**Questions**:
- Who determines discount eligibility criteria? (Tafuta admin manually, or system checks automatically?) [Ted] Tafuta admin manually.
- How does the system verify criteria like "5+ employees paid at or above minimum wage"? (honor system, documentation required, Tafuta staff verification?) [Ted] Honor system verified by Tafuta staff.
- Can a business have multiple discounts simultaneously? [Ted] Yes.
- Are discounts applied to all services or specific services? [Ted] All services during MVP.
- What happens to active services when a discount expires? (price increases immediately, or grandfathered until next payment?) [Ted] Price increases at next payment event.
- Should there be a notification to business before discount expires? [Ted] Yes.

**Recommendation**: This needs a dedicated section in the requirements document explaining the discount lifecycle and verification process. [Ted] Yes - please add it.

#### 5. **Premium Listing Criteria Undefined**
**Issue**: Ted states premium listing "must meet certain criteria - payment pays for person to review the business to make sure they meet the criteria."

**Questions**:
- What are the criteria? (business verification tier, minimum months in operation, customer reviews, physical location verification?) [Ted] Tafuta staff will determine criteria and set the flag.
- Is this the same as the "Premium" verification tier, or different? [Ted] Same.
- Can an unverified business get a premium listing? [Ted] It is up to the Taftua staff to make that decision.
- What happens if a business fails the review after paying? [Ted] For MVP the payment is not adjusted. A Tafuta staff member can decide to either continue their listing or refund their payment manually. The system does not need to automate the decision process nor the refund.
- Is the payment refunded if they don't meet criteria? [Ted] Please stop trying to over think this. All you have to do is enable to system to take payemnts for services and Tafuta staff to adjust the listing flags and/or make refunds.
- How often is the premium listing re-verified? [Ted] Every 6 months.

#### 6. **Search Promotion vs. Ads Distinction**
**Issue**: Two separate paid services seem to overlap:
- **Ads**: "randomly placed in any business list" and "rotated based on Tafuta-defined ranking"
- **Search ranking promotion**: "causes business to show up higher and/or more often in search results"

**Questions**:
- Are these visually distinct in the UI? (ads have "Ad" label, promoted listings have "Promoted" label?) [Ted] They are separate. An ad can show up anywhere - maybe in a different category or on the home page.
- Can a business buy both simultaneously? [Ted] yes
- If a business has both, how do they interact? (does the ad show separately from the promoted listing?) [Ted] The ad shows separately from the promoted listing.
- Should promoted listings appear in organic results or in a separate "Promoted" section? [Ted] For MVP have the listings appear in the organic results in the top 10% as described above.

#### 7. **Config Panel Scope**
**Issue**: "Config panel" mentioned multiple times for different purposes:
- Business profile content management
- Website content management (JSON file)
- Multi-language content entry
- Image uploads
- Ad creation

**Questions**:
- Is this one unified config panel or multiple different panels? [Ted] One panel with tabs or sections for each of the above. User permissions determine visibility of each.
- Who has access? (all user roles, or only Owner/Admin?) [Ted] All users that login Admin/Owner/Employees can access the config panel because the only reasone they are logging in is to manage business content and the account.
- Is this part of the main Tafuta web app or a separate admin interface? [Ted] I would recommend a separate section of the main Tafuta web app. Such as /admin or /config.
- What's the difference between "business profile management" and "config panel"? [Ted] There is no difference. The config panel is where you would manager your business profile and content.

**Recommendation**: Define "config panel" clearly - is it the same as the business management dashboard?

#### 8. **JSON File Storage and Management**
**Issue**: Business content and ads stored in JSON files.

**Questions**:
- Are these JSON files stored in the database as JSON columns, or as actual files on disk? [Ted] I like keeping critical data in JSON files - such as the business profile, the ads, etc. The JSON files are stored on disk. This makes managing the website 10 times easier in my humble oppinion. Database tables can be used to keep a seatchable list of the businesses and ads. I'm sure this breaks best practices, so I can be talked out of it as long a the config panel is super easy to use.
- If files on disk, how are they backed up? [Ted] I will handle backups of the files and database.
- How are JSON files versioned? (what if user makes a mistake and wants to revert?) [Ted] This is a valid point. MVP will not have versioning but it can be added later. Maybe this is another strong reason to put all JSON in a database table.
- Is there a JSON schema validation? [Ted] No. The app is generating the JSON in most cases, so for MVP assume it is valid.
- How does the system handle concurrent edits by multiple users? [Ted] last write wins.
- Are there any size limits on the JSON files? [Ted] No. Not for MVP

**Concern**: File-based storage for critical business data is risky without proper version control and backup strategy. [Ted] except that this is a tiny little simple business directory that someone can re-input their business info in about 5 minutes. Let's not over engineer our starting point.

#### 9. **Image Storage and CDN**
**Issue**: Images uploaded through config panel, but infrastructure mentions Cloudflare CDN.

**Questions**:
- Where are images stored? (VPS disk, Cloudflare R2, S3-compatible storage?)
[Ted] For MVP images are stored on the VPS disk.
- Are images served through Cloudflare CDN or directly from VPS?
[Ted] For mvp images are served directly from the VPS disk.
- What happens to images when a business is deleted?
[Ted] If we legally have to remove them, then I guess we don't have a choice. However, it is not mandated, then leave them associated with the business record that is flagged as "deleted".
- Are there image size/dimension requirements or automatic resizing?
[Ted] This seems like a PRD level question - please don't bloat the requirements document. For MVP assume no image size/dimension requirements or automatic resizing.
- What image formats are supported beyond JPEG/PNG? [Ted] jpeg,png,webp
- Is there any image optimization/compression? [Ted] No. Not for MVP

#### 10. **Caddy Configuration Management**
**Issue**: Caddy required for SSL certificates and reverse proxy, with dynamic subdomain creation.

**Questions**:
- How does the Node.js backend communicate with Caddy to add new subdomains? [Ted] Yes.
- Does Caddy config need to be reloaded for each new business website? [Ted] Yes if it gets a subdomain.
- What happens if Caddy reload fails? [Ted] No action to take. Monitoring will notify us if the website is down. If you want to send the Tafuta staff an alert via SMS or Email that would be fine. Again, YOU ARE OVER THINKING AT THE TOP-LEVEL REQUIREMENTS DOCUMENT.
- Is there a limit to number of subdomains Caddy can handle? [Ted] No. Not for MVP.
- How are SSL certificates managed for hundreds/thousands of subdomains? [Ted] I don't know.
- Does this require Caddy API or file-based configuration? [Ted] I don't know. 

**Concern**: This is a critical infrastructure component that needs detailed specification in PRD-05. [Ted] YES! put it in the PRD. Thank you.

---

### Important Questions

#### 11. **Topic/Category Taxonomy**
**Issue**: Ted said "let the topic list be flat" and "let the category list be flat" - are these the same thing or different?

**Questions**:
- Are "topics" and "categories" synonyms, or are they different taxonomies? [Ted] yes, lets fix the Requirements to only use one term: category
- If different, what's the distinction? (topics = restaurants, hotels; categories = food service, hospitality?)
- How are topics/categories created and managed? (admin only, or predefined list?) [Ted] admin only for MVP
- Can businesses select multiple topics/categories? [Ted] yes for MVP - FUTURE may charge customer for multiple category listing and multiple location listings.

#### 12. **Region Taxonomy**
**Issue**: MVP supports Machakos and Kisumu only, but businesses have city, region, street_address1, street_address2, zipcode fields.

**Questions**:
- Is "region" in the database the same as the MVP regions (Machakos, Kisumu)? [Ted] Yes.
- What goes in "city" field vs "region" field? [Ted] city is the address of the business. region is the way people search for the business - ie. looking for a hotel in Machakos region.
- Are zipcodes used in Kenya? (if not, why is this field in the schema?) [Ted] yes - it is not called zipcode, but "postal code" and is based on the post office.
- Can businesses be in multiple regions? [Ted] yes - as mentioned there may be an upcharge for this feature.
- How granular is the location filtering? (city level, neighborhood level, GPS radius?) [Ted] region level. The goal is to promote local business. "Machakos" would include the town of Machakos and all surrounding small towns where people travel to machakos to shop, eat, etc.

#### 13. **Business Profile Content Fields**
**Issue**: Need to define what fields are in the business JSON file.

**Questions** (for PRD-02):
- What fields are required vs. optional? [Ted] most fields are optional
- What fields support multi-language? [Ted] all fields support multi-language
- Character limits for each field?
- Does the template reference: business name, description, hours, services, contact info, social media links, photos?
[Ted] - WHY ARE WE TALKING ABOUT THIS IN THE HIGH-LEVEL REQUIREMENTS????? WHO CARES???

#### 14. **Ad Content Fields**
**Issue**: Ads stored in JSON file with one image.

**Questions** (for PRD-02):
- What fields are in the ad JSON? (headline, body text, call-to-action, link URL?)
- Character limits?
- Multi-language support for ads?
- Can ads link to external URLs or only to the business profile?
[Ted] These are great questions for the PRD.

#### 15. **Payment Flow for Multiple Services**
**Issue**: A business can subscribe to multiple services (website hosting, ads, search promotion, premium listing).

**Questions**:
- Can a business pay for multiple services in one transaction?
- Are services billed together or separately?
- Can services have different billing cycles? (e.g., website paid for 6 months, ads paid monthly?)
- What happens when one service expires but others are still active?
- Can a business cancel individual services or must they cancel all?
[Ted] Make it super easy for the user. (that is all you need to say in the high-level requirements)

#### 16. **Promotional Image Gallery**
**Issue**: Ted mentioned "by paying for additional promotion, the business profile can include the list of products or images in the middle of the single page."

**Questions**:
- Is this a separate service type, or included with "search_promotion" or "ads"? [Ted] yes this can be a separate service type.
- How many images can be included? [Ted] 50
- Is there a separate upload flow for gallery images vs. main business images? [Ted] I don't care.
- Can images have captions or descriptions? [Ted] Yes, but that will be in the JSON for the business content.

#### 17. **Admin Notification Tools**
**Issue**: "Marketing SMS: sent by Tafuta central team only via admin notification tools."

**Questions**:
- What are these admin notification tools? (part of admin dashboard, separate system?)
- Can admins send to all users, or filtered segments? (by region, by verification tier, by service subscriptions?)
- Is there a message approval workflow?
- Are there sending limits to prevent spam?
- Can admins schedule messages for future delivery?
[Ted] These are great questions for the PRD. 

#### 18. **Reference Images**
**Issue**: Ted mentioned "See the images in docs/sample-images" for Yelp-like search functionality.

**Action needed**: Are these images available in the repository? If not, please provide them so the design can match your vision.
[Ted] Are you not able to see the images in the docs/sample-images folder? Please review the images that are already there and use that information to make sure the design matches the vision and the requirements are in alignment.

---

### Technical Concerns

#### 19. **Technology Stack Review**
**Issue**: Ted requested "Please review all tech stack choices and adjust them to match the goals of the requirements."

**Concerns**:
- **Next.js**: Typically used for server-side rendering and static site generation. For a mobile-first, low-bandwidth app, is this the right choice? Consider:
  - Plain React SPA with client-side routing might be lighter
  - Or Next.js with aggressive caching and static generation for business pages
  [Ted] Thank you for this recommendation. Lets go with React and a light weight solution.
- **Bull (Redis queue)**: Good choice for background jobs
- **Passport.js**: Solid for authentication
- **Express.js**: Standard choice for Node.js APIs
[Ted] Feel free to make other recommendation to keep the website as light-weight as possible.

**Recommendation**: Next.js can work well if configured properly for performance. Should be fine, but PRD-05 should specify:
- Static generation for business pages
- ISR (Incremental Static Regeneration) for updated content
- Aggressive caching strategy
- Code splitting and lazy loading

#### 20. **Database Schema Issues**

**Issue 1 - Wallet references**: Schema includes `wallet_id` in several tables but no `wallets` table defined.
- `promo_grants` has `wallet_id`
- `refund_requests` has `wallet_id`
- `spending_limits` has `wallet_id`
[Ted] Remove all "wallet" references. Ensure the schema can handle tracking of paid services and dates that services expire.

**Question**: Should these be `business_id` instead, or is there a missing `wallets` table?

**Issue 2 - App references**: Multiple tables reference `app_id`:
- `transactions` has `app_id`
- `fees` has `app_id`
- `spending_limits` has `app_id`
- `webhook_configs` has `app_id`
[Ted] Remove all references to "app". This was from another project and is not needed. There will only be a single app.

**Question**: What is an "app" in this context? Is this for future API integrations, or is it relevant to MVP?

**Recommendation**: If not needed for MVP, remove these fields or clarify their purpose.
[Ted] yes please. Remove them.

#### 21. **Cloudflare API Integration**
**Issue**: DNS management via Cloudflare API requires:
- Cloudflare API token with DNS edit permissions
- Logic to create DNS records for new subdomains
- Error handling if DNS creation fails
- Cleanup of DNS records when business is deleted
[Ted] Yes - this sounds like it should go IN THE PRD.

**Questions**:
- Should DNS records be deleted when business is deleted, or kept for historical reasons?
- What happens if a business name changes? (old subdomain redirects to new, or becomes unavailable?)
- How are subdomain naming conflicts handled? (two businesses want same name in same region?)
- Character restrictions on subdomain names? (alphanumeric only, length limits?)

#### 22. **Session Management Clarification**
**Issue**: Ted's answer about session timeout was unclear.

**Current understanding**: 60-minute timeout, but active usage extends session indefinitely.

**Questions**:
- What constitutes "active usage"? (any API call, or specific user actions?)
- Is there a maximum session duration for security? (e.g., force re-login after 24 hours regardless of activity?)
- How is this different from "remember me" functionality?
[Ted] What is best practice? Shouldn't this be in the PRD and not the requirements document? I don't want to frustrate the poor user or over complicate something that is a small lightweight app.

---

### Minor Gaps

#### 23. **Business Name Uniqueness**
**Question**: Can two businesses have the same name? If yes, how are subdomains differentiated? [Ted] Yes. First person to a sub-domain wins. Second business must choose a different subdomain.
- Example: Two "Duka La Mama" shops in Machakos
- Possible solutions: append number (dukalaama-2.machakos.tafuta.ke), require unique names, use business_id in subdomain
[Ted] App can recommend an alternative subdomain, but the user can change it to their liking as long as it does not already exist.
[Ted] Can we focus on high-level requirements????

[Ted] I'm going to stop here because everything from this point down is BLOAT. Please stay focused here on high-level requirements only. Keep this document LEAN. VERY LEAN. In fact, please review the tafuta-Requirements.md and look for BLOAT and please pair it down to the a minimum. keep the dialog focused on the things that clarify the app and its function and vision... not the details that will be in the PRDs.

#### 24. **Phone Number Format**
**Question**: What phone number format is required?
- International format (+254...)?
- Local format (07...)?
- Validation rules?
- Can users have multiple phone numbers?

#### 25. **Email Validation**
**Question**: Since email is optional, what happens when:
- User needs password reset but has no email?
- System needs to send important notifications but user only has phone?

#### 26. **Business Hours**
**Question**: Should business profiles include operating hours?
- If yes, what format? (structured data, free text, multi-language?)
- Different hours for different days?

#### 27. **Business Deletion Impact**
**Question**: When a business is deleted:
- What happens to the subdomain? (404 error, redirect to main site, "business no longer available" page?)
- What happens to ads associated with that business?
- What happens to users who only managed that business?

#### 28. **Verification Icon Display**
**Question**: Where does the "verified" icon appear?
- Search results?
- Business detail page?
- Website header?
- All of the above?

---

## Recommendations for Requirements Document

### Should Add:
1. **Section: Business Listing States** - Clarify free vs. paid listing display
2. **Section: Ranking Algorithm** - High-level description of how businesses are ranked
3. **Section: Discount Management** - Lifecycle, verification, expiration
4. **Section: Premium Listing Criteria** - What qualifies a business
5. **Section: Subdomain Management** - Naming rules, conflicts, lifecycle
6. **Clarification: Payment Model** - Remove wallet references or define user wallets
7. **Clarification: Config Panel** - Define what this is and who accesses it

### Should Remove or Clarify:
1. Remove "2x expected peak load" language (already done)
2. Remove or clarify `app_id` and `wallet_id` references in schema
3. Clarify distinction between topics and categories
4. Clarify distinction between ads and search promotion

### Defer to PRDs:
1. Notification retry logic → PRD-04
2. Session implementation details → PRD-01
3. JSON schema definitions → PRD-02
4. Caddy configuration → PRD-05
5. Image storage implementation → PRD-05
6. UI language switching → PRD-01

---

## Questions Requiring Ted's Input

**High Priority:**
1. Business profile vs. directory listing vs. website - please clarify the three states
2. User wallets vs. business wallets - which model should we use?
3. Topics vs. categories - same thing or different?
4. Premium listing criteria - what are they?
5. Search promotion vs. ads - how do they differ visually?
6. Config panel - is this the business management dashboard?

**Medium Priority:**
7. Reference images location (docs/sample-images)
8. Language switching example from your current website
9. Subdomain naming conflict resolution
10. Discount verification process
11. Image gallery as separate service or included with promotion?

**Low Priority:**
12. Business hours in profile?
13. Multiple phone numbers per user?
14. Zipcode field usage in Kenya?

---

## Next Steps

1. **Ted**: Please review and answer the high-priority questions above
2. **Claude**: Update requirements document based on Ted's answers
3. **Claude**: Begin drafting PRD-01 through PRD-05 with complete specifications
