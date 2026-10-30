# Troubleshooting

## Build fails with missing Ominity env vars

Set `OMINITY_API_URL` and `OMINITY_API_KEY`; every page loads from the Ominity API.

## Login/register returns 401 or 500

- verify `OMINITY_AUTH_CLIENT_ID`, `OMINITY_AUTH_CLIENT_SECRET`, `OMINITY_AUTH_SESSION_SECRET`
- verify OAuth password grant is enabled for the configured client
- verify API key + channel allow the target language/country context

## Pages return 404 unexpectedly

- verify `OMINITY_LOCALE_SEGMENT_STRATEGY`
- verify route slugs in CMS data for configured locales
- check the paths in `src/locales/routes/*.json` for the starter's own pages

## Forms submit returns 500

- ensure `OMINITY_API_KEY` is set
- verify API base URL points to Ominity API
- verify reCAPTCHA secret when enabled

## Draft mode endpoint returns 401

Use `/api/draft?secret=<OMINITY_DRAFT_TOKEN>&slug=/some-path`.

## Cart, checkout or account requests return 403 `INVALID_ORIGIN`

`NEXT_PUBLIC_SITE_URL` must match the origin the site is opened on (including the port in development).
