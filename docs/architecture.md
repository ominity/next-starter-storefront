# Architecture

## Goals

- keep the integration reusable across projects
- keep framework concerns separated from CMS concerns
- avoid project-specific assumptions inside shared integration code

## Folders

- `src/app`
  - App Router routes and route handlers
  - root page entry (`/page.tsx`) for `/` redirect/fallback
  - catch-all CMS page entry (`(pages)/[...segment]`)
  - modular commerce routes (localized templates from `src/locales/routes/commerce/*.json` for product/category and utility pages)
  - separate auth routes (`/auth/*`, `/account`)
  - auth + commerce API bridge routes (`/api/auth/*`, `/api/commerce/*`)
  - metadata/sitemap/draft endpoints

- `src/lib/ominity`
  - Ominity runtime configuration and environment parsing
  - routing and link resolver setup
  - CMS client selection (`mock` or `live`)
  - commerce data-source + route resolution module
  - commerce feature helpers (locale variants, metadata, feature flags, utility paths)
  - component registry and renderer options

- `src/components/cms`
  - project-owned CMS block implementations
  - server blocks and client blocks coexist

- `src/components/commerce`
  - starter product/category/cart/wishlist/checkout/payment presentation
  - client provider consuming starter API routes for cart/checkout
  - wishlist kept local until wishlist API support is available

- `src/components/auth`
  - auth session provider and hook
  - login/register/account/MFA client pages
  - password input + strength + MFA code UI primitives

- `src/lib/ominity/server`
  - Ominity SDK server helpers
  - signed auth session cookie handling
  - normalized API response mappers
  - mock commerce/auth server behavior for local mode

- `src/components/ui`
  - shadcn-style primitives for design consistency

## Rendering model

1. Next.js route receives params in `app/(pages)/[...segment]/page.tsx`
2. `fetchCmsPageForParams` resolves path + locale + canonical behavior
3. renderer maps CMS component keys to local React components via registry
4. nested components and child trees render recursively
5. client blocks (e.g. slider/form) hydrate inside a server-rendered page shell

## Data-source strategy

`src/lib/ominity/data-source.ts` is the single source of truth for where content comes from:

- mock mode (`OMINITY_USE_MOCK_DATA=true`) → local fixtures
- live mode (`false`) → `createCmsClient` backed by Ominity API

This keeps route and rendering code unchanged across environments.

For commerce/auth, mock mode routes still work through the same `/api/*` contract so client components do not branch by environment.
