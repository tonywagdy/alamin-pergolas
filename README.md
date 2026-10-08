# Alamin Pergolas

Production: https://www.alaminpergolas.com/

```sh
npm ci
npm run dev
npm run test
npm run test:rules
npm run build
```

Node 22 is used in CI. Firestore emulator tests require Java 17+. Vercel deploys `dist`; `server.ts` is a local development/static server, with no customer or management disk APIs. Firebase is the authoritative store.

Measurement IDs and App Check configuration are documented in `.env.example`. Never commit credentials or put server secrets in `VITE_*` variables.

See [production readiness and account setup](docs/production-readiness.md) for remaining console configuration and the paused campaign outline.
