"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CUSTOMER_PERMISSIONS } from "@ominity/next/customer-accounts";
import {
  CustomerPermissionBoundary,
  useOminityCustomerAccounts,
} from "@ominity/next/customer-accounts/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CustomerAccountTeamProps {
  readonly language: string;
}

function memberName(firstName: string, lastName: string, email: string): string {
  return [firstName, lastName].filter(Boolean).join(" ") || email;
}

export function CustomerAccountTeam({ language }: CustomerAccountTeamProps) {
  const accounts = useOminityCustomerAccounts();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const roles = useMemo(
    () => accounts.roles?.items.filter((role) => role.isAssignable) ?? [],
    [accounts.roles?.items],
  );
  const permissionLabels = useMemo(
    () => new Map(
      accounts.permissionCatalog?.permissions.map((permission) => [permission.key, permission.label]) ?? [],
    ),
    [accounts.permissionCatalog?.permissions],
  );

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedRoleId = Number(roleId);
    if (!email.includes("@") || !Number.isSafeInteger(selectedRoleId) || selectedRoleId <= 0) {
      setMessage("Enter an email address and select a role.");
      return;
    }

    setMessage(null);
    try {
      await accounts.createInvitation({
        email: email.trim().toLowerCase(),
        roleId: selectedRoleId,
        language,
      });
      setEmail("");
      setMessage("Invitation sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the invitation.");
    }
  };

  if (!accounts.can(CUSTOMER_PERMISSIONS.usersView)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          Invite people, assign one of the roles available for this channel, and review its permissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {accounts.teamLoading && !accounts.members && (
          <p className="text-sm text-muted-foreground">Loading team…</p>
        )}

        {accounts.teamErrors.members && (
          <p className="text-sm text-destructive">{accounts.teamErrors.members.message}</p>
        )}

        <div className="space-y-3">
          {accounts.members?.items.map((member) => {
            const mutation = `member:${member.userId}:role` as const;
            const removal = `member:${member.userId}:remove` as const;
            const canManage = accounts.can(CUSTOMER_PERMISSIONS.usersManage) && !member.isOwner;
            return (
              <div key={member.userId} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {memberName(member.firstName, member.lastName, member.email)}
                    {member.isOwner && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                        Owner
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
                <Select
                  value={String(member.roleId)}
                  disabled={!canManage || accounts.isMutationPending(mutation)}
                  onValueChange={(next) => {
                    setMessage(null);
                    void accounts.updateMemberRole({
                      userId: member.userId,
                      roleId: Number(next),
                    }).catch((error: unknown) => {
                      setMessage(error instanceof Error ? error.message : "Could not change the role.");
                    });
                  }}
                >
                  <SelectTrigger aria-label={`Role for ${member.email}`} className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!roles.some((role) => role.id === member.roleId) && member.role && (
                      <SelectItem value={String(member.roleId)}>{member.role.name}</SelectItem>
                    )}
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={accounts.isMutationPending(removal)}
                    onClick={() => {
                      if (!window.confirm(`Remove ${member.email} from this account?`)) return;
                      setMessage(null);
                      void accounts.removeMember(member.userId).catch((error: unknown) => {
                        setMessage(error instanceof Error ? error.message : "Could not remove the member.");
                      });
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            );
          })}
          {accounts.members && accounts.members.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No team members found.</p>
          )}
        </div>

        <CustomerPermissionBoundary required={CUSTOMER_PERMISSIONS.usersManage}>
          <form className="space-y-3 rounded-lg border bg-muted/30 p-4" onSubmit={(event) => { void invite(event); }}>
            <div>
              <p className="text-sm font-semibold">Invite a user</p>
              <p className="text-xs text-muted-foreground">
                Existing and new users receive the appropriate email. They accept with the same email address.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_13rem_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="team-invite-email">Email address</Label>
                <Input
                  id="team-invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="colleague@example.com"
                  disabled={accounts.isMutationPending("invite")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-invite-role">Role</Label>
                <Select value={roleId} onValueChange={setRoleId} disabled={accounts.isMutationPending("invite") || roles.length === 0}>
                  <SelectTrigger id="team-invite-role"><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={accounts.isMutationPending("invite") || roles.length === 0}>
                {accounts.isMutationPending("invite") ? "Sending…" : "Invite"}
              </Button>
            </div>
          </form>

          {accounts.teamErrors.invitations && (
            <p className="text-sm text-destructive">{accounts.teamErrors.invitations.message}</p>
          )}
          {accounts.invitations && accounts.invitations.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Pending invitations</p>
              {accounts.invitations.items.map((invitation) => (
                <div key={invitation.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invitation.role?.name ?? `Role ${invitation.roleId}`} · {invitation.status} · expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  {invitation.status === "pending" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={accounts.isMutationPending(`invitation:${invitation.id}:revoke`)}
                      onClick={() => {
                        if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
                        setMessage(null);
                        void accounts.revokeInvitation(invitation.id).catch((error: unknown) => {
                          setMessage(error instanceof Error ? error.message : "Could not revoke the invitation.");
                        });
                      }}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CustomerPermissionBoundary>

        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}

        {roles.length > 0 && (
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-semibold">Available roles and permissions</summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {roles.map((role) => (
                <div key={role.id} className="rounded-md bg-muted/40 p-3">
                  <p className="text-sm font-medium">{role.name}</p>
                  <p className="text-xs text-muted-foreground">{role.description || role.key}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {role.permissions.map((permission) => permissionLabels.get(permission) ?? permission).join(", ") || "No permissions"}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
