"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
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
import { toDataErrorMessage } from "@/lib/data-errors";
import { ROUTES } from "@/lib/routes";
import { useDeleteSetup } from "@/hooks/use-setups";

export function DeleteSetupDialog({
  userId,
  setupId,
  title,
}: {
  userId: string;
  setupId: string;
  title: string;
}) {
  const router = useRouter();
  const mutation = useDeleteSetup(userId);
  const [open, setOpen] = useState(false);

  const remove = async () => {
    try {
      await mutation.mutateAsync(setupId);
      toast.success("Setup deleted");
      setOpen(false);
      router.replace(ROUTES.setups);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        toDataErrorMessage(error, "The setup could not be deleted."),
      );
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (mutation.isPending) return;
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogTitle>Delete this setup?</AlertDialogTitle>
        <AlertDialogDescription>
          “{title}” and its screenshot will be removed from your vault. This
          cannot be undone.
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={mutation.isPending}>
              Keep it
            </Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => void remove()}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Deleting
              </>
            ) : (
              "Delete setup"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
