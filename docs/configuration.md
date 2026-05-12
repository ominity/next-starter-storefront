# Configuration

All runtime config is centralized in `src/lib/ominity/env.ts`.

## Core env vars

| Variable | Purpose | Default |
|---|---|---|
| `OMINITY_USE_MOCK_DATA` | Use local mock client and forms submit mock | `true` |
| `OMINITY_API_URL` | Ominity API base URL | `https://demo.ominity.com/api` |
| `OMINITY_API_KEY` | Ominity API key (required in live mode) | _(empty)_ |
| `OMINITY_CHANNEL_ID` | Optional explicit channel id. When omitted, starter resolves the current channel from API key context. | _(empty)_ |
| `OMINITY_COMMERCE_LIST_LIMIT` | Max products/categories scanned by starter commerce data source | `250` |
| `NEXT_PUBLIC_SITE_URL` | Canonical site base URL | `http://localhost:3000` |

## Auth

| Variable | Purpose | Default |
|---|---|---|
| `OMINITY_AUTH_CLIENT_ID` | OAuth client id for password grant | _(empty)_ |
| `OMINITY_AUTH_CLIENT_SECRET` | OAuth client secret for password grant | _(empty)_ |
| `OMINITY_AUTH_SCOPE` | Optional OAuth scope | _(empty)_ |
| `OMINITY_AUTH_SESSION_SECRET` | Cookie-signing secret for auth sessions (min 32 chars) | _(empty)_ |
| `OMINITY_AUTH_COOKIE_NAME` | Auth session cookie name | `ominity_auth_session` |
| `OMINITY_AUTH_COOKIE_MAX_AGE_SECONDS` | Auth cookie max age | `2592000` |
| `OMINITY_CART_COOKIE_NAME` | Cart cookie name | `ominity_cart_id` |
| `OMINITY_CART_COOKIE_MAX_AGE_SECONDS` | Cart cookie max age | `2592000` |

## Routing

| Variable | Values | Default |
|---|---|---|
| `OMINITY_LOCALE_SEGMENT_STRATEGY` | `none`, `language`, `country-language` | `language` |
| `OMINITY_CANONICAL_REDIRECT_POLICY` | `if-not-canonical`, `never` | `if-not-canonical` |
| `OMINITY_STRING_LINK_STRATEGY` | `localize-relative`, `passthrough` | `localize-relative` |
| `OMINITY_DEFAULT_LOCALE` | fallback locale code when channel lookup is unavailable | `en` |
| `OMINITY_TRAILING_SLASH` | `true`/`false` | `false` |
| `OMINITY_BASE_PATH` | Optional base path | _(empty)_ |

## Site behavior

| Variable | Purpose | Default |
|---|---|---|
| `OMINITY_REVALIDATE_SECONDS` | ISR interval for page route | `300` |
| `OMINITY_DEBUG_LOGS` | SDK/client debug logging | `false` |
| `OMINITY_STRICT_COMPONENTS` | Throw on unregistered CMS keys | `true` |

## Draft mode

| Variable | Purpose |
|---|---|
| `OMINITY_DRAFT_TOKEN` | Token used by `/api/draft?secret=...` |

## Forms (optional)

| Variable | Purpose |
|---|---|
| `OMINITY_FORMS_VALIDATE_FORM_ID` | Validate submitted `formId` with `@ominity/api-module-forms` |

reCAPTCHA settings are configured in Ominity CMS and exposed through form field options.  
Secrets stay backend-only (Formspree-style) and should not be configured in the starter app.

## Commerce feature flags

| Variable | Purpose | Default |
|---|---|---|
| `OMINITY_FEATURE_COMMERCE` | Master switch for all commerce routes | `true` |
| `OMINITY_FEATURE_COMMERCE_PRODUCTS` | Enable product routes (`/p/...`) | `true` |
| `OMINITY_FEATURE_COMMERCE_CATEGORIES` | Enable category routes (`/c/...`) | `true` |
| `OMINITY_FEATURE_CART` | Enable cart module routes and UI actions | `true` |
| `OMINITY_FEATURE_WISHLIST` | Enable wishlist module routes and UI actions | `true` |
| `OMINITY_FEATURE_CHECKOUT` | Enable checkout module routes and UI actions | `true` |
| `OMINITY_FEATURE_PAYMENT` | Enable payment module routes and UI actions | `true` |
| `OMINITY_CHECKOUT_ALLOW_GUEST` | Allow guest checkout mode when auth is enabled | `true` |
| `OMINITY_FEATURE_AUTH` | Enable auth/account routes and auth UI module | `true` |

When a feature is disabled, its route module responds with `404`.
See `docs/commerce.md` for route matrix and exclusion strategy.
