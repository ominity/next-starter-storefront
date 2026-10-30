"use client";

import type { OminityDevToolSnapshot } from "@ominity/next/dev-tool";
import { OminityProvider } from "@ominity/next/react";
import type { ReactNode } from "react";

export interface ProvidersProps {
  readonly children: ReactNode;
  readonly devToolEnabled: boolean;
  readonly devToolSnapshot: OminityDevToolSnapshot;
  readonly trackingEnabled: boolean;
  readonly channelId?: string | undefined;
}

export function Providers(props: ProvidersProps) {
  return (
    <OminityProvider
      devTool={{ enabled: props.devToolEnabled, snapshot: props.devToolSnapshot }}
      tracking={{ enabled: props.trackingEnabled, ...(props.channelId ? { extraMetadata: { channel_id: props.channelId } } : {}) }}
      customerAccounts={{ teamPageSize: 100 }}
    >
      {props.children}
    </OminityProvider>
  );
}
