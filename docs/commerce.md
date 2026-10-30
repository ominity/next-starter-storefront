# Commerce

## Pages

Paths come from `src/locales/routes/{lang}.json` and follow the locale strategy:

| Key | Default | Component |
|---|---|---|
| `products` | `products` | `CommerceProductsPage`: search, category, sort and pages through the products API |
| `product` | `p/{sku}-{slug}` | `CommerceProductPage` |
| `category` | `c/{slug}` | `CommerceCategoryPage` |
| `cart` | `cart` | `CommerceCartPage` |
| `wishlist` | `wishlist` | `CommerceWishlistPage` |
| `checkout` | `checkout` | `CommerceCheckoutPage` |
| `payment` | `payment` | `CommercePaymentPage` (may be nested, e.g. `checkout/payment`) |

Catalog pages load straight from the SDK in their views (`_views/commerce.tsx`), e.g.

```ts
const products = await ominity(locale).commerce.products.list({ filter: { category: id }, include: "offers", page, limit: 24 });
```

`include: "offers"` returns each product's offers (prices) in the same request. Product URLs are matched by SKU;
a product URL with an outdated slug redirects to the current one.

## Cart, checkout and payment

The browser side uses `useCart`, `useWishlist` and `useCheckout` from `@ominity/next/react`, provided by the single
`OminityProvider` in `src/components/providers.tsx`. They talk to `/api/commerce/*`, served by
`src/app/api/[...ominity]/route.ts`:

```ts
commerce: { guestCheckout: config.checkoutAllowGuest, paymentMethodsLimit: 100, resolveCountry: resolveRequestCountry },
```

The cart id lives in an HttpOnly cookie, the browser can only set the shopper's fields, and the order is built from
the cart with the API key on the server. Everything the components render is the SDK model (`Cart`, `CartItem` with
`item.product`, `ShippingMethod`, `PaymentMethod`, `Order`, `Payment`); amounts are formatted with `formatAmount`
from `src/lib/format.ts`, never recalculated.

- **Product page** (`product-actions.tsx`): `cart.add(product)` and `wishlist.toggle(product)`, plus the
  `product_viewed` event.
- **Cart page** (`cart-page.tsx`): quantities with `cart.setQuantity(item.id, quantity)`, `cart.remove(item.id)` and
  `cart.clear()`; the header's cart drawer (`src/components/site/cart-drawer.tsx`) shows the same items.
- **Wishlist page** (`wishlist-page.tsx`): `useWishlist()` items, kept in this browser's storage, with "Add to cart".
- **Cart summary** (`cart-summary.tsx`): subtotal, discount, shipping, tax and total from `cart.cart`, and promotion
  codes. `cart.applyPromotionCode(code)` rejects with `PROMOTION_CODE_NOT_APPLIED` when Ominity does not keep the
  code (it drops unknown codes silently); the summary shows that message under the field. Applied codes are listed
  from `cart.promotionCodes` and removed with `cart.removePromotionCode(code)`. The discount comes from
  `cart.cart.discountAmount` and each item's `discountAmount`; the API does not expose the promotion behind a code.
- **Checkout** (`checkout-page.tsx`) runs four steps, each saving its fields on the cart with `checkout.update(...)`
  so Ominity validates them and a returning shopper continues where they left off:
  1. **details**: email, company name and VAT number;
  2. **address**: billing address, picked from the signed-in customer's address book (`useAddresses`) or typed in,
     and an optional separate shipping address;
  3. **shipping**: `checkout.shippingMethods` and `checkout.selectShippingMethod(id)`; skipped when
     `checkout.shippingRequired` is `false`;
  4. **review**: order notes, then `checkout.placeOrder({ notes })` and on to the payment page with `?order={id}`.
- **Payment** (`payment-page.tsx`): loads the order with `checkout.getOrder(id)` and `checkout.listPayments(id)`,
  offers the enabled `checkout.paymentMethods` and their issuers (`checkout.issuers(methodId)`), and starts the
  payment with `checkout.pay(orderId, { paymentmethodId, issuerId, redirectUrl })`. The shopper is sent to
  `payment.links.checkout.href`; the provider returns them to the same page, which then shows the payment status.
  Only the browser that placed the order, or the signed-in customer, can open it.

`OMINITY_CHECKOUT_ALLOW_GUEST=false` makes the cart, product and checkout pages ask shoppers to sign in first, and
the route (`commerce.guestCheckout` in `src/app/api/[...ominity]/route.ts`) refuses guest orders.
