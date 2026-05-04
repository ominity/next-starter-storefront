# Auth Feature Set

Auth is separated from commerce routes and lives under:

- routes: `src/app/(auth)`
- UI/state: `src/components/auth`
- APIs: `src/app/api/auth/*`

## Features

- OAuth password grant login + register
- signed auth session cookie handling
- MFA verification views for:
  - OTP app (`totp`)
  - email code
  - SMS code
  - recovery code
- password show/hide input
- password strength meter (4-level)

## MFA flow

1. user signs in at `/auth/login`
2. starter checks available MFA methods
3. if required, user is redirected to `/auth/mfa`
4. verification success redirects to `returnTo` or `/account`

## Checkout integration

- guest checkout and authenticated checkout are both supported
- toggle guest behavior with `OMINITY_CHECKOUT_ALLOW_GUEST`
- authenticated users can reuse saved addresses in checkout

## Remove auth feature set

1. set `OMINITY_FEATURE_AUTH=false` for config-only disable
2. optional hard removal: delete `src/app/(auth)` and `src/components/auth`
3. remove auth links from `src/components/site/site-header.tsx` if desired
