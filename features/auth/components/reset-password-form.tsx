"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import {
  resetPasswordAction,
  type ActionResult,
} from "@/features/auth/actions";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/features/auth/schemas";

export function ResetPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setResult(null);
    startTransition(async () => {
      const response = await resetPasswordAction(values);
      if (response) setResult(response);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {result?.status === "error" ? <Alert>{result.message}</Alert> : null}

      <FormField
        id="password"
        label="New password"
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

      <FormField
        id="confirmPassword"
        label="Confirm new password"
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          autoComplete="new-password"
          placeholder="••••••••"
          disabled={pending}
          {...register("confirmPassword")}
        />
      </FormField>

      <Button type="submit" fullWidth disabled={pending} className="mt-2">
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Saving password
          </>
        ) : (
          "Save new password"
        )}
      </Button>
    </form>
  );
}
