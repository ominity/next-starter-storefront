# Routing Strategies

The starter uses `createRoutingConfig` and `createCmsLinkResolver` from `@ominity/next`.

## Supported URL shapes

- `none` → `/contact`
- `language` → `/nl/contacteer-ons`
- `country-language` → `/be/nl/contacteer-ons`

## Canonical redirects

When `OMINITY_CANONICAL_REDIRECT_POLICY=if-not-canonical`, valid non-canonical URLs can redirect to canonical localized slug.

## Route-object links

`LocaleLink` + `createCmsLinkResolver` supports route objects:

```ts
{
  resource: "route",
  name: "page",
  locale: "nl",
  parameters: {
    slug: "contacteer-ons"
  }
}
```

Default route resolvers are included for `page`, `product`, `category`.

## Utility routes

Starter utility routes are localized with the same locale prefix strategy:

- commerce: `/cart`, `/wishlist`, `/checkout`, `/payment`
- auth: `/auth/*`, `/account`

All are feature-gated by `OMINITY_FEATURE_*`.
