"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordAction,
  type ActionResult,
} from "@/features/auth/actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/features/auth/schemas";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setResult(null);
    startTransition(async () => {
      setResult(await forgotPasswordAction(values));
    });
  });

  if (result?.status === "success") {
    return <Alert tone="success">{result.message}</Alert>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {result?.status === "error" ? <Alert>{result.message}</Alert> : null}

      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={pending}
          {...register("email")}
        />
      </FormField>

      <Button type="submit" fullWidth disabled={pending} className="mt-2">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Sending link
          </>
        ) : (
          "Send reset link"
        )}
      </Button>
    </form>
  );
}
