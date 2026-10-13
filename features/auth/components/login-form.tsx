"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ROUTES } from "@/lib/routes";
import { signInAction, type ActionResult } from "@/features/auth/actions";
import { signInSchema, type SignInValues } from "@/features/auth/schemas";

const LINK_ERRORS: Record<string, string> = {
  invalid_link: "That link is not valid. Request a new one to continue.",
  expired_link:
    "That link has expired. Request a new one and open it within the hour.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
  const linkError = LINK_ERRORS[searchParams.get("error") ?? ""];

  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setResult(null);
    startTransition(async () => {
      // On success the action redirects, so nothing comes back.
      const response = await signInAction(values, redirectTo);
      if (response) setResult(response);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {result?.status === "error" ? (
        <Alert>{result.message}</Alert>
      ) : linkError ? (
        <Alert>{linkError}</Alert>
      ) : null}

      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={pending}
          {...register("email")}
        />
      </FormField>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <FormField
            id="password"
            label="Password"
            error={errors.password?.message}
            className="w-full"
          >
            <PasswordInput
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={pending}
              {...register("password")}
            />
          </FormField>
        </div>
        <Link
          href={ROUTES.forgotPassword}
          className="self-start text-xs text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
        >
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" fullWidth disabled={pending} className="mt-2">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Signing in
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
