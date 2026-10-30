import {
  AuthForgotPasswordPage,
  AuthLoginPage,
  AuthMfaPage,
  AuthRegisterPage,
  AuthResetPasswordPage,
} from "@/components/auth";

import type { PageViews } from "./types";

export const authViews = {
  login: {
    title: "Login",
    async render({ paths, param }) {
      const [returnTo, socialError] = await Promise.all([param("returnTo"), param("socialError")]);
      return <AuthLoginPage paths={paths} {...(returnTo ? { returnTo } : {})} {...(socialError ? { socialError } : {})} />;
    },
  },
  register: {
    title: "Create account",
    render: ({ paths }) => <AuthRegisterPage paths={paths} />,
  },
  mfa: {
    title: "Two-factor authentication",
    async render({ paths, param }) {
      const returnTo = await param("returnTo");
      return <AuthMfaPage paths={paths} {...(returnTo ? { returnTo } : {})} />;
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
