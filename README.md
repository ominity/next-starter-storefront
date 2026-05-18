# Ominity Next Starter

Production-ready Next.js App Router starter that integrates [`@ominity/next`](https://www.npmjs.com/package/@ominity/next) with:

- server-first CMS rendering
- locale-aware routing and metadata
- SSG/ISR-ready catch-all routing
- Tailwind CSS + shadcn-style UI foundation
- optional Ominity forms module integration

This starter is designed for long-term maintainability across multiple websites.

## Highlights

- **Reusable architecture** with clear boundaries (`lib/ominity`, `components/cms`, `app`)
- **Configurable routing** (`none`, `language`, `country-language`)
- **Canonical/alternate SEO support** via `@ominity/next`
- **Mixed Server + Client CMS components** (interactive slider and form in otherwise server-rendered pages)
- **Commerce route module** with localized route templates from locale dictionaries
- **Separate route modules** for `cms`, `commerce`, and `auth`
- **Commerce feature modules** for cart, wishlist, checkout, and payment
- **Separate auth feature set** for login/register/account/MFA and session state
- **Server API bridge** for cart/checkout/auth (`/api/commerce/*`, `/api/auth/*`)
- **Mock mode** for local development without API credentials

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

By default, `OMINITY_USE_MOCK_DATA=true`, so the app works out of the box.

## Switch to live Ominity API

1. Set `OMINITY_USE_MOCK_DATA=false`
2. Configure:
   - `OMINITY_API_URL`
   - `OMINITY_API_KEY`
   - `OMINITY_CHANNEL_ID` (optional, recommended for channel-aware localization)
   - `OMINITY_AUTH_CLIENT_ID`, `OMINITY_AUTH_CLIENT_SECRET`, `OMINITY_AUTH_SESSION_SECRET` (for auth flows)
3. Restart the dev server.

## Scripts

- `pnpm dev` – run local dev server
- `pnpm build` – production build
- `pnpm start` – run production server
- `pnpm lint` – lint code
- `pnpm typecheck` – run TypeScript checks

## Architecture

See [`docs/architecture.md`](docs/architecture.md).

Core flow:

1. `app/(pages)/[...segment]/page.tsx` resolves route params
2. `@ominity/next` routing resolves locale + canonical behavior
3. CMS page is fetched from configured data source (`mock` or `live`)
4. Generic renderer renders through project-owned registry
5. Metadata and sitemap are generated from CMS data

## Configuration

See [`docs/configuration.md`](docs/configuration.md) for all env vars and examples.

## Extending CMS components

See [`docs/component-registry.md`](docs/component-registry.md).

## Auth

See [`docs/auth.md`](docs/auth.md).

## Commerce routes

The starter includes separate route modules:

- `src/app/page.tsx` for `/` root behavior (optional locale-aware redirect + CMS homepage fallback)
- `src/app/(pages)/[...segment]` for CMS pages
- `src/app/(commerce)` for commerce pages
- `src/app/(auth)` for auth/account pages

Commerce module routes:

- product pages (template from `src/locales/routes/commerce/{lang}.json`, e.g. `product: "p/{sku}-{slug}"`)
- category pages (template from `src/locales/routes/commerce/{lang}.json`, e.g. `category: "c/{slug}"`)
- cart (from `src/locales/routes/commerce/{lang}.json`, key: `cart`)
- wishlist (from `src/locales/routes/commerce/{lang}.json`, key: `wishlist`)
- checkout (from `src/locales/routes/commerce/{lang}.json`, key: `checkout`)
- payment (from `src/locales/routes/commerce/{lang}.json`, key: `payment`; can be nested like `checkout/payment`)
- account links integrate with auth module when enabled

Starter APIs:

- `/api/auth/*` for login/register/session/refresh/MFA/password flows
- `/api/commerce/*` for cart items, checkout, shipping/payment methods, orders

### Local JSON translations

- Local UI copy can be stored in JSON dictionaries under `src/locales/ui/*.json`.
- The starter includes English and Dutch dictionaries and uses them in the site header.
- The header locale switcher component (`src/components/site/locale-switcher.tsx`) is channel-aware and supports:
  - language mode (`OMINITY_LOCALE_SEGMENT_STRATEGY=language`)
  - country-language mode (`OMINITY_LOCALE_SEGMENT_STRATEGY=country-language`)
- The switcher keeps a locale cookie (`ominity_locale`) to align API request language.
- Server SDK calls now resolve language from request locale context (header/cookie/referrer path) and pass it as the SDK `language` option.
- Optional home auto-redirect is available for `/`:
  - `OMINITY_HOME_LOCALE_REDIRECT_MODE=off | accept-language | cookie-accept-language | geo-cookie-accept-language`
  - `OMINITY_HOME_LOCALE_REDIRECT_SKIP_BOTS=true` (recommended for SEO-safe behavior)
- Cart creation auto-resolves `country` from:
  1. locale country segment (when using `country-language`)
  2. request country detection headers / `Accept-Language`
  3. channel default country fallback

### Excluding modules per project

You have three clean options:

1. **Config-only**: toggle `OMINITY_FEATURE_*` flags (fastest).
2. **Delete route folders**: remove `src/app/(commerce)` or `src/app/(auth)` for hard exclusion.
3. **Delete feature code**: remove `src/components/commerce` or `src/components/auth` after route removal.

Recommended production approach: keep feature folders and control rollout with flags first.
By default, all commerce modules are enabled in `.env.example`.

## Forms integration

See [`docs/forms.md`](docs/forms.md).

The starter uses `@ominity/next/forms` for rendering/submission and
`@ominity/api-module-forms` for optional server-side form validation.

## Best-practice notes

- Keep CMS blocks as **small focused components**
- Keep route strategy/env config centralized in `src/lib/ominity/env.ts`
- Prefer adding functionality via new blocks and registry entries over branching page logic
- Keep `@ominity/next` internals untouched; extend via config and project components
- Keep each module isolated by route folder + feature flag

## Production checklist

- [ ] Set `OMINITY_USE_MOCK_DATA=false`
- [ ] Configure API env vars and locale strategy
- [ ] Configure `OMINITY_AUTH_CLIENT_ID`, `OMINITY_AUTH_CLIENT_SECRET`, `OMINITY_AUTH_SESSION_SECRET`
- [ ] Decide `OMINITY_CHECKOUT_ALLOW_GUEST` policy
- [ ] Configure `NEXT_PUBLIC_SITE_URL`
- [ ] Configure `OMINITY_DRAFT_TOKEN`
- [ ] Configure reCAPTCHA keys (if forms use anti-bot)
- [ ] Verify canonical redirects and translated slugs
- [ ] Validate sitemap output at `/sitemap.xml`
