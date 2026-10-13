"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateProfile } from "@/hooks/use-profile";
import { profileSchema, type ProfileValues } from "@/features/profile/schemas";
import type { ProfileRow } from "@/types/database";

export function ProfileForm({ profile }: { profile: ProfileRow }) {
  const router = useRouter();
  const mutation = useUpdateProfile(profile.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.full_name ?? "",
      bio: profile.bio ?? "",
      avatarUrl: profile.avatar_url ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await mutation.mutateAsync({
        full_name: values.fullName,
        bio: values.bio === "" ? null : values.bio,
        avatar_url: values.avatarUrl === "" ? null : values.avatarUrl,
      });

      reset({
        fullName: updated.full_name ?? "",
        bio: updated.bio ?? "",
        avatarUrl: updated.avatar_url ?? "",
      });

      toast.success("Profile saved");
      // The sidebar and top bar render this name on the server.
      router.refresh();
    } catch {
      toast.error("Profile could not be saved. Try again in a moment.");
    }
  });

  const pending = mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your details</CardTitle>
        <CardDescription>
          This is what appears across the app. Only you can see it.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate>
        <CardContent className="flex flex-col gap-5">
          <FormField id="fullName" label="Name" error={errors.fullName?.message}>
            <Input
              autoComplete="name"
              disabled={pending}
              {...register("fullName")}
            />
          </FormField>

          <FormField
            id="avatarUrl"
            label="Avatar image address"
            hint="Paste a link to an image. Uploads arrive with screenshot storage."
            error={errors.avatarUrl?.message}
          >
            <Input
              type="url"
              inputMode="url"
              placeholder="https://"
              disabled={pending}
              {...register("avatarUrl")}
            />
          </FormField>

          <FormField
            id="bio"
            label="About your trading"
            hint="Optional. Up to 280 characters."
            error={errors.bio?.message}
          >
            <Textarea
              rows={3}
              placeholder="Index futures, London session, mostly liquidity sweeps."
              disabled={pending}
              {...register("bio")}
            />
          </FormField>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending || !isDirty}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Saving
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
