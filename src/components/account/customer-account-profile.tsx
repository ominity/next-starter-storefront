"use client";

import { useState, type FormEvent } from "react";
import type { Address } from "@ominity/api-typescript/models";
import {
  CUSTOMER_PERMISSIONS,
  useAddresses,
  useCustomer,
  useOminityCustomerSdkQuery,
  useOminitySdk,
} from "@ominity/next/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressDraft {
  readonly id?: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly street: string;
  readonly number: string;
  readonly additional: string;
  readonly postalCode: string;
  readonly city: string;
  readonly region: string;
  readonly country: string;
}

const EMPTY_ADDRESS: AddressDraft = {
  firstName: "",
  lastName: "",
  street: "",
  number: "",
  additional: "",
  postalCode: "",
  city: "",
  region: "",
  country: "",
};

function addressDraft(address: Address): AddressDraft {
  return {
    ...(typeof address.id === "number" ? { id: address.id } : {}),
    firstName: address.firstName ?? "",
    lastName: address.lastName ?? "",
    street: address.street,
    number: address.number,
    additional: address.additional,
    postalCode: address.postalCode,
    city: address.city,
    region: address.region,
    country: address.country,
  };
}

export function CustomerAccountProfile() {
  const accounts = useCustomer();
  const sdk = useOminitySdk();
  const customer = useOminityCustomerSdkQuery(
    (client, { customerId, signal }) => client.commerce.customers.get({ id: customerId }, { signal }),
    { permission: CUSTOMER_PERMISSIONS.customerView },
  );
  const book = useAddresses();
  const [profileSaving, setProfileSaving] = useState(false);
  const [address, setAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [addressSaving, setAddressSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (field: string) => String(data.get(field) ?? "").trim();
    setProfileSaving(true);
    setMessage(null);
    try {
      await sdk.commerce.customers.update({
        id: accounts.customerId as number,
        data: {
          name: value("name") || null,
          email: value("email").toLowerCase() || null,
          phone: value("phone") || null,
          companyVat: value("companyVat") || null,
        },
      });
      await customer.refresh();
      setMessage("Customer details saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save customer details.");
    } finally {
      setProfileSaving(false);
    }
  };

  const saveAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!address.street.trim() || !address.number.trim() || !address.postalCode.trim() || !address.city.trim() || !address.country.trim()) {
      setMessage("Street, number, postal code, city, and country are required.");
      return;
    }
    setAddressSaving(true);
    setMessage(null);
    const data = {
      firstName: address.firstName.trim() || null,
      lastName: address.lastName.trim() || null,
      street: address.street.trim(),
      number: address.number.trim(),
      additional: address.additional.trim() || null,
      postalCode: address.postalCode.trim(),
      city: address.city.trim(),
      region: address.region.trim() || null,
      country: address.country.trim().toUpperCase(),
    };
    try {
      await (typeof address.id === "number" ? book.update(address.id, data) : book.create(data));
      setAddress(EMPTY_ADDRESS);
      setMessage("Address saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the address.");
    } finally {
      setAddressSaving(false);
    }
  };

  if (!accounts.membership) return null;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {accounts.can(CUSTOMER_PERMISSIONS.customerView) && (
        <Card>
          <CardHeader>
            <CardTitle>Customer details</CardTitle>
            <CardDescription>Profile and billing identity for the active customer account.</CardDescription>
          </CardHeader>
          <CardContent>
            {customer.loading && <p className="text-sm text-muted-foreground">Loading customer…</p>}
            {customer.error && <p className="text-sm text-destructive">{customer.error.message}</p>}
            {customer.data && (
              <form key={customer.data.updatedAt} className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { void saveProfile(event); }}>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="customer-name">Name or company</Label>
                  <Input id="customer-name" name="name" defaultValue={customer.data.name ?? ""} disabled={!accounts.can(CUSTOMER_PERMISSIONS.customerManage) || profileSaving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input id="customer-email" name="email" type="email" defaultValue={customer.data.email ?? ""} disabled={!accounts.can(CUSTOMER_PERMISSIONS.customerManage) || profileSaving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone</Label>
                  <Input id="customer-phone" name="phone" defaultValue={customer.data.phone ?? ""} disabled={!accounts.can(CUSTOMER_PERMISSIONS.customerManage) || profileSaving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-vat">VAT number</Label>
                  <Input id="customer-vat" name="companyVat" defaultValue={customer.data.companyVat ?? ""} disabled={!accounts.can(CUSTOMER_PERMISSIONS.customerManage) || profileSaving} />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Customer #{customer.data.id} · {customer.data.type}</p>
                  {accounts.can(CUSTOMER_PERMISSIONS.customerManage) && (
                    <Button type="submit" size="sm" disabled={profileSaving}>
                      {profileSaving ? "Saving…" : "Save"}
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {accounts.can(CUSTOMER_PERMISSIONS.addressesView) && (
        <Card>
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
            <CardDescription>Addresses shared by checkout and customer workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {book.loading && <p className="text-sm text-muted-foreground">Loading addresses…</p>}
            {book.error && <p className="text-sm text-destructive">{book.error.message}</p>}
            <div className="space-y-2">
              {book.addresses.map((item) => (
                <div key={item.id ?? `${item.street}-${item.number}`} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{[item.firstName, item.lastName].filter(Boolean).join(" ") || "Address"}</p>
                    <p className="text-muted-foreground">{item.street} {item.number}{item.additional ? ` ${item.additional}` : ""}</p>
                    <p className="text-muted-foreground">{item.postalCode} {item.city} · {item.country}</p>
                  </div>
                  {accounts.can(CUSTOMER_PERMISSIONS.addressesManage) && typeof item.id === "number" && (
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setAddress(addressDraft(item))}>Edit</Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!window.confirm("Delete this address?")) return;
                          setMessage(null);
                          void book.remove(item.id as number)
                            .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not delete the address."));
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {book.ready && book.addresses.length === 0 && (
                <p className="text-sm text-muted-foreground">No addresses yet.</p>
              )}
            </div>

            {accounts.can(CUSTOMER_PERMISSIONS.addressesManage) && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-semibold">
                  {typeof address.id === "number" ? "Edit address" : "Add address"}
                </p>
                <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { void saveAddress(event); }}>
                  {(["firstName", "lastName", "street", "number", "additional", "postalCode", "city", "region", "country"] as const).map((field) => (
                    <div key={field} className={field === "street" || field === "additional" ? "space-y-2 sm:col-span-2" : "space-y-2"}>
                      <Label htmlFor={`address-${field}`}>{field.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())}</Label>
                      <Input
                        id={`address-${field}`}
                        value={address[field]}
                        onChange={(event) => setAddress((previous) => ({ ...previous, [field]: event.target.value }))}
                        disabled={addressSaving}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" size="sm" disabled={addressSaving}>{addressSaving ? "Saving…" : "Save address"}</Button>
                    {typeof address.id === "number" && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setAddress(EMPTY_ADDRESS)}>Cancel</Button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {message && <p className="text-sm text-muted-foreground xl:col-span-2" role="status">{message}</p>}
    </div>
  );
}
