"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toUserMessage } from "@/lib/auth-errors";
import { getSiteUrl } from "@/lib/env";
import { ROUTES, safeRedirectTarget } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/schemas";

export type ActionResult =
  | { status: "error"; message: string }
  | { status: "success"; message: string };

/** Email is stored lowercase so sign-in is not case sensitive. */
function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

const INVALID_INPUT: ActionResult = {
  status: "error",
  message: "Check the details you entered and try again.",
};

/**
 * Every action re-validates its input on the server. The client-side schema is
 * for fast feedback only and is not trusted.
 */
export async function signInAction(
  values: unknown,
  redirectTo?: string,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(parsed.data.email),
    password: parsed.data.password,
  });

  if (error) return { status: "error", message: toUserMessage(error) };

  revalidatePath("/", "layout");
  redirect(safeRedirectTarget(redirectTo));
}

export async function signUpAction(values: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(parsed.data.email),
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${ROUTES.dashboard}`,
    },
  });

  if (error) return { status: "error", message: toUserMessage(error) };

  // With email confirmation enabled Supabase returns a user but no session.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(ROUTES.dashboard);
  }

  return {
    status: "success",
    message:
      "Account created. Check your inbox for a confirmation link to finish signing up.",
  };
}

export async function forgotPasswordAction(
  values: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizeEmail(parsed.data.email),
    {
      redirectTo: `${getSiteUrl()}/auth/confirm?next=${ROUTES.resetPassword}`,
    },
  );

  // Rate limiting is worth surfacing; anything else is answered identically
  // whether or not the address exists, so the form cannot enumerate accounts.
  if (error && error.status === 429) {
    return { status: "error", message: toUserMessage(error) };
  }

  return {
    status: "success",
    message:
      "If an account exists for that address, a reset link is on its way. The link is valid for one hour.",
  };
}

export async function resetPasswordAction(
  values: unknown,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) return INVALID_INPUT;

  const supabase = await createClient();

  // The recovery link signs the user in; without that session there is nothing
  // to update, and updateUser would silently apply to the wrong account.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message:
        "This reset link is no longer valid. Request a new one to continue.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { status: "error", message: toUserMessage(error) };

  revalidatePath("/", "layout");
  redirect(ROUTES.dashboard);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(ROUTES.login);
}
