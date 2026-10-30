"use client";

import type { Subscription, SubscriptionChange, SubscriptionTransition } from "@ominity/api-typescript/models";
import {
  CUSTOMER_PERMISSIONS,
  useCustomer,
  useInvoices,
  useOminityCustomerSdkQuery,
  useOrders,
  useSubscriptions,
} from "@ominity/next/react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount } from "@/lib/format";

function date(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function readable(code: string): string {
  return code.replace(/[._]/g, " ");
}

function Section(props: {
  readonly title: string;
  readonly description: string;
  readonly count: number;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly empty: string;
  readonly children: ReactNode;
  readonly more?: (() => void) | undefined;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div><CardTitle>{props.title}</CardTitle><CardDescription>{props.description}</CardDescription></div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{props.count}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {props.error && <p className="text-sm text-destructive">{props.error.message}</p>}
        {!props.loading && !props.error && props.count === 0 ? <p className="text-sm text-muted-foreground">{props.empty}</p> : props.children}
        {props.more && <Button size="sm" variant="outline" onClick={props.more}>Show more</Button>}
      </CardContent>
    </Card>
  );
}

function Row({ title, detail, aside }: { readonly title: string; readonly detail: string; readonly aside: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{detail}</p></div>
      <div className="flex items-center gap-3">{aside}</div>
    </div>
  );
}

type SubscriptionActions = ReturnType<typeof useSubscriptions>;

/** Plan changes and cancellation follow the API: quote first, then confirm the quote. */
function SubscriptionRow({ subscription, actions, manage }: {
  readonly subscription: Subscription;
  readonly actions: SubscriptionActions;
  readonly manage: boolean;
}) {
  const [transitions, setTransitions] = useState<ReadonlyArray<SubscriptionTransition> | null>(null);
  const [quote, setQuote] = useState<SubscriptionChange | null>(null);
  const [scheduled, setScheduled] = useState<SubscriptionChange | null>(null);
  const attempt = (action: () => Promise<unknown>) => { void action().catch(() => undefined); };
  const confirm = (change: SubscriptionChange) => attempt(async () => {
    setScheduled(await (change.type === "cancel"
      ? actions.confirmCancellation(subscription.id, change.id)
      : actions.confirmChange(subscription.id, change.id)));
    setQuote(null);
    setTransitions(null);
  });

  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{subscription.product?.title ?? subscription.reference ?? `Subscription #${subscription.id}`}</p>
          <p className="text-xs text-muted-foreground">{subscription.status} · {subscription.currentPeriod.daysLeft ?? "—"} days left in this period</p>
        </div>
        <span className="font-medium">{formatAmount(subscription.recurringAmount)}</span>
      </div>

      {manage && subscription.status !== "cancelled" && !quote && !scheduled && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={actions.pending} onClick={() => attempt(async () => setTransitions(await actions.transitions(subscription.id)))}>Change plan</Button>
          <Button size="sm" variant="outline" disabled={actions.pending} onClick={() => attempt(async () => setQuote(await actions.quoteCancellation(subscription.id)))}>Cancel</Button>
        </div>
      )}

      {transitions && !quote && (
        <div className="space-y-1">
          {transitions.length === 0 && <p className="text-xs text-muted-foreground">No other plans are available.</p>}
          {transitions.map((transition) => (
            <Button key={transition.offerId} size="sm" variant="ghost" className="w-full justify-between" disabled={actions.pending}
              onClick={() => attempt(async () => setQuote(await actions.quoteChange(subscription.id, transition.offerId)))}>
              <span>{transition.product.title} ({transition.direction ?? "change"})</span>
              <span>{formatAmount(transition.charge)} now</span>
            </Button>
          ))}
        </div>
      )}

      {quote && (
        <div className="space-y-2 rounded-md bg-muted p-3 text-xs">
          <p>
            {quote.type === "cancel" ? "Ends" : "Changes"} on {date(quote.effectiveAt)}
            {quote.type !== "cancel" && ` · charge ${formatAmount(quote.quote.charge)}, credit ${formatAmount(quote.quote.credit)}`}
          </p>
          {quote.warnings.length > 0 && <ul className="list-disc pl-4 text-muted-foreground">{quote.warnings.map((warning) => <li key={warning}>{readable(warning)}</li>)}</ul>}
          <div className="flex gap-2">
            <Button size="sm" disabled={actions.pending} onClick={() => confirm(quote)}>Confirm</Button>
            <Button size="sm" variant="outline" onClick={() => setQuote(null)}>Keep current plan</Button>
          </div>
        </div>
      )}

      {scheduled && (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span>{scheduled.type === "cancel" ? "Cancellation" : "Change"} scheduled for {date(scheduled.effectiveAt)}.</span>
          {scheduled.type === "cancel" && (
            <Button size="sm" variant="outline" disabled={actions.pending} onClick={() => attempt(async () => {
              await actions.revokeCancellation(subscription.id);
              setScheduled(null);
            })}>Keep subscription</Button>
          )}
          {scheduled.type !== "cancel" && scheduled.status === "awaiting_payment" && scheduled.links?.checkout && (
            <span>Pay the upgrade order to apply it.</span>
          )}
        </div>
      )}
      {actions.actionError && <p className="text-xs text-destructive">{actions.actionError.message}</p>}
    </div>
  );
}

export function CustomerAccountResources() {
  const customer = useCustomer();
  const orders = useOrders({ pageSize: 10, mode: "append" });
  const invoices = useInvoices({ pageSize: 10, mode: "append" });
  const subscriptions = useSubscriptions({ pageSize: 10, mode: "append" });
  // Everything without a dedicated hook is the SDK itself.
  const payments = useOminityCustomerSdkQuery(
    (sdk, { customerId, signal }) => sdk.commerce.customerPayments.list({ customerId, page: 1, limit: 10, sort: "-createdAt" }, { signal }),
    { permission: CUSTOMER_PERMISSIONS.paymentsView },
  );
  const mandates = useOminityCustomerSdkQuery(
    (sdk, { customerId, signal }) => sdk.commerce.customerMandates.list({ customerId, page: 1, limit: 10, sort: "-createdAt" }, { signal }),
    { permission: CUSTOMER_PERMISSIONS.mandatesView },
  );
  const groups = useOminityCustomerSdkQuery(
    (sdk, { customerId, signal }) => sdk.commerce.customerGroups.list({ customerId, page: 1, limit: 20, sort: "name" }, { signal }),
    { permission: CUSTOMER_PERMISSIONS.customerView },
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {customer.can(CUSTOMER_PERMISSIONS.ordersView) && (
        <Section title="Orders" description="Orders placed for this account." count={orders.count} loading={orders.loading} error={orders.error} empty="No orders yet." more={orders.hasNext ? orders.loadMore : undefined}>
          {orders.items.map((order) => (
            <Row key={order.id} title={order.number || `Order #${order.id}`} detail={`${date(order.createdAt)} · ${order.status}`} aside={<span className="font-medium">{formatAmount(order.totalAmount)}</span>} />
          ))}
        </Section>
      )}

      {customer.can(CUSTOMER_PERMISSIONS.invoicesView) && (
        <Section title="Invoices" description="Invoices and PDF downloads." count={invoices.count} loading={invoices.loading} error={invoices.error} empty="No invoices yet." more={invoices.hasNext ? invoices.loadMore : undefined}>
          {invoices.items.map((invoice) => (
            <Row key={invoice.id} title={invoice.number || `Invoice #${invoice.id}`} detail={`${date(invoice.invoicedAt ?? invoice.createdAt)} · ${invoice.status}`} aside={(
              <>
                <span className="font-medium">{formatAmount(invoice.totalAmount)}</span>
                <Button size="sm" variant="outline" disabled={invoices.pending} onClick={() => { void invoices.download(invoice).catch(() => undefined); }}>PDF</Button>
              </>
            )} />
          ))}
        </Section>
      )}

      {customer.can(CUSTOMER_PERMISSIONS.subscriptionsView) && (
        <Section title="Subscriptions" description="Plans, renewals, upgrades and cancellation." count={subscriptions.count} loading={subscriptions.loading} error={subscriptions.error} empty="No subscriptions yet." more={subscriptions.hasNext ? subscriptions.loadMore : undefined}>
          {subscriptions.items.map((subscription) => (
            <SubscriptionRow key={subscription.id} subscription={subscription} actions={subscriptions} manage={customer.can(CUSTOMER_PERMISSIONS.subscriptionsManage)} />
          ))}
        </Section>
      )}

      {customer.can(CUSTOMER_PERMISSIONS.paymentsView) && (
        <Section title="Payments" description="Payment attempts and completed transactions." count={payments.data?.count ?? 0} loading={payments.loading} error={payments.error} empty="No payments yet.">
          {payments.data?.items.map((payment) => (
            <Row key={payment.id} title={payment.description || `Payment #${payment.id}`} detail={`${date(payment.createdAt)} · ${payment.status}`} aside={<span className="font-medium">{formatAmount(payment.amount)}</span>} />
          ))}
        </Section>
      )}

      {customer.can(CUSTOMER_PERMISSIONS.mandatesView) && (
        <Section title="Mandates" description="Saved payment authorizations." count={mandates.data?.count ?? 0} loading={mandates.loading} error={mandates.error} empty="No mandates yet.">
          {mandates.data?.items.map((mandate) => (
            <Row key={mandate.id} title={mandate.details.holderName ?? mandate.details.cardType ?? `Mandate #${mandate.id}`} detail={mandate.details.cardNumber ?? mandate.details.accountNumber ?? "Payment authorization"} aside={<span className="text-xs">{mandate.status}</span>} />
          ))}
        </Section>
      )}

      {customer.can(CUSTOMER_PERMISSIONS.customerView) && (
        <Section title="Customer groups" description="Segments assigned by commerce rules." count={groups.data?.count ?? 0} loading={groups.loading} error={groups.error} empty="No customer groups assigned.">
          <div className="flex flex-wrap gap-2">
            {groups.data?.items.map((group) => <span key={group.id} className="rounded-full border px-3 py-1 text-xs font-medium">{group.name}</span>)}
          </div>
        </Section>
      )}
    </div>
  );
}
