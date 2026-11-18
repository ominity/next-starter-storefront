# Customer accounts and teams

The account page (`account`) renders a complete example portal in `src/components/account`, while `@ominity/next`
owns the state, permissions, active-account isolation and API behavior. Everything is shown as the SDK model
(`CustomerUser`, `Customer`, `Address`, `Order`, `Invoice`, `Subscription`, `SubscriptionChange`, `Payment`,
`Mandate`, …); the starter defines no customer, order or subscription types.

## Included examples

- switching between every customer account the user belongs to (`account-switcher.tsx`, also in the header)
- active customer details with permission-aware editing, and the address book (`customer-account-profile.tsx`)
- team members, role assignment and removal, email invitations and revocation (`customer-account-team.tsx`)
- invitation acceptance after the normal login or registration (`customer-invitation-page.tsx`)
- orders, invoices with PDF download, subscriptions with plan changes and cancellation, payments, mandates and
  customer groups (`customer-account-resources.tsx`)
- the user's profile, MFA, recovery codes and sign-in history (`account-security.tsx`, see [`auth.md`](auth.md))

## Provider and routes

`OminityProvider` in `src/components/providers.tsx` loads the memberships after sign-in and keeps the active one;
the starter passes `customerAccounts={{ teamPageSize: 100 }}`. `/api/customer-accounts/*` (context, switching,
team, invitations) and the SDK gateway `/api/ominity/*` are served by `src/app/api/[...ominity]/route.ts`, which also
builds the localized invitation link with `resolveInvitationAcceptUrl`.

The active customer is stored in an HttpOnly cookie and validated on the server. Switching reloads every
account-bound hook without showing the previous account's data, and Ominity authorizes every request again with the
user's access token.

## The account dashboard

`CustomerAccountDashboard` reads the active account with `useCustomer()` (`membership`, `customer`, `customerId`,
`memberships`, `switchTo`, `can`) and renders the profile, team and resource sections.

`CustomerAccountResources` uses the dedicated hooks where there are any and the SDK for the rest:

```tsx
const orders = useOrders({ pageSize: 10, mode: "append" });
const invoices = useInvoices({ pageSize: 10, mode: "append" });
const subscriptions = useSubscriptions({ pageSize: 10, mode: "append" });

// Everything without a dedicated hook is the SDK itself.
const payments = useOminityCustomerSdkQuery(
  (sdk, { customerId, signal }) => sdk.commerce.customerPayments.list({ customerId, page: 1, limit: 10, sort: "-createdAt" }, { signal }),
  { permission: CUSTOMER_PERMISSIONS.paymentsView },
);
```

Invoices download with `invoices.download(invoice)`. Each list has "Show more" (`loadMore`) while `hasNext`.

### Subscriptions

Each subscription row follows the API's quote-then-confirm flow, when the member has
`commerce.subscriptions.manage`:

- **Change plan**: `subscriptions.transitions(id)` lists the plans with their charge; picking one calls
  `quoteChange(id, offerId)`, and "Confirm" calls `confirmChange(id, quote.id)`.
- **Cancel**: `quoteCancellation(id)` shows the end date and any warnings (notice period, minimum term); "Confirm"
  calls `confirmCancellation(id, quote.id)`.
- A scheduled cancellation can be undone with `revokeCancellation(id)`. An immediate upgrade that still needs payment
  shows as `awaiting_payment`.

### Profile and addresses

`CustomerAccountProfile` loads the customer with `useOminityCustomerSdkQuery` and saves it with
`useOminitySdk().commerce.customers.update(...)`; the address book uses `useAddresses()` (`create`, `update`,
`remove`). The checkout offers the same addresses.

## Permissions

The UI uses `CUSTOMER_PERMISSIONS` with `useCustomer().can(...)`, the `permission` option of the SDK hooks, and
`CustomerPermissionBoundary` in the team section to hide or disable actions. These checks improve the interface;
Ominity remains the authorization boundary. Owners have every permission; roles decide for other members.

The channel controls which roles are assignable. An empty channel role selection means every assignable role.

## Invitations

Inviting a team member always creates an email invitation; Ominity chooses the existing-user or new-account email.
The link opens the localized `invitation` page (`account/invitations/{token}`).

`CustomerInvitationPage` inspects the token publicly (customer, role, expiry, whether registration is needed), then
uses `signInAndAcceptInvitation` or `registerAndAcceptInvitation` from `useOminityCustomerAccounts()`. These go
through the normal `/api/auth/login` and `/api/auth/register` routes; when the user has MFA, the page sends them to
the MFA step, which returns to the invitation page to accept. When the account still has to confirm its email
(`requires-verification`), the page sends them to the `verify` code page, which also returns here. Acceptance needs a
session whose email matches the invitation.

## Removing parts

Each section lives in its own file under `src/components/account`; delete the file and its use in
`customer-account-dashboard.tsx`. To remove customer accounts entirely, pass `customerAccounts: false` to
`createOminityRouteHandlers`, remove the account switcher from the header, and delete the `invitation` route entry and its view in `_views/account.tsx`.
