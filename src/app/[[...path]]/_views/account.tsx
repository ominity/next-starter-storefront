import { CustomerInvitationPage } from "@/components/account";
import { AuthAccountPage } from "@/components/auth";

import type { PageViews } from "./types";

export const accountViews = {
  account: {
    title: "Account",
    render: ({ page, paths }) => <AuthAccountPage language={page.locale} paths={paths} />,
  },
  invitation: {
    title: "Invitation",
    render: ({ page, paths }) => <CustomerInvitationPage token={page.params.token ?? ""} paths={paths} />,
  },
} satisfies Partial<PageViews>;
