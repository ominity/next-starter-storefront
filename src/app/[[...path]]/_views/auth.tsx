import {
  AuthForgotPasswordPage,
  AuthLoginPage,
  AuthMfaPage,
  AuthRegisterPage,
  AuthResetPasswordPage,
  AuthVerifyEmailCodePage,
} from "@/components/auth";
import { getSocialProviders, redirectIfSignedIn } from "@/lib/ominity/auth";

import type { PageViews } from "./types";

export const authViews = {
  login: {
    title: "Login",
    async render({ paths, param }) {
      const [returnTo, socialError] = await Promise.all([param("returnTo"), param("socialError")]);
      await redirectIfSignedIn(paths, returnTo);
      const socialProviders = await getSocialProviders();
      return (
        <AuthLoginPage
          paths={paths}
          socialProviders={socialProviders}
          {...(returnTo ? { returnTo } : {})}
          {...(socialError ? { socialError } : {})}
        />
      );
    },
  },
  register: {
    title: "Create account",
    async render({ paths }) {
      await redirectIfSignedIn(paths, undefined);
      return <AuthRegisterPage paths={paths} />;
    },
  },
  mfa: {
    title: "Two-factor authentication",
    async render({ paths, param }) {
      const returnTo = await param("returnTo");
      // A sign-in waiting for its second factor doesn't count as signed in, so this page stays reachable mid-login.
      await redirectIfSignedIn(paths, returnTo);
      return <AuthMfaPage paths={paths} {...(returnTo ? { returnTo } : {})} />;
    },
  },
  verify: {
    title: "Check your email",
    async render({ paths, param }) {
      const returnTo = await param("returnTo");
      await redirectIfSignedIn(paths, returnTo);
      return <AuthVerifyEmailCodePage paths={paths} {...(returnTo ? { returnTo } : {})} />;
    },
  },
  forgotPassword: {
    title: "Forgot password",
    render: ({ paths }) => <AuthForgotPasswordPage paths={paths} />,
  },
  resetPassword: {
    title: "Reset password",
    async render({ paths, param }) {
      const [email, token] = await Promise.all([param("email"), param("token")]);
      return <AuthResetPasswordPage loginPath={paths.login} {...(email ? { initialEmail: email } : {})} {...(token ? { token } : {})} />;
    },
  },
} satisfies Partial<PageViews>;
