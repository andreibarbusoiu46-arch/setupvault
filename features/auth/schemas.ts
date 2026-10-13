import { z } from "zod";

const email = z
  .email({ message: "Enter a valid email address." })
  .max(255, { message: "That email address is too long." });

const password = z
  .string()
  .min(8, { message: "Use at least 8 characters." })
  .max(72, { message: "Passwords are limited to 72 characters." });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { message: "Enter your password." }),
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Enter your name." })
    .max(80, { message: "Names are limited to 80 characters." }),
  email,
  password,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Both passwords must match.",
    path: ["confirmPassword"],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
