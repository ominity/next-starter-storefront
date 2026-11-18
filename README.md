# Ominity Next Starter

A Next.js App Router starter for [`@ominity/next`](https://www.npmjs.com/package/@ominity/next): CMS pages,
commerce, sign-in and customer accounts, built on the Ominity TypeScript SDK as is.

- **The SDK directly.** Server components call `ominity(locale)` and client components `useOminitySdk()`; both
  are the plain `@ominity/api-typescript` client and use its types (`Product`, `Category`, `Cart`, `Order`, …).
  Nothing is wrapped.
- **One provider.** `src/components/providers.tsx` renders `OminityProvider`; components use the hooks from
  `@ominity/next/react` (`useAuth`, `useUser`, `useCustomer`, `useCart`, `useCheckout`, `useOrders`, …).
- **One route file for the API.** `src/app/api/[...ominity]/route.ts` serves everything the browser needs
  (sign-in, cart and checkout, customer accounts, the SDK gateway, tracking, forms, draft mode, dev tool).
- **One page file.** `src/app/[[...path]]/page.tsx` resolves every URL to a CMS page, product, category or one of
  the starter's own pages, for every locale strategy, and renders it with that page's view from `src/app/[[...path]]/_views`
  (`cms`, `commerce`, `auth`, `account`).
- Tailwind CSS and shadcn-style UI components.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set at least `OMINITY_API_URL` and `OMINITY_API_KEY`, plus `OMINITY_AUTH_CLIENT_ID`, `OMINITY_AUTH_CLIENT_SECRET` and
`OMINITY_AUTH_SESSION_SECRET` for sign-in. Open [http://localhost:3000](http://localhost:3000).

## Layout

```
src/
  app/
    [[...path]]/page.tsx        every page: resolves the URL, renders its view
    [[...path]]/_views/         what each kind of page renders, by domain: cms, commerce, auth, account
    api/[...ominity]/route.ts   every API route, from @ominity/next/routes
    layout.tsx, not-found.tsx, sitemap.ts
  proxy.ts                      keeps social login results out of the address bar
  lib/
    ominity/config.ts           environment
    ominity/sdk.ts              ominity(locale): the server SDK (API key, server-only)
    ominity/auth.ts             auth settings, server-loaded social providers, signed-in redirect
    ominity/site.ts             channel, routing, link resolver
    ominity/routes.ts           the starter's own pages and their localized paths
    ominity/pages.ts            URL → page resolution
    ominity/registry.tsx        CMS component registry
  locales/routes/{lang}.json    localized paths: login (`auth/login`), cart, checkout, account, product (`p/{sku}-{slug}`), …
  locales/ui/{lang}.json        UI copy
  components/
    providers.tsx               one OminityProvider for auth, accounts, cart, wishlist, tracking, dev tool
    auth/, account/, commerce/  sign-in (password, email code, passkeys, social), account portal, cart → checkout → payment
    cms/, site/, ui/            CMS blocks, header, shadcn-style UI
```

## Using the SDK

In a server component:

```tsx
import { ominity } from "@/lib/ominity/sdk";

const products = await ominity(locale).commerce.products.list({ include: "offers", limit: 24 });
```

In a client component, through the gateway route with the signed-in user's session (no API key in the browser):

```tsx
import { useOrders, useOminityCustomerSdkPaginatedQuery } from "@ominity/next/react";

const orders = useOrders({ pageSize: 10 });

// Anything without a dedicated hook is the SDK itself:
const payments = useOminityCustomerSdkPaginatedQuery(
  (sdk, { customerId, page, limit, signal }) => sdk.commerce.customerPayments.list({ customerId, page, limit }, { signal }),
);
```

See [`docs/architecture.md`](docs/architecture.md).

## Adding a page

1. Add its path to `src/locales/routes/{lang}.json`, e.g. `"returns": "account/returns"`.
2. Add its view to the domain file in `src/app/[[...path]]/_views` (`title`, optional `metadata`, `render`). The type check fails
   until every route has a view.

Remove a feature by deleting its route entries, its views and its components.

## Documentation

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/configuration.md`](docs/configuration.md)
- [`docs/routing.md`](docs/routing.md)
- [`docs/commerce.md`](docs/commerce.md)
- [`docs/auth.md`](docs/auth.md)
- [`docs/customer-accounts.md`](docs/customer-accounts.md)
- [`docs/component-registry.md`](docs/component-registry.md)
- [`docs/forms.md`](docs/forms.md)

## Scripts

- `npm run dev` · `npm run build` · `npm run start` · `npm run lint` · `npm run typecheck`

## Production checklist

- [ ] `OMINITY_API_URL`, `OMINITY_API_KEY`, `NEXT_PUBLIC_SITE_URL`
- [ ] `OMINITY_AUTH_CLIENT_ID`, `OMINITY_AUTH_CLIENT_SECRET` and a real `OMINITY_AUTH_SESSION_SECRET`
- [ ] `OMINITY_LOCALE_SEGMENT_STRATEGY` and the paths in `src/locales/routes`
- [ ] `OMINITY_CHECKOUT_ALLOW_GUEST`, `OMINITY_TRACKING_ENABLED`, `OMINITY_DRAFT_TOKEN`
- [ ] `OMINITY_DEV_TOOL=false`
- [ ] Check canonical redirects and `/sitemap.xml`
