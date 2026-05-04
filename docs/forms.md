# Forms

This starter integrates `@ominity/next/forms` through the `form_block` CMS component,
and uses `@ominity/api-module-forms` server-side for optional form ID validation.

## Where it lives

- Block component: `src/components/cms/form-block.tsx`
- Submit API route: `src/app/api/forms/submit/route.ts`

## Behavior

- In mock mode, submissions are accepted via mock transport (`mode: "mock"` response)
- In live mode, submissions are forwarded to Ominity Forms API
- reCAPTCHA is automatically enabled when site key and secret are configured
- In live mode, form IDs can be validated before forwarding (`OMINITY_FORMS_VALIDATE_FORM_ID=true`)

## shadcn integration

The block maps shadcn primitives via:

```ts
createShadcnFormComponents({ Input, Textarea, Button })
```

## Live mode requirements

- `OMINITY_USE_MOCK_DATA=false`
- `OMINITY_API_KEY` configured
- optional reCAPTCHA keys configured

## Optional form ID validation

- Set `OMINITY_FORMS_VALIDATE_FORM_ID=true` (default)
- The API route validates `formId` via `@ominity/api-module-forms`
- Invalid form IDs return HTTP `400`

## Build note

`@ominity/api-module-forms@1.0.0` is source-dialect based. The starter config already
handles this by transpiling the package and enabling the source condition in
`next.config.ts` and `tsconfig.json`.
