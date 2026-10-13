import { z } from "zod";

const price = z
  .number({ error: "Enter a number." })
  .positive({ error: "Must be greater than zero." })
  .max(1_000_000_000, { error: "That value is too large." });

const optionalNumber = z
  .number({ error: "Enter a number." })
  .nonnegative({ error: "Cannot be negative." })
  .max(1000, { error: "Keep this under 1000." })
  .nullable();

export const setupSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, { error: "Give the setup a name." })
      .max(120, { error: "Names are limited to 120 characters." }),
    ticker: z
      .string()
      .trim()
      .min(1, { error: "Enter the ticker." })
      .max(20, { error: "Tickers are limited to 20 characters." }),
    market: z.enum(
      ["forex", "crypto", "stocks", "indices", "futures", "commodities", "options"],
      { error: "Pick a market." },
    ),
    direction: z.enum(["long", "short"], { error: "Pick a direction." }),
    tradedOn: z
      .string()
      .min(1, { error: "Pick the date you took the setup." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use the date picker." }),
    tradedAt: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Use HH:MM." })
      .or(z.literal("")),
    entry: price,
    stopLoss: price,
    takeProfit: price,
    riskReward: optionalNumber,
    result: z.enum(["pending", "win", "loss", "breakeven"], {
      error: "Pick a result.",
    }),
    strategy: z
      .string()
      .trim()
      .min(2, { error: "Name the strategy — this is what makes the setup findable later." })
      .max(120, { error: "Strategy names are limited to 120 characters." }),
    tags: z
      .array(z.string().trim().min(1).max(30))
      .max(20, { error: "Up to 20 tags." }),
    notes: z
      .string()
      .trim()
      .max(5000, { error: "Notes are limited to 5000 characters." }),
    isFavorite: z.boolean(),
  })
  /**
   * A stop or target on the wrong side of entry is not a rounding problem, it
   * is a different trade. These refinements refuse the record rather than
   * storing a setup whose risk-to-reward can never be computed.
   */
  .superRefine((values, ctx) => {
    const { direction, entry, stopLoss, takeProfit } = values;

    if (![entry, stopLoss, takeProfit].every(Number.isFinite)) return;

    if (direction === "long") {
      if (stopLoss >= entry) {
        ctx.addIssue({
          code: "custom",
          path: ["stopLoss"],
          message: "On a long, the stop has to sit below the entry.",
        });
      }
      if (takeProfit <= entry) {
        ctx.addIssue({
          code: "custom",
          path: ["takeProfit"],
          message: "On a long, the target has to sit above the entry.",
        });
      }
    }

    if (direction === "short") {
      if (stopLoss <= entry) {
        ctx.addIssue({
          code: "custom",
          path: ["stopLoss"],
          message: "On a short, the stop has to sit above the entry.",
        });
      }
      if (takeProfit >= entry) {
        ctx.addIssue({
          code: "custom",
          path: ["takeProfit"],
          message: "On a short, the target has to sit below the entry.",
        });
      }
    }
  });

export type SetupFormValues = z.infer<typeof setupSchema>;

export const emptySetupValues: SetupFormValues = {
  title: "",
  ticker: "",
  market: "forex",
  direction: "long",
  tradedOn: "",
  tradedAt: "",
  entry: Number.NaN,
  stopLoss: Number.NaN,
  takeProfit: Number.NaN,
  riskReward: null,
  result: "pending",
  strategy: "",
  tags: [],
  notes: "",
  isFavorite: false,
};
