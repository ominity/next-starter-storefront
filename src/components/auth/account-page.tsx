"use client";

import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountPasskeys, AccountSecurity, CustomerAccountDashboard } from "@/components/account";

import { useAuth } from "@ominity/next/react";

export interface AuthAccountPageProps {
  readonly language: string;
  readonly paths: {
    readonly login: string;
    readonly account: string;
    readonly register: string;
    readonly mfa: string;
    readonly cart: string;
    readonly checkout: string;
    readonly wishlist: string;
  };
}

export function AuthAccountPage(props: AuthAccountPageProps) {
  const auth = useAuth();

  if (!auth.ready) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">Loading account…</CardContent>
      </Card>
    );
  }

  if (!auth.user) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Account</CardTitle>
          <CardDescription>You are not signed in.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Link href={props.paths.login as Route} className="text-sm font-medium text-primary hover:underline">
            Login
          </Link>
          <Link href={props.paths.register as Route} className="text-sm font-medium text-primary hover:underline">
            Register
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card>
        <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">My account</CardTitle>
            <CardDescription>{auth.user.email ?? "Signed in user"}</CardDescription>
          </div>
          <Button variant="outline" onClick={() => { void auth.signOut(); }}>Sign out</Button>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {(auth.user.firstName || auth.user.lastName) && (
            <p className="mr-auto text-sm text-muted-foreground">
              {auth.user.firstName ?? ""} {auth.user.lastName ?? ""}
            </p>
          )}
          <Link href={props.paths.cart as Route} className="text-sm font-medium text-primary hover:underline">Cart</Link>
          <Link href={props.paths.checkout as Route} className="text-sm font-medium text-primary hover:underline">Checkout</Link>
          <Link href={props.paths.wishlist as Route} className="text-sm font-medium text-primary hover:underline">Wishlist</Link>
        </CardContent>
      </Card>

      <CustomerAccountDashboard language={props.language} />

      <AccountSecurity />

      <AccountPasskeys paths={props.paths} />
    </div>
  );
}
