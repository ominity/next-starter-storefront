# Architecture

The starter keeps as little of its own code as possible: the Ominity TypeScript SDK is the data layer and
`@ominity/next` provides routing, auth, cart, accounts and rendering. Projects change components, not plumbing.

## Data: the SDK as is

- **Server components** call `ominity(locale)` from `src/lib/ominity/sdk.ts`, a cached `Ominity` client with the API
  key and the page's language. It is `server-only`.
- **Client components** use the hooks from `@ominity/next/react`: `useAuth`, `useUser`, `useCustomer`, `useCart`,
  `useCheckout`, `useWishlist`, `useOrders`, `useInvoices`, `useSubscriptions`, `useAddresses`, and the SDK itself
  through `useOminitySdk`, `useOminitySdkQuery`, `useOminityCustomerSdkQuery`, …. The account hooks and the SDK talk
  to `/api/ominity`, which adds the signed-in user's access token server-side and only allows the user's own account
  and customers; cart and checkout go through `/api/commerce`. The API key never reaches the browser.
- Components take and render SDK models (`Product`, `Category`, `Cart`, `Order`, `Paginated<Product>`) as they are.

## Routes

- `src/app/api/[...ominity]/route.ts` exports `createOminityRouteHandlers(config)` from `@ominity/next/routes`. It
  serves `/api/auth/*`, `/api/commerce/*`, `/api/customer-accounts/*`, `/api/ominity/*`, `/api/events`,
  `/api/forms/submit`, `/api/draft` and `/api/dev-tool/requests`.
- `src/app/[[...path]]/page.tsx` renders every page. `resolvePage` (`src/lib/ominity/pages.ts`):
  1. reads the locale prefix of the configured strategy;
  2. matches the rest against `src/locales/routes/{lang}.json`: fixed pages (cart, login, …), `product` and
     `category`;
  3. loads a product (by SKU) or category through the SDK, or otherwise the CMS page;
  4. returns the canonical path and the page in every channel language (hreflang and the language switcher);
     a non-canonical URL redirects.
- The page then renders the view for that kind of page from `src/app/[[...path]]/_views` (`cms.tsx`, `commerce.tsx`, `auth.tsx`,
  `account.tsx`). A view has a `title` (or its own `metadata`) and a `render({ page, paths, param, … })`; the page adds
  the canonical and language alternates, the header and the layout. Pages without their own metadata are `noindex`
  unless the view sets `indexed`.

CMS pages are generated at build time (`generateStaticParams`); other pages render on first request and revalidate
every 5 minutes.

## Rendering

- `src/lib/ominity/registry.tsx` maps CMS component keys to `src/components/cms`.
- `SiteHeader` is rendered by the page, so it knows the locale, the localized paths and the page's alternates.
- `src/components/providers.tsx` renders one `OminityProvider` from `@ominity/next/react`: the browser SDK, auth,
  customer accounts, cart, wishlist, tracking (`OMINITY_TRACKING_ENABLED`) and the dev tool provider
  (`OMINITY_DEV_TOOL`). `src/app/layout.tsx` renders it and the `OminityDevTool` bar.
