import Link from "next/link";
import type { Metadata } from "next";

import { ROUTES } from "@/lib/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Start your vault"
      description="Free while we build. Your setups stay private to your account."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={ROUTES.login}
            className="text-fg underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
