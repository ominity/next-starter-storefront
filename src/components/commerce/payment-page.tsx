"use client";

import type { Order, Payment } from "@ominity/api-typescript/models";
import type { PaymentMethodIssuer } from "@ominity/api-typescript/models/settings/payment-method-issuer";
import { useCheckout } from "@ominity/next/react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAmount } from "@/lib/format";

export interface CommercePaymentPageProps {
  readonly paths: { readonly cart: string; readonly account: string; readonly checkout: string; readonly payment: string };
  readonly orderId?: string;
}

/** Pays an order placed in this browser (or by the signed-in customer) and shows its payments. */
export function CommercePaymentPage({ paths, orderId }: CommercePaymentPageProps) {
  const checkout = useCheckout();
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<ReadonlyArray<Payment>>([]);
  const [methodId, setMethodId] = useState<number | null>(null);
  const [issuers, setIssuers] = useState<ReadonlyArray<PaymentMethodIssuer>>([]);
  const [issuerId, setIssuerId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { getOrder, listPayments } = checkout;

  useEffect(() => {
    if (!orderId) return;
    void Promise.all([getOrder(orderId), listPayments(orderId)])
      .then(([loaded, list]) => {
        setOrder(loaded);
        setPayments(list);
      })
      .catch(() => setMessage("This order could not be found."));
    // Load once per order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (!orderId || message === "This order could not be found.") {
    return (
      <Card>
        <CardHeader><CardTitle className="text-2xl">Payment</CardTitle><CardDescription>No order to pay.</CardDescription></CardHeader>
        <CardContent><Link href={paths.cart as Route} className="text-sm font-medium text-primary hover:underline">Back to cart</Link></CardContent>
      </Card>
    );
  }

  if (!order) {
    return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Loading order…</CardContent></Card>;
  }

  const paid = payments.some((payment) => payment.status === "paid");

  const chooseMethod = async (id: number) => {
    setMethodId(id);
    setIssuerId(null);
    setIssuers(await checkout.issuers(id).catch(() => []));
  };

  const pay = async () => {
    if (methodId === null) return;
    setMessage(null);
    try {
      const payment = await checkout.pay(order.id, {
        paymentmethodId: methodId,
        ...(issuerId !== null ? { issuerId } : {}),
        redirectUrl: new URL(`${paths.payment}?order=${order.id}`, window.location.origin).toString(),
      });
      const checkoutUrl = payment.links?.checkout?.href;
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
      setPayments(await checkout.listPayments(order.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The payment could not be started.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{paid ? "Thank you" : "Payment"}</CardTitle>
          <CardDescription>Order {order.number} · {order.status}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!paid && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {checkout.paymentMethods.filter((method) => method.isEnabled).map((method) => (
                  <Button key={method.id} variant={method.id === methodId ? "default" : "outline"} onClick={() => { void chooseMethod(method.id); }}>
                    {method.label}
                  </Button>
                ))}
              </div>
              {issuers.length > 0 && (
                <Select value={issuerId === null ? "" : String(issuerId)} onValueChange={(next) => setIssuerId(Number(next))}>
                  <SelectTrigger aria-label="Bank"><SelectValue placeholder="Choose your bank" /></SelectTrigger>
                  <SelectContent>
                    {issuers.map((issuer) => <SelectItem key={issuer.id} value={String(issuer.id)}>{issuer.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button disabled={methodId === null || checkout.checkoutPending} onClick={() => { void pay(); }}>
                {checkout.checkoutPending ? "Starting payment…" : `Pay ${formatAmount(order.totalAmount)}`}
              </Button>
            </>
          )}
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span>Payment #{payment.id}</span>
              <span className="font-medium">{payment.status}</span>
            </div>
          ))}
          {message && <p className="text-sm text-destructive">{message}</p>}
          <Link href={paths.account as Route} className="text-sm font-medium text-primary hover:underline">Go to account</Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Total</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatAmount(order.subtotalAmount)}</span></div>
          <div className="flex justify-between"><span>VAT</span><span>{formatAmount(order.vatAmount)}</span></div>
          <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{formatAmount(order.totalAmount)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
