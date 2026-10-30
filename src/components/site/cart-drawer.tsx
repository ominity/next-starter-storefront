"use client";

import type { Route } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@ominity/next/react";
import { useState } from "react";

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
import { formatAmount } from "@/lib/format";

export interface CartDrawerProps {
  readonly cartPath: string;
  readonly checkoutPath: string;
  readonly title: string;
  readonly emptyText: string;
  readonly checkoutText: string;
  readonly viewCartText: string;
}

export function CartDrawer(props: CartDrawerProps) {
  const cart = useCart();
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground"
          aria-label={props.title}
        >
          <ShoppingCart className="h-4 w-4" />
          {cart.count > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {cart.count > 99 ? "99+" : cart.count}
            </span>
          )}
        </button>
      </DrawerTrigger>

      <DrawerContent className="mx-auto w-full max-w-md">
        <DrawerHeader>
          <DrawerTitle>{props.title}</DrawerTitle>
          <DrawerDescription>
            {cart.count} item(s) · {formatAmount(cart.cart?.subtotalAmount)}
          </DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[56vh] overflow-auto px-4">
          {cart.items.length === 0 ? (
            <p className="pb-4 text-sm text-muted-foreground">{props.emptyText}</p>
          ) : (
            <div className="space-y-3 pb-2">
              {cart.items.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.product?.title ?? `Product ${item.productId}`}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty {item.quantity} · {formatAmount(item.totalAmount)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => { void cart.remove(item.id); }}
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
          <Link
            href={props.checkoutPath as Route}
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
          >
            {props.checkoutText}
          </Link>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
