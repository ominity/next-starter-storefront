# Auth

Sign-in, MFA and the user's own settings come from `@ominity/next`: the routes keep credentials and tokens on the
server, and the pages in `src/components/auth` and `src/components/account` use `useAuth`, `useUser` and
`useLoginActivity` from `@ominity/next/react`. The user is the SDK `User`; the starter defines no auth types.

## Pages

Paths come from `src/locales/routes/{lang}.json` and follow the locale strategy:

| Key | Default | Component |
|---|---|---|
| `login` | `auth/login` | `AuthLoginPage`: password sign-in and social providers (`social-login-options.tsx`) |
| `register` | `auth/register` | `AuthRegisterPage`, with a password strength bar |
| `mfa` | `auth/mfa` | `AuthMfaPage`: the second step of a sign-in |
| `forgotPassword` | `auth/forgot-password` | `AuthForgotPasswordPage` |
| `resetPassword` | `auth/reset-password` | `AuthResetPasswordPage` (reads `email` and `token` from the link) |
| `account` | `account` | `AuthAccountPage`: customer account dashboard and `AccountSecurity` |

Login, MFA and the cart pass a safe `returnTo` path along, so a shopper lands back where they started.

## Routes

`src/app/api/[...ominity]/route.ts` serves `/api/auth/*` through `createOminityRouteHandlers`: login, register,
logout, `me`, refresh, MFA, password reset, login activity and social login. Social sign-in returns to the localized
account page of the channel's default locale, to the MFA page when the user still needs a second factor, or to the
login page on failure:

```ts
auth: {
  socialLoginSuccessPath: () => defaultLocalePath("account"),
  socialLoginFailurePath: () => defaultLocalePath("login"),
  socialLoginMfaPath: () => defaultLocalePath("mfa"),
},
```

`OminityProvider` in `src/components/providers.tsx` holds the auth state for every page.

## Sign-in and MFA

`AuthLoginPage` calls `auth.signIn({ email, password })`. For a user with MFA the result is `mfa_required` and the
page continues to `auth/mfa`:

```tsx
const result = await auth.signIn({ email, password });
router.replace(result.status === "mfa_required" ? `${paths.mfa}?returnTo=…` : returnTo);
```

`AuthMfaPage` offers the methods in `auth.mfaMethods` plus a recovery code, sends email and SMS codes with
`auth.sendMfaCode(method)` and completes the sign-in with `auth.verifyMfa(method, code)` or
`auth.verifyRecoveryCode(code)`. Until then the session is pending: the server treats the browser as signed out for
the account, cart and SDK requests. "Cancel and sign out" calls `auth.signOut()`.

## Password reset

`AuthForgotPasswordPage` calls `auth.requestPasswordReset({ email, redirectUrl })` with the localized reset page as
`redirectUrl`; `AuthResetPasswordPage` completes it with `auth.resetPassword({ email, token, password })`.

## Social login

`SocialLoginOptions` loads the enabled providers with `auth.listSocialProviders()` and links each to
`auth.socialSignInUrl(provider.id)`. The callback exchanges its one-time code on the server, creates the session,
records login activity and redirects to the account page (or the MFA page). Provider identities must already be linked to an Ominity
user; accounts are never linked by email. On failure the login page shows the `socialError` code.

## Account security

`AccountSecurity` (`src/components/account/account-security.tsx`) is built on `useUser` and `useLoginActivity`:

- profile changes with `profile.update({ firstName, lastName, email })`;
- MFA per method: `enableMfa(method)` (for `authenticator` with the QR code and secret from `details`; only the methods the channel offers are listed), `confirmMfa(method,
  code)`, `disableMfa(method)`;
- new recovery codes with `regenerateRecoveryCodes()`;
- recent sign-ins from `useLoginActivity({ pageSize: 10 })`, page by page.

## Security boundary

The browser never receives the OAuth client secret, the Ominity API key or the user's access and refresh tokens.
`.env.example`'s session secret is a placeholder and must be replaced in production. With the dev tool on, auth
requests are not shown in its request log.

## Removing auth

Pass `auth: false` and `customerAccounts: false` to `createOminityRouteHandlers`, remove the auth and account entries
from `src/locales/routes/*.json` and their views (`_views/auth.tsx`, `_views/account.tsx`, and the entries in `src/app/[[...path]]/_views/index.ts`), and delete
`src/components/auth` and `src/components/account`.
