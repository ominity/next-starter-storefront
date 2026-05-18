"use client";

import type { Route } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";

import { useCommerce } from "@/components/commerce/commerce-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/ominity/commerce";

export interface CartDrawerProps {
  readonly cartPath: string;
  readonly checkoutPath: string;
  readonly checkoutEnabled: boolean;
  readonly title: string;
  readonly emptyText: string;
  readonly checkoutText: string;
  readonly viewCartText: string;
}

export function CartDrawer(props: CartDrawerProps) {
  const commerce = useCommerce();
  const [open, setOpen] = useState(false);

  const currency = commerce.cart[0]?.currency ?? "EUR";
  const subtotal = useMemo(() => formatMoney(commerce.cartSubtotal, currency), [commerce.cartSubtotal, currency]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground"
          aria-label={props.title}
        >
          <ShoppingCart className="h-4 w-4" />
          {commerce.cartCount > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {commerce.cartCount > 99 ? "99+" : commerce.cartCount}
            </span>
          )}
        </button>
      </DrawerTrigger>

      <DrawerContent className="mx-auto w-full max-w-md">
        <DrawerHeader>
          <DrawerTitle>{props.title}</DrawerTitle>
          <DrawerDescription>
            {commerce.cartCount} item(s) · {subtotal}
          </DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[56vh] overflow-auto px-4">
          {commerce.cart.length === 0 ? (
            <p className="pb-4 text-sm text-muted-foreground">{props.emptyText}</p>
          ) : (
            <div className="space-y-3 pb-2">
              {commerce.cart.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.title ?? item.sku ?? item.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty {item.quantity} · {formatMoney(item.totalPrice, item.currency)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => { void commerce.removeFromCart(item.id); }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DrawerFooter>
          <Link
            href={props.cartPath as Route}
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            {props.viewCartText}
          </Link>
          {props.checkoutEnabled && (
            <Link
              href={props.checkoutPath as Route}
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "default" }), "w-full")}
            >
              {props.checkoutText}
            </Link>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
