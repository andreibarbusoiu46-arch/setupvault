"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useUpdatePreferences } from "@/hooks/use-profile";

interface NotificationState {
  email_notifications: boolean;
  product_updates: boolean;
}

const FIELDS: {
  key: keyof NotificationState;
  label: string;
  description: string;
}[] = [
  {
    key: "email_notifications",
    label: "Account emails",
    description:
      "Security and account messages, such as password changes. Sign-in links are always sent.",
  },
  {
    key: "product_updates",
    label: "Product updates",
    description:
      "An occasional note when a part of the library ships. No more than once a month.",
  },
];

export function NotificationsCard({
  userId,
  initial,
}: {
  userId: string;
  initial: NotificationState;
}) {
  const [state, setState] = useState(initial);
  const mutation = useUpdatePreferences(userId);

  const toggle = async (key: keyof NotificationState, value: boolean) => {
    setState((previous) => ({ ...previous, [key]: value }));

    try {
      await mutation.mutateAsync({ [key]: value });
    } catch {
      setState((previous) => ({ ...previous, [key]: !value }));
      toast.error("Preference could not be saved. Try again in a moment.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose what SetupVault emails you about.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {FIELDS.map((field, index) => (
          <div key={field.key}>
            {index > 0 ? <Separator className="mb-4" /> : null}
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <Label htmlFor={field.key}>{field.label}</Label>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                  {field.description}
                </p>
              </div>
              <Switch
                id={field.key}
                checked={state[field.key]}
                disabled={mutation.isPending}
                onCheckedChange={(value) => void toggle(field.key, value)}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
