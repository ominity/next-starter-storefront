"use client";

import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useAuth } from "./auth-provider";

export interface AuthAccountPageProps {
  readonly paths: {
    readonly login: string;
    readonly register: string;
    readonly mfa: string;
    readonly cart: string;
    readonly checkout: string;
    readonly wishlist: string;
  };
  readonly features: {
    readonly wishlist: boolean;
    readonly checkout: boolean;
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

  if (!auth.session) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Account</CardTitle>
          <CardDescription>You are not signed in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
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
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">My account</CardTitle>
        <CardDescription>{auth.session.email ?? "Signed in user"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(auth.session.firstName || auth.session.lastName) && (
          <p className="text-sm text-muted-foreground">
            {auth.session.firstName ?? ""} {auth.session.lastName ?? ""}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Link href={props.paths.cart as Route} className="text-sm font-medium text-primary hover:underline">
            Cart
          </Link>
          {props.features.checkout && (
            <Link href={props.paths.checkout as Route} className="text-sm font-medium text-primary hover:underline">
              Checkout
            </Link>
          )}
          {props.features.wishlist && (
            <Link href={props.paths.wishlist as Route} className="text-sm font-medium text-primary hover:underline">
              Wishlist
            </Link>
          )}
          <Link href={props.paths.mfa as Route} className="text-sm font-medium text-primary hover:underline">
            MFA verification
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Saved addresses for checkout: {auth.savedAddresses.length}
        </p>
        <Button variant="outline" onClick={() => { void auth.signOut(); }}>
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
