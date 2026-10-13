"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import {
  getProfile,
  updatePreferences,
  updateProfile,
  type PreferencesUpdate,
  type ProfileUpdate,
} from "@/services/profile.service";
import type { ProfileRow } from "@/types/database";

export const profileKey = (userId: string) => ["profile", userId] as const;

/**
 * Client-side profile cache. The server component supplies the first value, so
 * there is no loading flash; refetches and mutations go straight to Supabase
 * under Row Level Security.
 */
export function useProfile(userId: string, initialData: ProfileRow) {
  return useQuery({
    queryKey: profileKey(userId),
    queryFn: async () => {
      const profile = await getProfile(createClient(), userId);
      if (!profile) throw new Error("Profile not found");
      return profile;
    },
    initialData,
  });
}

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ProfileUpdate) =>
      updateProfile(createClient(), userId, values),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey(userId), profile);
    },
  });
}

export function useUpdatePreferences(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: PreferencesUpdate) =>
      updatePreferences(createClient(), userId, values),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey(userId), profile);
    },
  });
}
