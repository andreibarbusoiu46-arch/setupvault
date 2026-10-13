import Link from "next/link";
import type { Metadata } from "next";

import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The recovery link signs the user in before they land here. No session
  // means the link was never opened, or it has already expired.
  const user = await getCurrentUser();

  return (
    <AuthCard
      title="Choose a new password"
      description={
        user
          ? "Pick something you have not used on this account before."
          : "This page opens from the link in your reset email."
      }
      footer={
        <Link
          href={ROUTES.login}
          className="text-fg underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      {user ? (
        <ResetPasswordForm />
      ) : (
        <Alert>
          This reset link is missing or has expired. Request a new one from the
          forgot password page.
        </Alert>
      )}
    </AuthCard>
  );
}
