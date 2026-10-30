"use client";

import { useCustomer } from "@ominity/next/react";

import { AccountSwitcher } from "./account-switcher";
import { CustomerAccountProfile } from "./customer-account-profile";
import { CustomerAccountResources } from "./customer-account-resources";
import { CustomerAccountTeam } from "./customer-account-team";
import { Card, CardContent } from "@/components/ui/card";

export interface CustomerAccountDashboardProps {
  readonly language: string;
}

export function CustomerAccountDashboard({ language }: CustomerAccountDashboardProps) {
  const accounts = useCustomer();

  if (!accounts.ready) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">Loading customer accounts…</CardContent>
      </Card>
    );
  }

  if (accounts.error && accounts.memberships.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm text-destructive">{accounts.error.message}</p>
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => {
              void accounts.refresh().catch(() => undefined);
            }}
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!accounts.membership) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          This user does not belong to a registered customer account yet.
        </CardContent>
      </Card>
    );
  }

  const activeName = accounts.membership.customer?.name
    ?? `Account ${accounts.membership.customerId}`;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active customer</p>
          <h2 className="mt-1 text-xl font-semibold">{activeName}</h2>
          <p className="text-sm text-muted-foreground">
            {accounts.membership.role?.name ?? "Customer member"}
            {accounts.membership.isOwner ? " · Owner" : ""}
          </p>
        </div>
        <AccountSwitcher />
      </div>

      <CustomerAccountProfile key={accounts.customerId} />
      <CustomerAccountTeam language={language} />
      <CustomerAccountResources />
    </section>
  );
}
