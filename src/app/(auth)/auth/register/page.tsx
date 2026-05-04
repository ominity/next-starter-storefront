import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildAuthFeatureMetadata, resolveAuthFeaturePage } from "@/lib/ominity/auth";
import { AuthRegisterPage } from "@/components/auth";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveAuthFeaturePage({
    feature: "register",
    variant: "none",
  });

  if (!resolved) {
    return {
      title: "Register Not Available",
      robots: { index: false, follow: false },
    };
  }

  return buildAuthFeatureMetadata({
    title: "Register",
    description: "Create an account for checkout and order history.",
    canonicalPath: resolved.paths.register,
  });
}

export default async function RegisterPageRoute() {
  const resolved = await resolveAuthFeaturePage({
    feature: "register",
    variant: "none",
  });

  if (!resolved) {
    notFound();
  }

  return (
    <AuthRegisterPage
      paths={{
        login: resolved.paths.login,
        account: resolved.paths.account,
      }}
    />
  );
}
