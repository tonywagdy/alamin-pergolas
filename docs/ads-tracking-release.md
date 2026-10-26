# Google Ads tracking release — 26 October 2026

## Scope

Only analytics dispatch, its public configuration template, regression tests and
the existing Express transitive dependency lock are changed. No gallery, lead
storage, Firebase rules, layout, DNS or database migration is part of this release.

Three direct Google Ads conversions count one action per ad click:

| Action | Build-time production configuration |
| --- | --- |
| Ads destination | `VITE_GOOGLE_ADS_ID=AW-18466250450` |
| WhatsApp button click | `VITE_GOOGLE_ADS_WHATSAPP_LABEL=4QIcCOvF3qkdENK9suVE` |
| Telephone link click | `VITE_GOOGLE_ADS_PHONE_LABEL=gDkBCO7F3qkdENK9suVE` |
| Confirmed inspection form | `VITE_GOOGLE_ADS_LEAD_LABEL=erm7CPHF3qkdENK9suVE` |

These IDs are public browser configuration, not credentials. Do not use the Ads
customer ID as the tag ID. Keep the existing GA4 and App Check settings. Do not
also import the same events from GA4 as primary conversions. Do not configure
real Ads labels in preview builds. Clicks do not prove a message was sent or a
telephone call was connected. Only successful Firestore form writes produce the
form conversion, with the saved lead ID for deduplication. Tracking requires
measurement consent and excludes names, telephone numbers and message content.
Failures in tracking must not break rendering, navigation or lead success.

## Verification before production

- `npm test`: 15 passing tests, including routing to the three distinct labels,
  consent rejection/withdrawal, administrative pages and blocked tag failures.
- `npm run build`: successful TypeScript and Vite build.
- `npm audit --omit=dev`: zero vulnerabilities after updating `body-parser`
  2.3.0 to compatible 2.4.0 and `qs` to 6.16.1.
- Local static HTTP check: 200 requests at concurrency 10 returned HTTP 200.
  This is not a production capacity benchmark or a Firestore load test.
- Existing production image and JS requests returned `x-vercel-cache: HIT`.

## Release gates and rollback

1. Record the current ready production deployment and preserve its environment
   configuration before release. Confirm Vercel team/project and remaining usage.
2. Review the branch preview on desktop/mobile. Preview App Check intentionally
   cannot write to the production database; do not weaken enforcement for tests.
3. Add the four public Ads variables to production only, rebuild, stage and test
   the production build before assigning domains where supported.
4. Verify all three conversions with consent and no customer PII. Use a clearly
   labelled technical lead for the production form check and verify persistence.
5. Keep campaign 24402032875 paused until verification is complete. Its 1315.78 EGP
   total media budget fits within 1500 EGP including 14% Google VAT, excluding
   any bank fees. Reset its seven-day dates to the agreed actual launch window.
6. If a regression is detected, keep ads paused and roll back to the recorded
   ready deployment; revert this release commit and restore prior variables as
   needed. Do not delete customer records or change DNS.

## Capacity limits still requiring account evidence

The public site is a static Vite build served through Vercel's CDN. However,
each new visitor opens Firestore gallery/order/deletion subscriptions, and form
submission writes to Firestore. Static serving does not establish database
capacity. Verify Firebase billing plan, daily document reads/writes, transfer,
App Check and remaining quotas in the owner's console before launch. Monitor
both Vercel and Firebase while the initial campaign runs. A small advertising
budget does not guarantee a traffic ceiling or protection against unrelated bots.
