"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { useToggleFavorite } from "@/hooks/use-setups";
import { cn } from "@/lib/utils";

/**
 * Optimistic, with a real rollback: the star flips immediately, and returns to
 * its previous state if the database refuses the write.
 */
export function FavoriteButton({
  userId,
  setupId,
  isFavorite,
  className,
}: {
  userId: string;
  setupId: string;
  isFavorite: boolean;
  className?: string;
}) {
  const router = useRouter();
  const mutation = useToggleFavorite(userId);
  const [optimistic, setOptimistic] = useState(isFavorite);
  const [lastServerValue, setLastServerValue] = useState(isFavorite);

  // Adjust during render when the server sends a fresher value — the pattern
  // React recommends over syncing props into state inside an effect.
  if (lastServerValue !== isFavorite) {
    setLastServerValue(isFavorite);
    setOptimistic(isFavorite);
  }

  const toggle = async () => {
    const next = !optimistic;
    setOptimistic(next);

    try {
      await mutation.mutateAsync({ id: setupId, isFavorite: next });
      router.refresh();
    } catch {
      setOptimistic(!next);
      toast.error("That change could not be saved. Try again in a moment.");
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggle();
      }}
      disabled={mutation.isPending}
      aria-pressed={optimistic}
      aria-label={optimistic ? "Remove from favourites" : "Add to favourites"}
      className={cn(
        "rounded-md p-1.5 transition-colors hover:bg-surface-hover disabled:opacity-60",
        className,
      )}
    >
      <Star
        className={cn(
          "size-4",
          optimistic ? "fill-accent text-accent" : "text-fg-subtle",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
