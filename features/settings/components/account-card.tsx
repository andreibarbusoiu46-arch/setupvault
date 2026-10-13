"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/routes";
import { signOutAction } from "@/features/auth/actions";

const CONFIRM_WORD = "DELETE";

export function AccountCard({ email }: { email: string }) {
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();

  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    setDeleting(true);

    try {
      const response = await fetch("/api/account", { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast.error(
          body?.error ?? "Your account could not be deleted. Try again later.",
        );
        setDeleting(false);
        return;
      }

      setOpen(false);
      router.replace(ROUTES.home);
      router.refresh();
    } catch {
      toast.error("Your account could not be deleted. Check your connection.");
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Your sign-in address and account controls.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-fg">Email address</p>
            <p className="mt-0.5 truncate text-sm text-fg-muted">{email}</p>
          </div>
          <Button
            variant="secondary"
            disabled={signingOut}
            onClick={() =>
              startSignOut(() => {
                void signOutAction();
              })
            }
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>

        <Separator />

        <div className="rounded-xl border border-negative/25 bg-negative-soft/40 p-5">
          <p className="text-sm font-medium text-fg">Delete this account</p>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-fg-muted">
            This removes your login, your profile and every setup you have
            saved. It happens immediately and cannot be undone.
          </p>

          <AlertDialog
            open={open}
            onOpenChange={(next) => {
              if (deleting) return;
              setOpen(next);
              if (!next) setConfirmation("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-4">
                Delete account
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                Everything in your vault goes with it. To confirm, type{" "}
                <span className="font-medium text-fg">{CONFIRM_WORD}</span> below.
              </AlertDialogDescription>

              <div className="mt-5">
                <FormField id="confirm-delete" label={`Type ${CONFIRM_WORD}`}>
                  <Input
                    value={confirmation}
                    autoComplete="off"
                    disabled={deleting}
                    onChange={(event) => setConfirmation(event.target.value)}
                  />
                </FormField>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="secondary" disabled={deleting}>
                    Keep my account
                  </Button>
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={confirmation !== CONFIRM_WORD || deleting}
                  onClick={() => void deleteAccount()}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" />
                      Deleting
                    </>
                  ) : (
                    "Delete account"
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
