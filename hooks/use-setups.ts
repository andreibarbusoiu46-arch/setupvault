"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import {
  createSetup,
  deleteSetup,
  setFavorite,
  setScreenshotPath,
  updateSetup,
  type SetupInput,
} from "@/services/setups.service";
import {
  removeScreenshot,
  removeSetupFolder,
  uploadScreenshot,
} from "@/services/storage.service";
import type { SetupRow } from "@/types/database";

export const setupsKey = ["setups"] as const;

/**
 * The screenshot is uploaded after the row exists, because the storage path is
 * keyed by setup id. If the upload fails the setup is still saved — losing the
 * whole record over an image would be the worse outcome — and the caller is
 * told the image did not attach.
 */
export class ScreenshotUploadError extends Error {
  constructor(readonly setup: SetupRow, readonly cause: unknown) {
    super("Screenshot upload failed");
    this.name = "ScreenshotUploadError";
  }
}

async function attachScreenshot(
  userId: string,
  setup: SetupRow,
  file: File,
): Promise<SetupRow> {
  const supabase = createClient();

  try {
    const path = await uploadScreenshot(supabase, {
      userId,
      setupId: setup.id,
      file,
    });
    return await setScreenshotPath(supabase, userId, setup.id, path);
  } catch (error) {
    throw new ScreenshotUploadError(setup, error);
  }
}

export function useCreateSetup(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      file,
    }: {
      input: SetupInput;
      file: File | null;
    }) => {
      const supabase = createClient();
      const setup = await createSetup(supabase, userId, input);
      if (!file) return setup;
      return attachScreenshot(userId, setup, file);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: setupsKey });
    },
  });
}

export function useUpdateSetup(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
      file,
      currentPath,
      removeCurrent,
    }: {
      id: string;
      input: SetupInput;
      file: File | null;
      currentPath: string | null;
      removeCurrent: boolean;
    }) => {
      const supabase = createClient();

      let setup = await updateSetup(supabase, userId, id, input);

      if (file) {
        setup = await attachScreenshot(userId, setup, file);
        // Only drop the old object once the new path is committed, so a
        // failure never leaves the setup pointing at nothing.
        if (currentPath) await removeScreenshot(supabase, currentPath);
      } else if (removeCurrent && currentPath) {
        setup = await setScreenshotPath(supabase, userId, id, null);
        await removeScreenshot(supabase, currentPath);
      }

      return setup;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: setupsKey });
    },
  });
}

export function useDeleteSetup(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();

      // Storage first: if the row went first, the objects would be orphaned
      // with no path left to find them by.
      await removeSetupFolder(supabase, { userId, setupId: id });
      await deleteSetup(supabase, userId, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: setupsKey });
    },
  });
}

/** Optimistic, with the previous value restored if the write fails. */
export function useToggleFavorite(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      setFavorite(createClient(), userId, id, isFavorite),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: setupsKey });
    },
  });
}
