# Production readiness status — 2026-10-09

Production: https://www.alaminpergolas.com/

## Verified
- Quote requests are validated and saved to the named Firestore database before success is displayed.
- Google Analytics property 558008483, web stream 16064336095, measurement ID G-PBF336SQL1.
- Consent-aware page_view and generate_lead reached GA4 Realtime from production. generate_lead is configured as a key event.
- Google command queue uses Arguments objects; regression assertion passes.
- Search Console URL-prefix property exists; sitemap.xml was resubmitted successfully and Google discovered four URLs.
- Mobile navigation spacing, short-screen menu scrolling, quote form padding and 16px mobile input text were improved. Physical phone testing remains outstanding.
- Business owner confirmed free inspections throughout service areas. Warranty duration, coverage, exclusions and maintenance conditions are project-specific and written in the quotation before agreement.
- Production Firestore rules were published and tested with a production quote submission.
- Admin WhatsApp reply links normalize Egyptian phone numbers to international format, including Arabic/Persian digits.

## Outstanding or blocked
- Firestore App Check was registered with reCAPTCHA Enterprise and enabled as Enforced with the owner's explicit acceptance of the production warning. Production deployment dpl_RYEWj13rm8rx92dmgPxAjTVxHGbH contains the public site key. Twelve verified requests were visible in the last-hour metrics before enforcement. A new quote write and the admin dashboard succeeded immediately after enforcement, within Google's stated propagation period of up to 15 minutes; a post-propagation recheck remains outstanding. Authentication enforcement has not been enabled. Preview builds have no production attestation key and cannot access this Firestore project after enforcement.
- Firebase Storage requires a billing upgrade; no upgrade was made. Existing Firestore image records remain in place. Storage rules and dormant Functions changes have not been deployed.
- CSP remains report-only pending full network review.
- PageSpeed API returned HTTP 429; no numeric performance score is asserted. Search Console has insufficient Core Web Vitals data.
- Search indexing is asynchronous; sitemap acceptance or an indexing request does not prove a page is indexed.

## Advertising scope
The owner requested website preparation only. No campaign was launched, no payment details were added, and no advertising spend was authorized. Google Ads onboarding, account linking, conversion import and billing remain deferred until the owner requests advertising setup.

Production test leads are labelled as technical tests that do not need a call. Do not treat them as real enquiries or delete them irreversibly without confirmation.
