import { AuthError } from "@supabase/supabase-js";

const GENERIC =
  "Something went wrong on our side. Try again in a moment.";

/**
 * Supabase error codes are stable; their messages are not, and some of them
 * leak implementation detail. Everything a user sees is written here.
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password combination is not correct.",
  email_not_confirmed:
    "Confirm your email address first — check your inbox for the link we sent.",
  user_already_exists: "An account already exists for that email address.",
  email_exists: "An account already exists for that email address.",
  weak_password: "That password is too easy to guess. Try a longer one.",
  same_password: "Choose a password you have not used on this account before.",
  over_email_send_rate_limit:
    "Too many emails requested. Wait a few minutes and try again.",
  over_request_rate_limit: "Too many attempts. Wait a minute and try again.",
  otp_expired:
    "That link has expired. Request a new one and use it within the hour.",
  session_expired: "Your session expired. Sign in again to continue.",
  signup_disabled: "New sign-ups are closed at the moment.",
  validation_failed: "Check the details you entered and try again.",
};

export function toUserMessage(error: unknown): string {
  if (error instanceof AuthError) {
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
    if (error.status === 429) return MESSAGES.over_request_rate_limit;
    if (error.status === 400) return MESSAGES.validation_failed;
    return GENERIC;
  }

  if (error instanceof Error && error.name === "MissingEnvError") {
    return "The app is not connected to its database yet. Check the server configuration.";
  }

  return GENERIC;
}

export { GENERIC as GENERIC_ERROR_MESSAGE };
