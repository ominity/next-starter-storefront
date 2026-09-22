"use client";

import { Suspense, type ReactNode } from "react";
import { OminityCustomerAccountsProvider } from "@ominity/next/customer-accounts/react";
import {
  OminityDevToolProvider,
  type OminityDevToolSnapshot,
} from "@ominity/next/dev-tool";
import { TrackingProvider } from "@ominity/next/tracking/provider";

import { AuthProvider } from "@/components/auth";
import { useAuth } from "@/components/auth/auth-provider";
import { CommerceProvider } from "@/components/commerce/commerce-provider";

export interface ProvidersProps {
  readonly children: ReactNode;
  readonly devToolEnabled: boolean;
  readonly devToolSnapshot: OminityDevToolSnapshot;
  readonly customerAccountsEnabled: boolean;
  readonly trackingEnabled: boolean;
  readonly channelId?: string | undefined;
}

function TrackingLayer(props: {
  readonly children: ReactNode;
  readonly enabled: boolean;
  readonly channelId?: string | undefined;
}) {
  const auth = useAuth();
  const userId = typeof auth.session?.userId === "number" ? auth.session.userId : undefined;

  return (
    <Suspense fallback={props.children}>
      <TrackingProvider
        enabled={props.enabled}
        endpoint="/api/events"
        {...(typeof userId === "number" ? { userId } : {})}
        extraMetadata={{
          ...(props.channelId ? { channel_id: props.channelId } : {}),
          auth_state: typeof userId === "number" ? "authenticated" : "anonymous",
        }}
      >
        {props.children}
      </TrackingProvider>
    </Suspense>
  );
}

export function Providers(props: ProvidersProps) {
  const application = (
    <CommerceProvider>
      {props.children}
    </CommerceProvider>
  );

  return (
    <OminityDevToolProvider
      enabled={props.devToolEnabled}
      initialSnapshot={props.devToolSnapshot}
    >
      <AuthProvider>
        <TrackingLayer
          enabled={props.trackingEnabled}
          channelId={props.channelId}
        >
          {props.customerAccountsEnabled ? (
            <OminityCustomerAccountsProvider teamPageSize={100}>
              {application}
            </OminityCustomerAccountsProvider>
          ) : application}
        </TrackingLayer>
      </AuthProvider>
    </OminityDevToolProvider>
  );
}
