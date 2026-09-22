# Agent Guide

This repository is an Ominity-powered Next.js starter. Ominity is the headless CMS, commerce, forms, auth, customer-account, and application backend; this repo is the frontend implementation and project adapter.

Use this file as the first stop for future coding-agent work. The local source still wins when code and docs disagree.

## Project Model

- This is a modular starter, not a fixed product. Remove starter/demo systems when the real website does not need them, after checking references.
- Keep Ominity integration code thin and project-owned: this app wires `@ominity/next` into Next routes, local components, and environment config.
- Do not preserve commerce/auth/customer-account examples just because the starter ships them. For a normal content/corporate site it can be correct to remove `src/app/(commerce)`, `src/app/(auth)`, and associated components/config.
- Do not delete systems you do not understand. First search the route tree, components, providers, config parser, docs, and package imports.
- Features are generally independently enabled, disabled, or removed: CMS rendering, forms, tracking, auth, customer accounts, commerce products, categories, cart, wishlist, checkout, and payment.

## Important Paths

- `src/app`: App Router pages and API route handlers.
- `src/app/(pages)/[...segment]/page.tsx`: catch-all CMS page rendering and metadata.
- `src/app/page.tsx`: `/` behavior, optional locale redirect, then CMS homepage fallback.
- `src/app/(commerce)`: commerce pages for product/category/utility routes.
- `src/app/(auth)`: auth/account pages and localized variants.
- `src/app/api/*`: server-side adapters for auth, commerce, customer accounts, forms, tracking, draft mode, and dev tooling.
- `src/lib/ominity/env.ts`: runtime config parser. Treat it as the source of truth for env names/defaults.
- `src/lib/ominity/site.ts`: `createOminitySiteSupport`, CMS client selection, routing, link resolver, channel context, and request locale/country helpers.
- `src/lib/ominity/registry.tsx`: CMS component registry and missing-component behavior.
- `src/components/cms`: project-owned CMS blocks.
- `src/lib/ominity/commerce`: commerce data source, routing, locale, metadata, feature helpers.
- `src/components/auth`, `src/components/account`, `src/components/commerce`: starter UI modules.
- `src/locales/routes`: local route slug dictionaries for auth and commerce utility routes.
- `src/locales/ui`: local UI dictionaries.
- `docs`: repo documentation. Some details can drift; verify against source.

## Commands

Use npm; `package.json` declares `npm@11.8.0`.

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

There is no test script currently. If adding tests, add the script and document it.

## Connecting To Ominity

Mock data is enabled by default. A real tenant connection requires at least:

```dotenv
OMINITY_USE_MOCK_DATA=false
OMINITY_API_URL=https://tenant.ominity.com/api
OMINITY_API_KEY=****
```

`OMINITY_API_URL` must point at the tenant API, normally `https://<tenant-domain>/api`. The API key should be scoped/linked to the correct Ominity channel. This repo does not parse `OMINITY_CHANNEL_ID`; the current channel is resolved by `@ominity/next` through `/channels/current` using the API key.

Never put real API keys, OAuth secrets, session secrets, draft tokens, or credentials in this file or committed env files.

## Licensing And Feature Availability

Frontend flags only enable frontend routes/UI and package adapters. They do not create backend capabilities. If a tenant/license does not expose commerce, customer accounts, forms, or other module APIs, enabling the flag in this repo will still fail or return unavailable data.

Commerce APIs require a commerce-enabled Ominity installation. Forms require the Forms module. Customer account teams/invitations require the corresponding Ominity channel/module configuration. Tenant licenses can be upgraded when a project later needs more capabilities.

## Environment Reference

All config is parsed in `src/lib/ominity/env.ts`. Booleans accept `1/true/yes/on` and `0/false/no/off`; invalid values fall back.

| Variable | Behavior |
|---|---|
| `OMINITY_USE_MOCK_DATA` | Defaults `true`. Uses local mock CMS/commerce/form/auth behavior where package support exists. Set `false` for live API. |
| `OMINITY_API_URL` | Live Ominity API base URL. Required when live CMS/API calls are needed. |
| `OMINITY_API_KEY` | Server-side Ominity API key. Required in live mode and for tracking/forms/commerce proxies. Never expose to browser code. |
| `NEXT_PUBLIC_SITE_URL` | Public canonical origin. Used for `metadataBase`, CMS metadata/canonical URLs, sitemap URLs, auth/social redirect destinations, and invitation URLs. Safe to be public because it is an origin, not a secret. |
| `OMINITY_AUTH_CLIENT_ID` | OAuth/auth client id. Required when `OMINITY_FEATURE_AUTH=true` and real auth flows are used. |
| `OMINITY_AUTH_CLIENT_SECRET` | OAuth/auth client secret. Server-only. Required for live auth. |
| `OMINITY_AUTH_SCOPE` | Optional OAuth scope. |
| `OMINITY_AUTH_SESSION_SECRET` | Strong secret for encrypted/signed local auth sessions. Use `openssl rand -base64 32`; do not document production values. |
| `OMINITY_AUTH_COOKIE_NAME`, `OMINITY_AUTH_COOKIE_MAX_AGE_SECONDS` | Auth session cookie settings. |
| `OMINITY_ACTIVE_CUSTOMER_COOKIE_NAME`, `OMINITY_ACTIVE_CUSTOMER_COOKIE_MAX_AGE_SECONDS` | HttpOnly active customer preference for customer-account routes. |
| `OMINITY_CART_COOKIE_NAME`, `OMINITY_CART_COOKIE_MAX_AGE_SECONDS` | Cart cookie settings for commerce route handlers. |
| `OMINITY_FEATURE_COMMERCE` | Master commerce switch. Defaults `true`; all commerce subflags are also gated by it. |
| `OMINITY_FEATURE_COMMERCE_PRODUCTS` | Enables product route/page behavior. Defaults `true`. |
| `OMINITY_FEATURE_COMMERCE_CATEGORIES` | Enables category route/page behavior. Defaults `true`. |
| `OMINITY_FEATURE_CART` | Enables cart routes/actions. Defaults `true`. |
| `OMINITY_FEATURE_WISHLIST` | Enables wishlist UI/routes. Defaults `true`; wishlist state is local-only in the starter. |
| `OMINITY_FEATURE_CHECKOUT` | Enables checkout route/actions. Defaults `true`. |
| `OMINITY_FEATURE_PAYMENT` | Enables payment route/page behavior. Defaults `true`. |
| `OMINITY_CHECKOUT_ALLOW_GUEST` | Allows checkout without an auth session. Defaults `true`. |
| `OMINITY_FEATURE_AUTH` | Enables auth/account route resolution. Defaults `true`. |
| `OMINITY_FEATURE_CUSTOMER_ACCOUNTS` | Enables customer-account provider and account/team resources, but only when auth is also enabled. Defaults `true`. |
| `OMINITY_COMMERCE_LIST_LIMIT` | Max product/category records scanned by the starter live commerce catalog. Defaults `250`. |
| `OMINITY_LOCALE_SEGMENT_STRATEGY` | `none`, `language`, or `country-language`. Defaults to `language` when missing/invalid. |
| `OMINITY_CANONICAL_REDIRECT_POLICY` | `if-not-canonical` or `never`. Defaults `if-not-canonical`. |
| `OMINITY_STRING_LINK_STRATEGY` | `localize-relative` or `passthrough` for string links. Defaults `localize-relative`. |
| `OMINITY_HOME_LOCALE_REDIRECT_MODE` | `off`, `accept-language`, `cookie-accept-language`, or `geo-cookie-accept-language`. Defaults `off`. Only affects `/` in `src/app/page.tsx`. |
| `OMINITY_HOME_LOCALE_REDIRECT_COOKIE_NAME` | Locale cookie name for cookie-based home redirects and request locale resolution. Defaults `ominity_locale`. |
| `OMINITY_HOME_LOCALE_REDIRECT_SKIP_BOTS` | Skips home locale redirects for crawlers. Defaults `true`. |
| `OMINITY_TRAILING_SLASH` | Routing/canonical setting. Defaults `false`. |
| `OMINITY_BASE_PATH` | Optional base path. Defaults empty. |
| `OMINITY_REVALIDATE_SECONDS` | Parsed and shown in dev-tool details, but the CMS page currently has `export const revalidate = 300`; changing this env var alone does not change that route's ISR interval. |
| `OMINITY_DRAFT_TOKEN` | Token for `/api/draft?secret=...`. |
| `OMINITY_FORMS_VALIDATE_FORM_ID` | Defaults `true`. Validates submitted form IDs through `@ominity/api-module-forms` before forwarding. |
| `OMINITY_TRACKING_ENABLED` | Defaults `false`. Enables browser tracking only when live API URL/key are also present and mock mode is off. |
| `OMINITY_DEBUG_LOGS` | Defaults `false`. Enables debug logging/debug snapshots for Ominity SDK/proxy route helpers. Avoid in production. |
| `OMINITY_DEV_TOOL` | Dev-tool/debug-bar switch. Defaults to `true` outside production and `false` in production. Disable in production. |
| `OMINITY_STRICT_COMPONENTS` | Defaults `true`. Missing CMS registry components throw; when `false`, an amber unknown-block warning renders. |

Not present in the current parser: `OMINITY_DEFAULT_LOCALE` and `OMINITY_CHANNEL_ID`. Do not document or rely on them unless `src/lib/ominity/env.ts` is changed.

## Locale And Routing

Channel languages, countries, currencies, and defaults normally come from Ominity `/channels/current`. In mock mode they come from the mock client in `src/lib/ominity/mock-data.ts`.

`OMINITY_LOCALE_SEGMENT_STRATEGY` controls visible URL shape:

- `none`: `/contact`
- `language`: `/en/contact`
- `country-language`: `/be/en/contact`

`src/app/(pages)/[...segment]/page.tsx` resolves CMS pages by route params, Ominity routes when available, fallback `getPageByPath`, and canonical redirect policy. It builds metadata with canonical and alternate links using `NEXT_PUBLIC_SITE_URL`, channel languages/countries, and Ominity page metadata.

`src/app/page.tsx` optionally redirects `/` according to `OMINITY_HOME_LOCALE_REDIRECT_MODE`; otherwise it renders the CMS homepage through the same catch-all component.

Auth and commerce utility paths are localized from JSON dictionaries under `src/locales/routes/auth` and `src/locales/routes/commerce`. The current `en.json` and `nl.json` files use the same slug strings, but the mechanism supports language-specific slugs.

## CMS Rendering

CMS pages are rendered server-first:

1. Next route params enter `src/app/(pages)/[...segment]/page.tsx`.
2. `getChannelAwareCmsRouting()` builds routing from the Ominity channel context.
3. `fetchCmsPageForParams()` tries Ominity route data; fallback uses `client.getPageByPath`.
4. `renderCmsPage()` renders the page through `cmsRegistry`.
5. Client blocks hydrate only where a block needs browser behavior.

The render context currently includes:

- `page`
- `locale`
- `path`
- `preview`
- `debug`

## CMS Registry And Blueprints

Blueprint slugs in Ominity must match registry keys in `src/lib/ominity/registry.tsx`. Current registry entries:

| Ominity Blueprint/component key | Frontend component |
|---|---|
| `hero` | `HeroBlock` |
| `button_link` | `ButtonLinkBlock` |
| `rich_text` | `RichTextBlock` |
| `text-block` | `TextBlock` |
| `slider` | `SliderBlock` |
| `form_block` | `FormBlock` |
| `2-column-section` | `TwoColumnSection` |

If you remove a registry entry, decide whether the matching Ominity Blueprint should also be removed or retained. If you create a Blueprint intended to render as a page block, implement and register the matching frontend component. Do not let Blueprint slugs and registry keys silently drift.

`cmsRendererOptions` throws for missing components by default. Set `OMINITY_STRICT_COMPONENTS=false` only for relaxed development/integration work where an on-page unknown-block warning is acceptable.

## CMS Component Patterns

CMS block field names are part of the contract with Ominity:

- `component.fields.*` corresponds to Blueprint fields.
- Use helpers such as `asString()` from `src/components/cms/helpers.ts` to normalize unknown field values.
- Use `renderer.render(...)` for nested/dynamic CMS component field values, as `TwoColumnSection` does for `column_1` and `column_2`.
- Use `context.locale` for locale-sensitive rendering and link resolution.
- Keep blocks focused. Prefer adding a new block over branching the catch-all page.

When changing a field name, update both the Ominity Blueprint and every frontend `component.fields.<name>` usage.

## Links

Ominity Link fields may be strings or route objects. Do not manually reconstruct internal Ominity URLs in CMS blocks.

Use `cmsLinkResolver` from `src/lib/ominity/site.ts`:

```tsx
const resolved = cmsLinkResolver.resolve(component.fields.target, {
  locale: context.locale,
});
```

`ButtonLinkBlock` is the preferred local example. It resolves the target, renders external links with `<a target="_blank" rel="noopener noreferrer">`, and only casts `resolved.href` to `Route` for internal `next/link` usage.

This starter adds route resolvers for commerce `product` and `category` objects in `src/lib/ominity/site.ts`.

## Blueprints, Content Types, Pages

Ominity Blueprints define reusable renderable page components/blocks: slug/key, field definitions, nested/dynamic fields, and other CMS configuration. Pages contain component instances created from these Blueprints.

Content Types are reusable structured collections, not page blocks. Use them for project data such as case studies, testimonials, services, team members, FAQ entries, projects, locations, or other domain models. Entries can be queried by the frontend or referenced from page components through relation fields.

Prefer Content Types for reusable domain data instead of stuffing all reusable information into page component fields.

Pages are composed from Blueprint component instances and follow Ominity's publishing system. If scheduled publishing is available on the connected tenant, inspect it through Ominity/MCP or the relevant API before documenting or depending on it.

When creating content through Ominity MCP, use the tenant's configured default language unless the tool/API explicitly supports another workflow. Do not guess languages; retrieve them from Ominity.

## Ominity MCP Workflow

Ominity tenants can expose an MCP endpoint, generally:

```text
https://<tenant-domain>/mcp
```

Example:

```text
https://tenant.ominity.com/mcp
```

When an Ominity MCP connection is available, prefer it for inspecting and changing Ominity-side CMS configuration instead of inventing schemas from frontend code alone. The frontend registry and Ominity CMS configuration are one system.

For a new CMS section/component:

1. Inspect existing Blueprints and Content Types.
2. Inspect configured languages/locales.
3. Reuse an existing Blueprint when appropriate.
4. Create/update the Blueprint in Ominity if needed.
5. Implement the React component in `src/components/cms`.
6. Register it in `src/lib/ominity/registry.tsx`.
7. Keep Blueprint field names and `component.fields.*` usages identical.
8. Use `renderer.render(...)` for nested component fields.
9. Use `cmsLinkResolver` for Link fields.
10. Create/update page content in Ominity when appropriate.
11. Verify all configured locales.
12. Run `npm run lint`, `npm run typecheck`, and `npm run build` as appropriate.

For structured reusable data, inspect or create a Content Type first, then query/reference entries from page content or frontend code.

## Data Fetching And Server Boundaries

Keep Ominity API keys and OAuth secrets server-side. Never put `OMINITY_API_KEY`, `OMINITY_AUTH_CLIENT_SECRET`, `OMINITY_AUTH_SESSION_SECRET`, or draft tokens in `NEXT_PUBLIC_*` variables or client components.

CMS access is centralized by `createOminitySiteSupport` in `src/lib/ominity/site.ts`:

- `getCmsClient()` returns the mock client when `OMINITY_USE_MOCK_DATA=true`; otherwise it returns the live client.
- `getLiveCmsClient()` requires `OMINITY_API_URL` and `OMINITY_API_KEY`.
- `getCmsRoutes()`, `getCmsMenus()`, and `getCmsPageByPath()` safely return empty/null on failure.
- Channel context/routing is cached inside the support object until `resetStarterOminitySiteCaches()` is called.

Commerce catalog reads live in `src/lib/ominity/commerce/data-source.ts` and are marked `server-only`.

API route handlers in `src/app/api/**` are the browser-safe boundary for auth, commerce, customer accounts, forms, tracking, and draft mode. Client components should call those routes or package providers, not the Ominity API directly.

Request language is resolved from explicit Ominity headers, locale cookie, referrer/request path, then `Accept-Language`. Request country is resolved from explicit country headers, country cookie, `country-language` URL locale, platform geo headers, `Accept-Language`, and channel defaults.

## Auth

Auth is feature-gated by `OMINITY_FEATURE_AUTH`. Customer accounts depend on auth.

Frontend pages live under `src/app/(auth)` and `src/components/auth`. They include login, register, forgot/reset password, MFA, account, and invitation paths in non-localized, language, and country-language route variants.

Server routes are thin package factories from `@ominity/next/auth/server`, configured in `src/lib/ominity/server/route-config.ts`. Included API routes cover:

- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/auth/refresh`
- `/api/auth/social/*`
- `/api/auth/login-activity/*`
- `/api/auth/mfa/*`
- `/api/auth/password/forgot`
- `/api/auth/password/reset`

`OMINITY_AUTH_CLIENT_ID`, `OMINITY_AUTH_CLIENT_SECRET`, and `OMINITY_AUTH_SESSION_SECRET` are required for real auth. `OMINITY_AUTH_SESSION_SECRET` must be a strong random value, e.g. generated with:

```bash
openssl rand -base64 32
```

The browser must never receive the OAuth client secret, API key, access token, or refresh token.

## Customer Accounts

Customer accounts are gated by `OMINITY_FEATURE_CUSTOMER_ACCOUNTS` and auth. `src/components/providers.tsx` wraps the app in `OminityCustomerAccountsProvider` only when enabled.

The catch-all server adapter is `src/app/api/customer-accounts/[[...path]]/route.ts`. The active customer is stored in an HttpOnly cookie. UI examples live in `src/components/account` and cover switching, profile, addresses, team, roles, invitations, orders, invoices, payments, subscriptions, mandates, and login activity.

If the project needs multi-user/customer account membership, it must also be enabled/configured on the Ominity channel. A frontend flag alone is not enough.

## Commerce

Commerce is modular and feature-gated:

- Product pages: `OMINITY_FEATURE_COMMERCE_PRODUCTS`.
- Category pages: `OMINITY_FEATURE_COMMERCE_CATEGORIES`.
- Cart: `OMINITY_FEATURE_CART`.
- Wishlist: `OMINITY_FEATURE_WISHLIST`.
- Checkout: `OMINITY_FEATURE_CHECKOUT`.
- Payment: `OMINITY_FEATURE_PAYMENT`.

All subflags are disabled when `OMINITY_FEATURE_COMMERCE=false`.

Route pages live under `src/app/(commerce)`. Commerce helper code lives under `src/lib/ominity/commerce`. UI lives under `src/components/commerce`. The browser uses `OminityCommerceProvider` from `@ominity/next/commerce/react` via `src/components/commerce/commerce-provider.tsx`.

`src/app/api/commerce/[[...path]]/route.ts` exports package-owned GET/POST/PATCH/DELETE handlers. The starter uses channel active countries for checkout address country choices. Wishlist is local-only in this starter until backend wishlist support is added.

Localized commerce URL templates come from `src/locales/routes/commerce/*.json`. `next.config.ts` reads those files to create localized rewrites to the canonical internal route files.

## Forms

Forms are optional. The CMS block key is `form_block`, registered to `FormBlock`.

- Server block: `src/components/cms/form-block.tsx`.
- Client renderer: `src/components/cms/form-block-client.tsx`.
- Submit route: `src/app/api/forms/submit/route.ts`.

`FormBlock` expects `component.fields.form` to be an embedded Ominity form resource, plus optional `title` and `description` fields. `FormBlockClient` uses `FormRenderer` from `@ominity/next/forms`, shadcn-style adapters, local UI dictionaries, and `submitUrl="/api/forms/submit"`.

Submissions go through `createOminityFormSubmitRouteHandler`. In live mode the Forms module must be enabled on Ominity. `OMINITY_FORMS_VALIDATE_FORM_ID=true` validates form IDs before forwarding. reCAPTCHA public settings are delivered in form field options; backend secrets belong in Ominity, not this frontend.

## Tracking

Tracking is optional and disabled by default. It is enabled only when:

- `OMINITY_TRACKING_ENABLED=true`
- `OMINITY_USE_MOCK_DATA=false`
- `OMINITY_API_URL` and `OMINITY_API_KEY` are configured

The app wraps children in `TrackingProvider` in `src/components/providers.tsx` and sends events to `/api/events`, implemented by `src/app/api/events/route.ts` with `createOminityTrackingProxyRouteHandlers`.

The provider automatically tracks page views, one session start per browser tab/session, scroll depth thresholds, outbound clicks, file downloads, native form submissions, and opt-in custom click events via `data-ominity-event`. The starter adds metadata for `channel_id` and `auth_state`, plus `userId` when authenticated.

Commerce components/package code emit commerce events such as product viewed, cart viewed, checkout started/completed, cart item changes, promotion code changes, wishlist changes, order viewed, and order payments viewed.

Do not expose tracking diagnostics or authenticated API payloads in production.

## Debug And Dev Tooling

`OminityDevTool` is mounted in `src/app/layout.tsx` and backed by `/api/dev-tool/requests` and `/api/debug/sdk-requests`. It shows integration state, package/SDK versions, config health, feature flags, current channel info, unsafe environment warnings, request logs, and tracking/package diagnostics that registered providers expose.

`OMINITY_DEV_TOOL` controls the dev tool. Disable it in production. It can expose API URLs, channel details, request metadata, and diagnostics that do not belong in public production UI.

`OMINITY_DEBUG_LOGS` is separate: it enables debug logging/snapshots in SDK/proxy route config. Keep it off in production unless you have a controlled diagnostic need.

## Mock Data

Mock mode lets the starter run without credentials. Mock CMS data and channel context are in `src/lib/ominity/mock-data.ts`; mock commerce data is in `src/lib/ominity/commerce/mock-data.ts`.

Mock paths are useful for starter development, demos, and isolated frontend work. For a production project permanently connected to a tenant, it can be appropriate to remove mock-only data and docs after ensuring the live client path remains intact.

## Coding Conventions

- TypeScript is strict: `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` are enabled.
- App Router conventions are used throughout. Pages and route handlers should stay async/server-side unless interactivity requires `"use client"`.
- Use `@/*` imports for app code.
- Keep server-only Ominity/API logic out of client components. Use route handlers and providers for browser interactions.
- Tailwind uses CSS variables and shadcn-style primitives in `src/components/ui`.
- `components.json` says shadcn style `new-york`, RSC enabled, TSX enabled, and points at `tailwind.config.ts`.
- `next.config.ts` adds localized commerce rewrites and transpiles `@ominity/api-module-forms`.
- Prefer existing `@ominity/next` helpers over hand-rolled routing, link resolution, auth, commerce, forms, and tracking logic.
- Use `cmsLinkResolver` for Ominity route/link objects.
- Use route feature helpers instead of duplicating feature-flag checks in page components.
- Preserve unrelated worktree changes.

## Starter Cleanup Rules

It is acceptable and often desirable to remove unused starter modules:

- commerce routes/components for content-only sites
- auth routes/components when no frontend user accounts are needed
- customer-account sections or the whole customer-account provider/route
- example CMS blocks and registry entries
- mock data once the project permanently uses a real tenant
- forms if Ominity-managed forms are not used
- tracking if the site does not send Ominity visitor events

Before removing:

1. Search for references with `rg`.
2. Remove matching routes, components, config, imports, docs, and env vars coherently.
3. Keep SDK initialization and providers valid.
4. Update `AGENT.md` and `docs/*` if behavior changes.
5. Run `npm run lint`, `npm run typecheck`, and usually `npm run build`.

## Security Rules

- Never commit `.env` credentials.
- Never expose `OMINITY_API_KEY`.
- Never expose OAuth client secrets, refresh tokens, access tokens, session secrets, or draft tokens.
- Never move server secrets into `NEXT_PUBLIC_*`.
- Avoid logging secrets or dumping authenticated API responses.
- Disable `OMINITY_DEV_TOOL` and `OMINITY_DEBUG_LOGS` in production.
- Keep auth, commerce, customer-account, forms, and tracking API calls behind same-origin route handlers.
- Treat Ominity as the authorization boundary; frontend permission checks only improve UX.

## Verification Checklist

Before finishing significant changes:

1. Check `git status --short` and preserve unrelated work.
2. Verify env names against `src/lib/ominity/env.ts`.
3. Verify CMS registry keys against `src/lib/ominity/registry.tsx`.
4. Verify route behavior in `src/app/**`, especially localized variants.
5. Verify auth, customer-account, commerce, forms, and tracking boundaries if touched.
6. Verify `NEXT_PUBLIC_SITE_URL` effects for canonical URLs, metadata, sitemap, social redirects, and invitations.
7. Run `npm run lint`.
8. Run `npm run typecheck`.
9. Run `npm run build` for routing/metadata/config changes.

When using Ominity MCP, also verify the tenant-side Blueprint/Content Type/language/page configuration instead of inferring it from frontend code alone.
