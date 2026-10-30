# Configuration

Everything is read once in `src/lib/ominity/config.ts`. See `.env.example`.

## Ominity

| Variable | Purpose | Default |
|---|---|---|
| `OMINITY_API_URL` | Ominity API base URL | `https://demo.ominity.com/api` |
| `OMINITY_API_KEY` | API key; identifies the channel. Server-side only | _(empty)_ |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL; also the origin cross-site requests are checked against | `http://localhost:3000` |

The authenticated `/channels/current` response is the source of truth for the channel's languages, countries,
currencies and defaults.

## Sign-in

| Variable | Purpose | Default |
|---|---|---|
| `OMINITY_AUTH_CLIENT_ID` | OAuth client id (password grant) | _(empty)_ |
| `OMINITY_AUTH_CLIENT_SECRET` | OAuth client secret | _(empty)_ |
| `OMINITY_AUTH_SCOPE` | Optional OAuth scope | _(empty)_ |
| `OMINITY_AUTH_SESSION_SECRET` | Encrypts the session cookie (min. 32 characters) | _(empty)_ |
| `OMINITY_CHECKOUT_ALLOW_GUEST` | Allow checkout without signing in; enforced by the commerce routes (`guestCheckout`) and reflected in the cart and checkout pages | `true` |

Cookie names and lifetimes use the `@ominity/next` defaults; pass them to `createOminityRouteHandlers` in
`src/app/api/[...ominity]/route.ts` to change them.

## Routing

| Variable | Values | Default |
|---|---|---|
| `OMINITY_LOCALE_SEGMENT_STRATEGY` | `none`, `language`, `country-language` | `language` |
| `OMINITY_CANONICAL_REDIRECT_POLICY` | `if-not-canonical`, `never` | `if-not-canonical` |
| `OMINITY_STRING_LINK_STRATEGY` | `localize-relative`, `passthrough` | `localize-relative` |
| `OMINITY_HOME_LOCALE_REDIRECT_MODE` | `off`, `accept-language`, `cookie-accept-language`, `geo-cookie-accept-language` | `off` |
| `OMINITY_HOME_LOCALE_REDIRECT_COOKIE_NAME` | Cookie with the chosen locale | `ominity_locale` |
| `OMINITY_HOME_LOCALE_REDIRECT_SKIP_BOTS` | Don't redirect crawlers | `true` |
| `OMINITY_TRAILING_SLASH` | `true`/`false` | `false` |
| `OMINITY_BASE_PATH` | Optional base path | _(empty)_ |

## Site

| Variable | Purpose | Default |
|---|---|---|
| `OMINITY_TRACKING_ENABLED` | Send visitor events through `/api/events` | `false` |
| `OMINITY_DEBUG_LOGS` | SDK debug logging | `false` |
| `OMINITY_DEV_TOOL` | Show the Ominity Dev Tool | `true` outside production |
| `OMINITY_STRICT_COMPONENTS` | Throw on CMS components without a renderer | `true` |
| `OMINITY_DRAFT_TOKEN` | Secret for `/api/draft?secret=…` | _(empty)_ |
| `OMINITY_FORMS_VALIDATE_FORM_ID` | Validate form IDs with `@ominity/api-module-forms` | `true` |

reCAPTCHA is configured in Ominity and delivered through the form field options; its secret stays in Ominity.
