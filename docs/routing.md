# Routing

One page file, `src/app/[[...path]]/page.tsx`, serves every URL. `resolvePage` in `src/lib/ominity/pages.ts` decides
what it is, and the matching view in `src/app/[[...path]]/_views` renders it.

## Locale prefixes

`OMINITY_LOCALE_SEGMENT_STRATEGY`:

- `none` → `/cart`
- `language` → `/nl/cart`
- `country-language` → `/be/nl/cart`

## The starter's own pages

`src/locales/routes/{lang}.json` holds the path of every page per language, for example `"cart": "winkelwagen"` or
`"product": "product/{sku}-{slug}"`. A placeholder that is a whole last segment (the category `{slug}`) takes the
remaining segments. Languages without a file fall back to the first one.

`routePaths(locale, routing)` gives all of them for a locale; pages and the header get them as `paths`.

## Everything else

Paths that match no entry are CMS pages, resolved with `fetchCmsPageForParams` from `@ominity/next/next`.

## Canonical URLs

With `OMINITY_CANONICAL_REDIRECT_POLICY=if-not-canonical`, a valid URL that isn't the canonical one (missing locale
prefix, outdated product slug) redirects. Each page also knows its URL in every channel language, used for hreflang
and the language switcher.

## Links to SDK models

`linkTo(product, locale)` (`src/lib/ominity/site.ts`) builds the localized URL of anything with SDK `routes`, such as
a `Product` or `Category`.
