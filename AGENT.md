# Agent Guide

This repository is an Ominity-powered Next.js starter. Ominity is the headless CMS, commerce, forms, auth, customer-account, and application backend; this repo is the frontend implementation and project adapter.

Use this file as the first stop for future coding-agent work. The local source still wins when code and docs disagree.

## Project Model

- This is a modular starter, not a fixed product. Remove starter/demo systems when the real website does not need them, after checking references.
- Keep Ominity integration code thin and project-owned: this app wires `@ominity/next` into one page file, one API route, one provider, local components, and environment config.
- Data is the `@ominity/api-typescript` SDK as is. Server components call `ominity(locale)`; client components use the hooks from `@ominity/next/react`. Components take and render SDK models (`Product`, `Category`, `Cart`, `Order`, `User`, …). Do not add local wrapper/model types.
- Do not preserve commerce/auth/customer-account examples just because the starter ships them. For a content/corporate site it can be correct to remove them (see Starter Cleanup Rules).
- Do not delete systems you do not understand. First search the views, components, provider, route config, config parser, docs, and package imports.

## Important Paths

- `src/app/[[...path]]/page.tsx`: the only page file. Resolves every URL, renders its view, adds canonical/alternate metadata, handles draft mode, the optional home locale redirect, and `generateStaticParams` for CMS pages.
- `src/app/[[...path]]/_views`: what each kind of page renders, by domain (`cms.tsx`, `commerce.tsx`, `auth.tsx`, `account.tsx`), combined in `index.ts`. Types in `types.ts`. The `_` prefix makes it a private folder, so Next never treats it as a route.
- `src/app/api/[...ominity]/route.ts`: the only API route, `createOminityRouteHandlers` from `@ominity/next/routes`.
- `src/app/layout.tsx`: root layout; renders `Providers` and the `OminityDevTool` bar.
- `src/app/sitemap.ts`, `src/app/not-found.tsx`.
- `src/components/providers.tsx`: the single `OminityProvider`.
- `src/lib/ominity/config.ts`: runtime config parser. The source of truth for env names/defaults.
- `src/lib/ominity/sdk.ts`: `ominity(locale)`, the cached server SDK with the API key (`server-only`).
- `src/lib/ominity/auth.ts`: `authConfig` (shared by the API route and the auth pages), `getSocialProviders`, `redirectIfSignedIn` (`server-only`).
- `src/proxy.ts`: removes the social login result parameters from the URL (`handleOminitySocialLoginRedirect`).
- `src/lib/ominity/site.ts`: `createOminitySiteSupport`, CMS client, channel context and routing, `cmsLinkResolver`, `linkTo`, request language/country resolvers.
- `src/lib/ominity/routes.ts`: the starter's own pages and their localized paths (`routePath`, `routePaths`, `matchRoute`, `productPath`).
- `src/lib/ominity/pages.ts`: `resolvePage`, URL → page resolution.
- `src/lib/ominity/registry.tsx`: CMS component registry and missing-component behavior.
- `src/locales/routes/{en,nl}.json`: localized path templates for the starter's own pages.
- `src/locales/ui/{en,nl}.json`, `src/lib/i18n/ui-dictionary.ts`: UI copy.
- `src/components/cms`: project-owned CMS blocks.
- `src/components/auth`, `src/components/account`, `src/components/commerce`, `src/components/site`: starter UI modules.
- `src/components/ui`: shadcn-style primitives.
- `docs`: repo documentation. Some details can drift; verify against source.

## Commands

Use npm; `package.json` declares `npm@11.8.0`.

```bash
npm run dev        # next dev --webpack
npm run build      # next build --webpack
npm run start
npm run lint       # eslint .
npm run typecheck  # tsc --noEmit
```

There is no test script currently. CI (`.github/workflows/lint.yml`) runs `npm ci` and `npm run lint`. If adding tests, add the script and document it.

## Connecting To Ominity

There is no mock mode; every page loads from the Ominity API. A tenant connection requires at least:

```dotenv
OMINITY_API_URL=https://tenant.ominity.com/api
OMINITY_API_KEY=****
```

`OMINITY_API_URL` must point at the tenant API, normally `https://<tenant-domain>/api`. The API key should be scoped/linked to the correct Ominity channel. This repo does not parse `OMINITY_CHANNEL_ID`; the current channel is resolved by `@ominity/next` through `/channels/current` using the API key. Sign-in additionally needs `OMINITY_AUTH_CLIENT_ID`, `OMINITY_AUTH_CLIENT_SECRET` and `OMINITY_AUTH_SESSION_SECRET`.

Never put real API keys, OAuth secrets, session secrets, draft tokens, or credentials in this file or committed env files.

## Licensing And Module Availability

This repo only wires frontend pages and package routes; it does not create backend capabilities. If a tenant/license does not expose commerce, customer accounts, forms, or other module APIs, those pages and routes will fail or return unavailable data.

Commerce APIs require a commerce-enabled Ominity installation. Forms require the Forms module. Customer account teams/invitations require the corresponding Ominity channel/module configuration.

## Environment Reference

All config is parsed in `src/lib/ominity/config.ts` (see `.env.example`). Booleans accept `1/true/yes/on`; any other non-empty value is `false`, and empty/missing uses the default. Enum values fall back to the default when invalid.

| Variable | Behavior |
|---|---|
| `OMINITY_API_URL` | Ominity API base URL. Defaults `https://demo.ominity.com/api`. |
| `OMINITY_API_KEY` | Server-side API key; identifies the channel. Never expose to browser code. |
| `NEXT_PUBLIC_SITE_URL` | Public canonical origin. Defaults `http://localhost:3000`. Used for canonical/alternate URLs, sitemap, the origin check of cart/checkout/account requests, social login redirects and invitation URLs. |
| `OMINITY_AUTH_CLIENT_ID`, `OMINITY_AUTH_CLIENT_SECRET` | OAuth client for the password grant. The secret is server-only. |
| `OMINITY_AUTH_SCOPE` | Optional OAuth scope. |
| `OMINITY_AUTH_SESSION_SECRET` | Encrypts the session cookie; at least 32 characters. Generate with `openssl rand -base64 32`. |
| `OMINITY_CHECKOUT_ALLOW_GUEST` | Defaults `true`. `false` makes the commerce routes refuse orders without a signed-in user (`commerce.guestCheckout`) and the cart/product/checkout pages ask shoppers to sign in. |
| `OMINITY_LOCALE_SEGMENT_STRATEGY` | `none`, `language`, or `country-language`. Defaults `language`. |
| `OMINITY_CANONICAL_REDIRECT_POLICY` | `if-not-canonical` or `never`. Defaults `if-not-canonical`. |
| `OMINITY_STRING_LINK_STRATEGY` | `localize-relative` or `passthrough` for string links. Defaults `localize-relative`. |
| `OMINITY_HOME_LOCALE_REDIRECT_MODE` | `off`, `accept-language`, `cookie-accept-language`, or `geo-cookie-accept-language`. Defaults `off`. Only affects `/`. |
| `OMINITY_HOME_LOCALE_REDIRECT_COOKIE_NAME` | Locale cookie for home redirects and request locale resolution. Defaults `ominity_locale`. |
| `OMINITY_HOME_LOCALE_REDIRECT_SKIP_BOTS` | Skips home locale redirects for crawlers. Defaults `true`. |
| `OMINITY_TRAILING_SLASH` | Routing/canonical setting. Defaults `false`. |
| `OMINITY_BASE_PATH` | Optional base path. Defaults empty. |
| `OMINITY_DRAFT_TOKEN` | Secret for `/api/draft?secret=...`; draft mode is off without it. |
| `OMINITY_TRACKING_ENABLED` | Defaults `false`. Enables visitor tracking in `OminityProvider` and the `/api/events` proxy. |
| `OMINITY_FORMS_VALIDATE_FORM_ID` | Defaults `true`. Validates submitted form IDs through `@ominity/api-module-forms` before forwarding. |
| `OMINITY_STRICT_COMPONENTS` | Defaults `true`. Missing CMS registry components throw; when `false`, an unknown-block placeholder renders. |
| `OMINITY_DEBUG_LOGS` | Defaults `false`. Debug logging in site support, the routes and the tracking proxy. Avoid in production. |
| `OMINITY_DEV_TOOL` | Defaults `true` outside production, `false` in production. Dev tool provider, bar and request log. Disable in production. |

Cookie names and lifetimes (auth session, cart, active customer) use the `@ominity/next` defaults; pass them to `createOminityRouteHandlers` to change them. Not parsed: `OMINITY_CHANNEL_ID`, `OMINITY_DEFAULT_LOCALE`, cookie env vars, revalidation env vars. Do not document or rely on them unless `config.ts` is changed.

## Locale And Routing

Channel languages, countries, currencies, and defaults come from Ominity `/channels/current`.

`OMINITY_LOCALE_SEGMENT_STRATEGY` controls visible URL shape:

- `none`: `/contact`
- `language`: `/en/contact`
- `country-language`: `/be/en/contact`

`src/app/[[...path]]/page.tsx` serves every URL. `resolvePage` (`src/lib/ominity/pages.ts`):

1. reads the locale prefix of the configured strategy;
2. matches the rest against the templates in `src/locales/routes/{lang}.json`: fixed pages (`login` is `auth/login`, `cart`, `checkout`, `account`, `invitation` is `account/invitations/{token}`, …), `product` (`p/{sku}-{slug}`) and `category` (`c/{slug}`). Languages without a file fall back to the first one;
3. loads the product (by SKU) or category through the SDK, or otherwise the CMS page with `fetchCmsPageForParams`;
4. returns the canonical path and the page in every channel language (hreflang and the language switcher); with `if-not-canonical`, a non-canonical URL redirects.

The page renders the view for each kind from `src/app/[[...path]]/_views` (`viewFor(page)`): a `title` (or its own `metadata`, otherwise `noindex` unless `indexed`) and `render({ page, paths, path, preview, param })`. Only read query values through `param`, so pages that don't need them stay static. With an empty path it first applies `OMINITY_HOME_LOCALE_REDIRECT_MODE`. CMS pages are generated at build time (`generateStaticParams`); the page has `export const revalidate = 300`.

To add a page: add its path to every `src/locales/routes/{lang}.json` and its view to the domain file in `src/app/[[...path]]/_views`. `views` in `src/app/[[...path]]/_views/index.ts` is typed to cover every route, so a missing view fails the type check.

`next.config.ts` sets `reactStrictMode: true` and `transpilePackages: ["@ominity/api-module-forms"]`. There are no rewrites; routing lives entirely in `resolvePage`.

## CMS Rendering

CMS pages are rendered server-first:

1. The `[[...path]]` params enter `src/app/[[...path]]/page.tsx`.
2. `getRouting()` (`getChannelAwareCmsRouting`) builds routing from the Ominity channel context.
3. `resolvePage` calls `fetchCmsPageForParams()` with the CMS routes.
4. `renderCmsPage()` renders the page through `cmsRegistry` with `cmsRendererOptions`.
5. Client blocks hydrate only where a block needs browser behavior.

The render context includes `page`, `locale`, `path`, `preview` and `debug`.

## CMS Registry And Blueprints

Blueprint slugs in Ominity must match registry keys in `src/lib/ominity/registry.tsx`. Current registry entries:

| Ominity Blueprint/component key | Frontend component |
|---|---|
| `text-block` | `TextBlock` |
| `button` | `ButtonBlock` |
| `image` | `ImageBlock` |
| `1-column-section` … `6-column-section` | `createColumnSection(n)` |
| `form_block` | `FormBlock` |

If you remove a registry entry, decide whether the matching Ominity Blueprint should also be removed or retained. If you create a Blueprint intended to render as a page block, implement and register the matching frontend component. Do not let Blueprint slugs and registry keys silently drift.

`cmsRendererOptions` throws for missing components by default. Set `OMINITY_STRICT_COMPONENTS=false` only for relaxed development/integration work where an on-page unknown-block placeholder is acceptable.

## CMS Component Patterns

CMS block field names are part of the contract with Ominity:

- `component.fields.*` corresponds to Blueprint fields.
- Use helpers from `src/components/cms/helpers.ts` (`asString`, `asStringArray`, `asMedia`, `asCssLength`, `isOminityForm`) to normalize unknown field values.
- Use `renderer.render(...)` for nested/dynamic CMS component field values, as the column sections do for `column_1` … `column_n`.
- Use `context.locale` for locale-sensitive rendering and link resolution.
- Keep blocks focused. Prefer adding a new block over branching the CMS view.

When changing a field name, update both the Ominity Blueprint and every frontend `component.fields.<name>` usage.

## Links

Ominity Link fields may be strings or route objects. Do not manually reconstruct internal Ominity URLs in CMS blocks.

Use `cmsLinkResolver` from `src/lib/ominity/site.ts`:

```tsx
const resolved = cmsLinkResolver.resolve(component.fields.href, {
  locale: context.locale,
});
```

`ButtonBlock` is the preferred local example. It resolves the link, renders external links or a non-`_self` target with `<a>` (adding `rel="noopener noreferrer"` for `_blank`), and only casts `resolved.href` to `Route` for internal `next/link` usage.

`site.ts` adds route resolvers for SDK `product` and `category` route objects so they follow the localized templates. `linkTo(entity, locale)` builds the URL of anything with SDK `routes`.

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

- **Server components** call `ominity(locale)` from `src/lib/ominity/sdk.ts` (e.g. `ominity(locale).commerce.products.list({ include: "offers", limit: 24 })`) and the CMS helpers from `site.ts` (`getCmsClient`, `getCmsRoutes`, `getRouting`, `getChannel`).
- **Client components** use `@ominity/next/react`. Anything without a dedicated hook is the SDK itself through `useOminitySdk`, `useOminitySdkQuery`, `useOminitySdkPaginatedQuery`, `useOminityCustomerSdkQuery`, `useOminityCustomerSdkPaginatedQuery` or the mutation hooks. That SDK talks to the `/api/ominity` gateway, which adds the signed-in user's access token server-side and only allows the user's own account and customers. Do not call the Ominity API directly from the browser.

`src/app/api/[...ominity]/route.ts` mounts everything the browser needs with `createOminityRouteHandlers`:

| Path | Feature | Starter config |
|---|---|---|
| `/api/auth/*` | sign-in, register, MFA, password reset, session, login activity, social login | `auth.socialLoginSuccessPath` / `FailurePath` / `MfaPath`: localized `account` / `login` / `mfa` pages of the default locale |
| `/api/commerce/*` | cart, checkout, shipping/payment methods, order payments | `commerce: { guestCheckout: config.checkoutAllowGuest, paymentMethodsLimit: 100, resolveCountry }` |
| `/api/customer-accounts/*` | account context, switching, team, invitations | `resolveInvitationAcceptUrl` builds the localized `invitation` URL |
| `/api/ominity/*` | the browser SDK gateway | defaults |
| `/api/events` | tracking proxy | `tracking: { enabled: config.trackingEnabled, debug }` |
| `/api/forms/submit` | CMS form submissions | `forms: { formsValidateFormId }` |
| `/api/draft` | draft mode | `draftToken` |
| `/api/dev-tool/requests` | dev tool request log | `devTool: config.devTool` |

Set a feature to `false` there to switch it off; its paths then answer 404. Request language and country come from site support's `resolveRequestSdkLanguage` and `resolveRequestCountry` (headers, locale cookie, URL locale, `Accept-Language`, channel defaults).

## Providers And Hooks

`src/components/providers.tsx` renders one `OminityProvider` from `@ominity/next/react` with `devTool`, `tracking` (with `channel_id` metadata) and `customerAccounts={{ teamPageSize: 100 }}`. It composes the browser SDK, auth state, customer accounts, cart, wishlist, tracking and the dev tool provider.

| Hook | Used in |
|---|---|
| `useAuth` | `src/components/auth/*`, cart/checkout/product pages |
| `useUser`, `useLoginActivity` | `account/account-security.tsx` |
| `useCustomer`, `useAddresses`, `useOrders`, `useInvoices`, `useSubscriptions` | `account/*`, checkout address book |
| `useOminityCustomerAccounts` (team, invitations) | `account/customer-account-team.tsx`, `account/customer-invitation-page.tsx` |
| `useCart`, `useWishlist`, `useCheckout` | `commerce/*`, `site/cart-drawer.tsx`, `site/site-header-client.tsx` |

Every value they return is an SDK type; there are no local wrapper types. `CUSTOMER_PERMISSIONS` and `useCustomer().can(...)` shape the UI only.

## Auth

Pages (`src/components/auth`): login (password, a code by email, passkeys, social), register (password or a code by email), MFA, `verify` (the emailed 6-digit code), forgot/reset password, account (with passkeys and MFA settings). A password sign-in of a user with MFA returns `mfa_required` and continues to the `mfa` page; social sign-ins of MFA users are redirected there by the route. Until the second factor is verified, the session is pending and the server treats the browser as signed out. A password sign-up, or a sign-in of an account that hasn't confirmed its email, returns `verification_required` and continues to `verify`. `returnTo` is passed along and only followed through `safeReturnTo`. Signed-in visitors are sent away from the auth pages on the server (`redirectIfSignedIn`). Turning off an MFA method and new recovery codes need proof (`MfaProofDialog`). Passkeys need the site's origin among the channel's domains in Ominity. See `docs/auth.md`.

`OMINITY_AUTH_SESSION_SECRET` must be a strong random value. The browser never receives the OAuth client secret, API key, access token, or refresh token. Auth requests are deliberately not shown in the dev tool request log.

## Customer Accounts

UI examples live in `src/components/account`: switcher, customer profile and addresses, team and roles, invitations, orders, invoices with PDF download, subscriptions (change plan and cancel with quote-then-confirm), payments, mandates, customer groups, and the user's security settings. The active customer is stored in an HttpOnly cookie and validated on the server.

Multi-user customer membership must also be configured on the Ominity channel; the frontend alone is not enough.

## Commerce

Catalog pages (products, product, category) load through `ominity(locale)` in the page file. Cart, wishlist, checkout (details → address → shipping → review) and payment are client components in `src/components/commerce` on `useCart`, `useWishlist` and `useCheckout`. The cart id lives in an HttpOnly cookie, the order is built from the cart on the server, and only the browser that placed an order (or its signed-in customer) can open it. Wishlist is browser-local. Checkout country choices come from the channel's countries.

## Forms

Forms are optional. The CMS block key is `form_block`, registered to `FormBlock`.

- Server block: `src/components/cms/form-block.tsx`.
- Client renderer: `src/components/cms/form-block-client.tsx`.
- Submit route: `/api/forms/submit` from the single API route.

`FormBlock` expects `component.fields.form` to be an embedded Ominity form resource, plus optional `title` and `description` fields. `FormBlockClient` uses `FormRenderer` from `@ominity/next/forms`, `createShadcnFormComponents`, the local UI dictionaries, and `submitUrl="/api/forms/submit"`.

The Forms module must be enabled on Ominity. `OMINITY_FORMS_VALIDATE_FORM_ID=true` validates form IDs before forwarding. reCAPTCHA public settings are delivered in form field options; backend secrets belong in Ominity, not this frontend.

## Tracking

Tracking is optional and off by default. With `OMINITY_TRACKING_ENABLED=true`, `OminityProvider` sends events to `/api/events`, which forwards them with the API key.

The provider tracks page views, one session start per browser tab/session, scroll depth thresholds, outbound clicks, file downloads, native form submissions, and opt-in custom click events via `data-ominity-event`. It adds `auth_state` and the signed-in `userId`; the starter adds `channel_id`.

The cart and checkout hooks emit commerce events (cart item changes, promotion codes, wishlist changes, checkout completed); starter pages emit `product_viewed`, `cart_viewed` and `checkout_started`.

Do not expose tracking diagnostics or authenticated API payloads in production.

## Debug And Dev Tooling

With `OMINITY_DEV_TOOL` on, `src/app/layout.tsx` builds a snapshot with `createOminityDevToolSnapshot` (app, environment, routing, required env checks, channel info), passes it to `OminityProvider`, and renders `OminityDevTool` backed by `/api/dev-tool/requests`. Server SDK calls (`ominity(locale)`) and the commerce and customer-account routes are captured in the request log.

Disable it in production. It can expose API URLs, channel details, request metadata, and diagnostics that do not belong in public production UI.

`OMINITY_DEBUG_LOGS` is separate: it enables debug logging in site support, the routes and the tracking proxy. Keep it off in production unless you have a controlled diagnostic need.

## Coding Conventions

- TypeScript is strict: `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` are enabled.
- App Router conventions are used throughout. Pages and route handlers stay async/server-side unless interactivity requires `"use client"`.
- Use `@/*` imports for app code.
- Keep server-only Ominity/API logic out of client components (`sdk.ts` and `pages.ts` are `server-only`). Use the hooks and the API route for browser interactions.
- Use SDK types from `@ominity/api-typescript/models`; do not define parallel model types.
- Tailwind uses CSS variables and shadcn-style primitives in `src/components/ui`.
- `components.json` says shadcn style `new-york`, RSC enabled, TSX enabled, and points at `tailwind.config.ts`.
- Prefer existing `@ominity/next` helpers over hand-rolled routing, link resolution, auth, commerce, forms, and tracking logic.
- Use `cmsLinkResolver` / `linkTo` for Ominity route/link objects and `routePath` / `routePaths` for the starter's own pages.
- Preserve unrelated worktree changes.

## Starter Cleanup Rules

It is acceptable and often desirable to remove unused starter modules:

- commerce pages/components for content-only sites (`commerce: false`)
- auth pages/components when no frontend user accounts are needed (`auth: false`)
- customer-account sections, or customer accounts entirely (`customerAccounts: false`)
- example CMS blocks and registry entries
- forms if Ominity-managed forms are not used (`forms: false`)
- tracking if the site does not send Ominity visitor events

To remove a page or feature: delete its entries in `src/locales/routes/*.json`, its view in `src/app/[[...path]]/_views`, its components, and switch its routes off in `src/app/api/[...ominity]/route.ts`.

Before removing:

1. Search for references with `rg`.
2. Remove matching routes, components, config, imports, docs, and env vars coherently.
3. Keep SDK initialization and `OminityProvider` valid.
4. Update `AGENT.md` and `docs/*` if behavior changes.
5. Run `npm run lint`, `npm run typecheck`, and usually `npm run build`.

## Security Rules

- Never commit `.env` credentials.
- Never expose `OMINITY_API_KEY`.
- Never expose OAuth client secrets, refresh tokens, access tokens, session secrets, or draft tokens.
- Never move server secrets into `NEXT_PUBLIC_*`.
- Avoid logging secrets or dumping authenticated API responses.
- Disable `OMINITY_DEV_TOOL` and `OMINITY_DEBUG_LOGS` in production.
- Keep auth, commerce, customer-account, forms, and tracking API calls behind the same-origin API route and the SDK gateway.
- Treat Ominity as the authorization boundary; frontend permission checks only improve UX.

## Verification Checklist

Before finishing significant changes:

1. Check `git status --short` and preserve unrelated work.
2. Verify env names against `src/lib/ominity/config.ts`.
3. Verify CMS registry keys against `src/lib/ominity/registry.tsx`.
4. Verify route behavior in `src/lib/ominity/pages.ts`, `src/locales/routes/*.json` and `src/app/[[...path]]/_views`, for every locale strategy you support.
5. Verify auth, customer-account, commerce, forms, and tracking boundaries if touched.
6. Verify `NEXT_PUBLIC_SITE_URL` effects for canonical URLs, metadata, sitemap, the origin check, social redirects, and invitations.
7. Run `npm run lint`.
8. Run `npm run typecheck`.
9. Run `npm run build` for routing/metadata/config changes.

When using Ominity MCP, also verify the tenant-side Blueprint/Content Type/language/page configuration instead of inferring it from frontend code alone.
