"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { useCustomer } from "@ominity/next/react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AccountSwitcherProps {
  readonly className?: string;
}

export function AccountSwitcher({ className }: AccountSwitcherProps) {
  const accounts = useCustomer();
  const [error, setError] = useState<string | null>(null);

  if (!accounts.ready || accounts.memberships.length < 2) {
    return null;
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Select
        value={accounts.customerId === null ? "" : String(accounts.customerId)}
        disabled={accounts.loading}
        onValueChange={(next) => {
          setError(null);
          void accounts.switchTo(Number(next)).catch((caught: unknown) => {
            setError(caught instanceof Error ? caught.message : "Could not switch customer account.");
          });
        }}
      >
        <SelectTrigger aria-label="Active customer account" className="h-8 w-auto max-w-52 gap-2 px-2 text-xs font-medium md:text-xs">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {accounts.memberships.map((membership) => (
            <SelectItem key={membership.customerId} value={String(membership.customerId)}>
              {membership.customer?.name ?? `Account ${membership.customerId}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="max-w-52 text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
