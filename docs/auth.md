# Auth

Sign-in, MFA and the user's own settings come from `@ominity/next`: the routes keep credentials and tokens on the
server, and the pages in `src/components/auth` and `src/components/account` use `useAuth`, `useUser` and
`useLoginActivity` from `@ominity/next/react`. The user is the SDK `User`; the starter defines no auth types.

## Pages

Paths come from `src/locales/routes/{lang}.json` and follow the locale strategy:

| Key | Default | Component |
|---|---|---|
| `login` | `auth/login` | `AuthLoginPage`: password, a code by email, passkeys and social providers (`social-login-options.tsx`) |
| `register` | `auth/register` | `AuthRegisterPage`: a password (with a strength bar) or a code by email |
| `mfa` | `auth/mfa` | `AuthMfaPage`: the second step of a sign-in |
| `verify` | `auth/verify` | `AuthVerifyEmailCodePage`: the 6-digit code from a sign-in or signup email |
| `forgotPassword` | `auth/forgot-password` | `AuthForgotPasswordPage` |
| `resetPassword` | `auth/reset-password` | `AuthResetPasswordPage` (reads `email` and `token` from the link) |
| `account` | `account` | `AuthAccountPage`: customer account dashboard and `AccountSecurity` |

Login, MFA, the code page and the cart pass `returnTo` along, so a shopper lands back where they started. Every
redirect from it goes through `safeReturnTo` from `@ominity/next/react`, so it can't send anyone to another site.
The login, register, MFA and code pages send visitors who are already signed in to `returnTo` or the account page
(`redirectIfSignedIn` in `src/lib/ominity/auth.ts`, on `redirectIfOminitySignedIn`).

## Routes

`src/app/api/[...ominity]/route.ts` serves `/api/auth/*` through `createOminityRouteHandlers`: login, register,
email codes, passkey sign-in, logout, `me`, refresh, MFA, password reset, login activity and social login. Its auth
settings come from `authConfig` in `src/lib/ominity/auth.ts`, which the auth pages' server code shares. Social sign-in returns to the localized
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
page continues to `auth/mfa`; for an account that hasn't confirmed its email it is `verification_required` (Ominity
emailed a code) and the page continues to `auth/verify`:

```tsx
const result = await auth.signIn({ email, password });
router.replace(result.status === "mfa_required" ? `${paths.mfa}?returnTo=…` : returnTo);
```

`AuthMfaPage` offers the methods in `auth.mfaMethods` plus a recovery code, sends email and SMS codes with
`auth.sendMfaCode(method)` and completes the sign-in with `auth.verifyMfa(method, code)` or
`auth.verifyRecoveryCode(code)`. Until then the session is pending: the server treats the browser as signed out for
the account, cart and SDK requests. "Cancel and sign out" calls `auth.signOut()`.

## Codes by email

"Email me a code" on the login page and "No password: email me a code" on the register page call
`auth.sendEmailCode(email)`. Ominity answers the same for every email: a sign-in code for an existing account, a
signup code for a new one (entering it creates the account, with empty names to fill in on the account page). The
email and when a new code may be sent wait in sessionStorage (`src/components/auth/email-code.ts`), never in the URL.

A password sign-up (`auth.register`) also ends on the code page: the account can't sign in until its email is
confirmed.

`AuthVerifyEmailCodePage` signs in with `auth.verifyEmailCode({ email, code })`. The email's link points to
`emailCodePath` (`/auth/verify` in `authConfig`) with `#email=…&code=…`; the page reads that with `readEmailCodeLink()`
and fills the code in, but the user confirms it, because mail scanners open links. Without a locale prefix the path
resolves to the default locale and redirects to its canonical URL; browsers keep the fragment. If you localize the
`verify` path, keep the default locale's path in `emailCodePath`. The wait before a new code (a minute, growing to
fifteen) shows in words through `useResendCountdown`.

Needs in Ominity: the `user_signup_code` and `user_login_code` email templates and the `email_code` grant on the auth
client.

## Passkeys

The login page offers passkeys two ways: "Sign in with a passkey" (`auth.signInWithPasskey()`, any passkey the browser
has for the site) and the email field's autofill (`autocomplete="username webauthn"` and a conditional
`signInWithPasskey({ conditional: true, signal })` started on load and aborted before any other sign-in). A passkey
is two factors, so it never asks for MFA.

`AccountPasskeys` (`src/components/account/account-passkeys.tsx`, on `usePasskeys`) lists, adds, renames and removes
the user's passkeys. Adding needs a sign-in from the last ten minutes; otherwise it offers "Sign in again", which
signs out and comes back to the account page. Errors are named with `passkeyErrorCode`.

Needs in Ominity: the `passkey` grant on the auth client, and every origin the site runs on (`http://localhost:3000`
too) among the channel's domains (Settings → Channels → Domains); otherwise passkeys answer `PASSKEY_NOT_AVAILABLE`.

## Password reset

`AuthForgotPasswordPage` calls `auth.requestPasswordReset({ email, redirectUrl })` with the localized reset page as
`redirectUrl`; `AuthResetPasswordPage` completes it with `auth.resetPassword({ email, token, password })`.

## Social login

The login view loads the enabled providers on the server (`getSocialProviders` in `src/lib/ominity/auth.ts`, cached for
five minutes) and `SocialLoginOptions` links each to `auth.socialSignInUrl(provider.id)`. The callback exchanges its one-time code on the server, creates the session,
records login activity and redirects to the account page (or the MFA page). Provider identities must already be linked to an Ominity
user; accounts are never linked by email. On failure the login page shows the `socialError` code.

The callback adds `?socialLogin=…&socialError=…&socialProviderId=…` to the page it returns to. `src/proxy.ts` removes
them with `handleOminitySocialLoginRedirect` from `@ominity/next/auth/proxy`: a failure's code reaches the login
page once, through a short-lived cookie, without showing in the address bar.

## Account security

`AccountSecurity` (`src/components/account/account-security.tsx`) is built on `useUser` and `useLoginActivity`:

- profile changes with `profile.update({ firstName, lastName, email })`;
- MFA per method: `enableMfa(method)` (for `authenticator` with the QR code and secret from `details`; only the methods the channel offers are listed), `confirmMfa(method,
  code)`, and `disableMfa(method, proof)`;
- new recovery codes with `regenerateRecoveryCodes(proof)`, shown once;
- recent sign-ins from `useLoginActivity({ pageSize: 10 })`, page by page.

Ominity asks for proof before turning a method off or making new recovery codes: a current code of an enabled method,
or an unused recovery code. `MfaProofDialog` asks for it (sending an email or SMS code first where needed). Wrong codes
are limited (5 in 15 minutes, 20 a day); the message says how long to wait. These calls are never retried by the
package, so a retry can't count as another wrong code.

The account page also shows `AccountPasskeys` (see [Passkeys](#passkeys)).

## Security boundary

The browser never receives the OAuth client secret, the Ominity API key or the user's access and refresh tokens.
`.env.example`'s session secret is a placeholder and must be replaced in production. With the dev tool on, auth
requests are not shown in its request log.

## Removing auth

Pass `auth: false` and `customerAccounts: false` to `createOminityRouteHandlers`, remove the auth and account entries
from `src/locales/routes/*.json` and their views (`_views/auth.tsx`, `_views/account.tsx`, and the entries in `src/app/[[...path]]/_views/index.ts`), and delete
`src/components/auth` and `src/components/account`.
