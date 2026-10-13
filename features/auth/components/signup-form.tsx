"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { signUpAction, type ActionResult } from "@/features/auth/actions";
import { signUpSchema, type SignUpValues } from "@/features/auth/schemas";

export function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setResult(null);
    startTransition(async () => {
      const response = await signUpAction(values);
      if (response) setResult(response);
      if (response?.status === "success") reset();
    });
  });

  if (result?.status === "success") {
    return <Alert tone="success">{result.message}</Alert>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {result?.status === "error" ? <Alert>{result.message}</Alert> : null}

      <FormField id="fullName" label="Name" error={errors.fullName?.message}>
        <Input
          autoComplete="name"
          placeholder="Alex Moreau"
          disabled={pending}
          {...register("fullName")}
        />
      </FormField>

      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={pending}
          {...register("email")}
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        hint="At least 8 characters."
        error={errors.password?.message}
      >
        <PasswordInput
          autoComplete="new-password"
          placeholder="••••••••"
          disabled={pending}
          {...register("password")}
        />
      </FormField>

      <Button type="submit" fullWidth disabled={pending} className="mt-2">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Creating account
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
