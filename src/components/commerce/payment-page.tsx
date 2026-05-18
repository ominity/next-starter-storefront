"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";

import { useCommerce, type CommerceOrder, type CommercePayment } from "@/components/commerce/commerce-provider";
import {
  commerceOrderCurrency,
  commerceOrderId,
  commerceOrderTotal,
  commercePaymentAmount,
  commercePaymentCurrency,
  commercePaymentId,
} from "@ominity/next/commerce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/ominity/commerce";

export interface CommercePaymentPageProps {
  readonly paths: {
    readonly cart: string;
    readonly account: string;
    readonly checkout: string;
  };
  readonly orderId?: string;
}

export function CommercePaymentPage(props: CommercePaymentPageProps) {
  const commerce = useCommerce();
  const [order, setOrder] = useState<CommerceOrder | null>(null);
  const [payments, setPayments] = useState<ReadonlyArray<CommercePayment>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const orderId = props.orderId;
    if (!orderId || orderId.length === 0 || !commerce.ready) {
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const [resolvedOrder, resolvedPayments] = await Promise.all([
          commerce.getOrderById(orderId),
          commerce.listOrderPayments(orderId),
        ]);

        if (!active) {
          return;
        }

        setOrder(resolvedOrder);
        setPayments(resolvedPayments);
      } catch (error) {
        if (!active) {
          return;
        }

        setMessage(error instanceof Error ? error.message : "Failed to load payment state.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [commerce, props.orderId]);

  if (!commerce.ready || loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">Loading payment…</CardContent>
      </Card>
    );
  }

  const orderId = props.orderId;
  if (!orderId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Payment</CardTitle>
          <CardDescription>No order selected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href={props.paths.checkout as Route} className="text-sm font-medium text-primary hover:underline">
            Back to checkout
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Payment</CardTitle>
          <CardDescription>Order was not found.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <Link href={props.paths.checkout as Route} className="text-sm font-medium text-primary hover:underline">
            Restart checkout
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Payment</CardTitle>
          <CardDescription>Order {order.number ?? commerceOrderId(order)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            This starter surfaces order + payment state from Ominity. Payment authorization flows
            are project-specific and should be integrated per payment gateway.
          </p>

          {message && <p className="text-muted-foreground">{message}</p>}

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span>Order status</span>
              <span className="font-medium">{order.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span className="font-semibold">{formatMoney(commerceOrderTotal(order), commerceOrderCurrency(order))}</span>
            </div>
            {order.createdAt && (
              <div className="flex items-center justify-between">
                <span>Created</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Payments</h3>
            {payments.length === 0 ? (
              <p className="text-muted-foreground">No payment transactions found for this order yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={commercePaymentId(payment)} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span>{commercePaymentId(payment)}</span>
                      <span className="font-medium">{payment.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Amount</span>
                      <span>{formatMoney(commercePaymentAmount(payment), commercePaymentCurrency(payment))}</span>
                    </div>
                    {payment.createdAt && (
                      <div className="flex items-center justify-between">
                        <span>Created</span>
                        <span>{new Date(payment.createdAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={props.paths.checkout as Route} className="font-medium text-primary hover:underline">
              Checkout
            </Link>
            <Link href={props.paths.cart as Route} className="font-medium text-primary hover:underline">
              Cart
            </Link>
            <Link href={props.paths.account as Route} className="font-medium text-primary hover:underline">
              Account
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next step</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Connect a payment intent/create-payment endpoint from your gateway integration.
        </CardContent>
      </Card>
    </div>
  );
}
