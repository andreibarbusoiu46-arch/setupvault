import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Log in" };

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-9.5 w-full" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to open your setup library."
      footer={
        <>
          No account yet?{" "}
          <Link
            href={ROUTES.signup}
            className="text-fg underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
