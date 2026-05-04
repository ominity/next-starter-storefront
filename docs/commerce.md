# Commerce Modules

This starter ships a modular commerce layer intended as a foundation for a Shopware-like project.

## Included modules

- products (`/p/{sku}-{slug}`)
- categories (`/c/{slug...}`)
- cart (`/cart`)
- wishlist (`/wishlist`)
- checkout (`/checkout`)
- payment (`/payment`)
- auth/account is provided by the separate auth module (`src/app/(auth)`)

All modules support the configured locale segment strategy:

- `none`
- `language`
- `country-language`

## Feature flags

Control module availability from `.env.local`:

- `OMINITY_FEATURE_COMMERCE`
- `OMINITY_FEATURE_COMMERCE_PRODUCTS`
- `OMINITY_FEATURE_COMMERCE_CATEGORIES`
- `OMINITY_FEATURE_CART`
- `OMINITY_FEATURE_WISHLIST`
- `OMINITY_FEATURE_CHECKOUT`
- `OMINITY_FEATURE_PAYMENT`
- `OMINITY_CHECKOUT_ALLOW_GUEST`

Disabled modules return `404` for their routes.

## Exclusion strategy per project

For easy long-term maintenance:

1. start with flags for rollout
2. remove route folders once finalized
3. remove matching components/lib modules if permanently unused

Folder boundaries are intentionally explicit:

- `src/app/(commerce)` → route-level ownership
- `src/components/commerce` → UI and interaction ownership
- `src/lib/ominity/commerce` → data, routing, metadata, and helpers

## Current scope

This starter commerce implementation provides:

- server API endpoints under `/api/commerce/*`
- API-backed cart and checkout flows
- local-only wishlist state (until wishlist API support is added)
- product/category example routes with locale strategy support
- step-based checkout with guest or authenticated mode

## Starter API contract

- `GET/PATCH /api/commerce/cart`
- `POST /api/commerce/cart/items`
- `PATCH/DELETE /api/commerce/cart/items/:itemId`
- `POST /api/commerce/checkout`
- `GET /api/commerce/orders/:orderId`
- `GET /api/commerce/orders/:orderId/payments`
- `GET /api/commerce/payment-methods`
- `GET /api/commerce/shipping-methods`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `GET /api/auth/mfa/methods`
- `POST /api/auth/mfa/send`
- `POST /api/auth/mfa/validate`
- `POST /api/auth/mfa/recovery/validate`
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`

## Checkout payload mapping

`/api/commerce/checkout` accepts generic `orderData` pass-through plus convenience fields (`email`, `notes`, `shippingAddress`, etc.).
If your backend requires strict order payload fields, adapt the mapper in `src/app/api/commerce/checkout/route.ts`.
