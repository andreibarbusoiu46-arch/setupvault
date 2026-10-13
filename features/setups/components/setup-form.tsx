"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toDataErrorMessage } from "@/lib/data-errors";
import { calculateRiskReward, formatRatio } from "@/lib/risk-reward";
import { ROUTES } from "@/lib/routes";
import {
  ScreenshotUploadError,
  useCreateSetup,
  useUpdateSetup,
} from "@/hooks/use-setups";
import {
  DIRECTION_OPTIONS,
  MARKET_OPTIONS,
  RESULT_OPTIONS,
} from "@/features/setups/constants";
import { toFormValues, toSetupInput } from "@/features/setups/mappers";
import { emptySetupValues, setupSchema, type SetupFormValues } from "@/features/setups/schemas";
import { calculateSetupScore } from "@/features/setup-score/utils/score";
import { LiveScore } from "@/features/setup-score/components/live-score";
import { ScreenshotUploader } from "@/features/setups/components/screenshot-uploader";
import { TagInput } from "@/features/setups/components/tag-input";
import type { SetupRow } from "@/types/database";

const RR_PROBLEM_TEXT: Record<string, string> = {
  incomplete: "Fill in entry, stop and target to see the ratio.",
  zero_risk: "The stop cannot sit exactly on the entry.",
  stop_wrong_side: "Check the stop — it is on the wrong side of the entry.",
  target_wrong_side: "Check the target — it is on the wrong side of the entry.",
};

interface SetupFormProps {
  userId: string;
  setup?: SetupRow;
  existingScreenshotUrl?: string | null;
}

export function SetupForm({
  userId,
  setup,
  existingScreenshotUrl = null,
}: SetupFormProps) {
  const router = useRouter();
  const isEdit = Boolean(setup);

  const createMutation = useCreateSetup(userId);
  const updateMutation = useUpdateSetup(userId);
  const pending = createMutation.isPending || updateMutation.isPending;

  const [file, setFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [manualRatio, setManualRatio] = useState(
    Boolean(setup?.risk_reward) && !setup?.entry,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues = useMemo<SetupFormValues>(
    () => (setup ? toFormValues(setup) : emptySetupValues),
    [setup],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues,
  });

  // useWatch rather than watch(): it is the subscription-based API, and the
  // only one the React Compiler can reason about safely.
  const [
    direction,
    entry,
    stopLoss,
    takeProfit,
    ticker,
    market,
    tradedOn,
    strategy,
    notes,
    tags,
  ] = useWatch({
    control,
    name: [
      "direction",
      "entry",
      "stopLoss",
      "takeProfit",
      "ticker",
      "market",
      "tradedOn",
      "strategy",
      "notes",
      "tags",
    ],
  });

  const computed = calculateRiskReward({
    direction,
    entry,
    stopLoss,
    takeProfit,
  });
  const computedRatio = computed.ok ? computed.ratio : null;

  // The ratio follows the levels unless the trader has taken it over.
  useEffect(() => {
    if (manualRatio) return;
    setValue("riskReward", computedRatio, { shouldValidate: false });
  }, [manualRatio, computedRatio, setValue]);

  // Same engine as the detail page, fed from the form instead of a row.
  const liveScore = calculateSetupScore({
    direction,
    ticker: ticker || null,
    market: market || null,
    tradedOn: tradedOn || null,
    entry: Number.isFinite(entry) ? entry : null,
    stopLoss: Number.isFinite(stopLoss) ? stopLoss : null,
    takeProfit: Number.isFinite(takeProfit) ? takeProfit : null,
    strategy: strategy || null,
    notesLength: (notes ?? "").trim().length,
    hasScreenshot: Boolean(file) || (Boolean(existingScreenshotUrl) && !removeExisting),
    tagCount: tags?.length ?? 0,
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const input = toSetupInput(values);

    try {
      if (setup) {
        const updated = await updateMutation.mutateAsync({
          id: setup.id,
          input,
          file,
          currentPath: setup.screenshot_path,
          removeCurrent: removeExisting,
        });
        toast.success("Setup updated");
        router.push(`${ROUTES.setups}/${updated.id}`);
      } else {
        const created = await createMutation.mutateAsync({ input, file });
        toast.success("Setup saved to your vault");
        router.push(`${ROUTES.setups}/${created.id}`);
      }
      router.refresh();
    } catch (error) {
      if (error instanceof ScreenshotUploadError) {
        // The record is safe; only the image failed.
        toast.warning(
          "Setup saved, but the screenshot did not upload. You can add it from the edit page.",
        );
        router.push(`${ROUTES.setups}/${error.setup.id}`);
        router.refresh();
        return;
      }

      console.error(error);
      setSubmitError(toDataErrorMessage(error, "The setup could not be saved."));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {submitError ? <Alert>{submitError}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>The setup</CardTitle>
          <CardDescription>
            What you traded and what you called it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="title"
            label="Setup name"
            error={errors.title?.message}
            className="sm:col-span-2"
          >
            <Input
              placeholder="London sweep into daily FVG"
              disabled={pending}
              {...register("title")}
            />
          </FormField>

          <FormField id="ticker" label="Ticker" error={errors.ticker?.message}>
            <Input
              placeholder="EURUSD"
              autoCapitalize="characters"
              disabled={pending}
              {...register("ticker")}
            />
          </FormField>

          <FormField id="market" label="Market" error={errors.market?.message}>
            <Select disabled={pending} {...register("market")}>
              {MARKET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            id="direction"
            label="Direction"
            error={errors.direction?.message}
          >
            <Select disabled={pending} {...register("direction")}>
              {DIRECTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            id="strategy"
            label="Strategy"
            hint="Reuse the same names — this is what makes the library searchable."
            error={errors.strategy?.message}
          >
            <Input
              placeholder="Liquidity sweep"
              disabled={pending}
              {...register("strategy")}
            />
          </FormField>

          <FormField
            id="tradedOn"
            label="Date"
            error={errors.tradedOn?.message}
          >
            <Input type="date" disabled={pending} {...register("tradedOn")} />
          </FormField>

          <FormField
            id="tradedAt"
            label="Time"
            hint="Optional."
            error={errors.tradedAt?.message}
          >
            <Input type="time" disabled={pending} {...register("tradedAt")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Levels</CardTitle>
          <CardDescription>
            The ratio is worked out from these three numbers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField id="entry" label="Entry" error={errors.entry?.message}>
              <Input
                type="number"
                step="any"
                inputMode="decimal"
                disabled={pending}
                {...register("entry", { valueAsNumber: true })}
              />
            </FormField>

            <FormField
              id="stopLoss"
              label="Stop loss"
              error={errors.stopLoss?.message}
            >
              <Input
                type="number"
                step="any"
                inputMode="decimal"
                disabled={pending}
                {...register("stopLoss", { valueAsNumber: true })}
              />
            </FormField>

            <FormField
              id="takeProfit"
              label="Take profit"
              error={errors.takeProfit?.message}
            >
              <Input
                type="number"
                step="any"
                inputMode="decimal"
                disabled={pending}
                {...register("takeProfit", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="rounded-xl border border-border bg-canvas-subtle p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-fg">Risk to reward</p>
                <p className="mt-1 text-xs text-fg-muted">
                  {computed.ok
                    ? `Risking ${computed.risk.toPrecision(6).replace(/\.?0+$/, "")} to make ${computed.reward.toPrecision(6).replace(/\.?0+$/, "")}`
                    : RR_PROBLEM_TEXT[computed.problem]}
                </p>
              </div>
              <p className="numeric text-2xl font-semibold text-fg">
                {computed.ok ? formatRatio(computed.ratio) : "—"}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
              <Switch
                id="manual-rr"
                checked={manualRatio}
                disabled={pending}
                onCheckedChange={setManualRatio}
              />
              <Label htmlFor="manual-rr" className="text-fg-muted">
                Enter the ratio myself
              </Label>
            </div>

            {manualRatio ? (
              <div className="mt-4 sm:max-w-48">
                <FormField
                  id="riskReward"
                  label="Risk to reward"
                  error={errors.riskReward?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    disabled={pending}
                    {...register("riskReward", {
                      setValueAs: (value) =>
                        value === "" || value === null ? null : Number(value),
                    })}
                  />
                </FormField>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outcome and context</CardTitle>
          <CardDescription>
            What happened, and what you want to remember about it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="result" label="Result" error={errors.result?.message}>
              <Select disabled={pending} {...register("result")}>
                {RESULT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="flex items-end">
              <div className="flex items-center gap-3 pb-2">
                <Controller
                  control={control}
                  name="isFavorite"
                  render={({ field }) => (
                    <Switch
                      id="isFavorite"
                      checked={field.value}
                      disabled={pending}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isFavorite">Add to favourites</Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagInput
                  id="tags"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={pending}
                />
              )}
            />
            <p className="text-xs text-fg-subtle">
              Press Enter after each tag. Up to 20.
            </p>
            {errors.tags?.message ? (
              <p role="alert" className="text-xs text-destructive">
                {errors.tags.message}
              </p>
            ) : null}
          </div>

          <FormField
            id="notes"
            label="Notes"
            hint="What you would want to read the next time this pattern shows up."
            error={errors.notes?.message}
          >
            <Textarea rows={5} disabled={pending} {...register("notes")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Screenshot</CardTitle>
          <CardDescription>
            The chart you were looking at. Optional, but it is what makes the
            record worth keeping.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScreenshotUploader
            file={file}
            existingUrl={removeExisting ? null : existingScreenshotUrl}
            uploading={pending && Boolean(file)}
            disabled={pending}
            onSelect={(next) => {
              setFile(next);
              if (next) setRemoveExisting(false);
            }}
            onRemoveExisting={() => setRemoveExisting(true)}
          />
        </CardContent>
      </Card>

      <LiveScore result={liveScore} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              {isEdit ? "Saving" : "Saving to vault"}
            </>
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Save setup"
          )}
        </Button>
      </div>
    </form>
  );
}
