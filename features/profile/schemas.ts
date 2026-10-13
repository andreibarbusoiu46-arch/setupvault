import { z } from "zod";

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Enter at least 2 characters." })
    .max(80, { message: "Names are limited to 80 characters." }),
  bio: z
    .string()
    .trim()
    .max(280, { message: "Keep it under 280 characters." }),
  avatarUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value === "" || /^https:\/\/.+/.test(value), {
      message: "Enter a full https:// image address, or leave it empty.",
    }),
});

export type ProfileValues = z.infer<typeof profileSchema>;
