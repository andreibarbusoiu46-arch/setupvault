import type { ScoreComponent } from "@/features/setup-score/constants";
import type { Grade } from "@/features/setup-score/constants";
import type { TradeDirection } from "@/types/database";

/**
 * Everything the engine is allowed to look at. Deliberately narrow: it holds
 * only what the user logged, because that is the only thing SetupVault can
 * honestly judge. No market data, no chart reading.
 */
export interface ScoreInput {
  direction: TradeDirection | null;
  ticker: string | null;
  market: string | null;
  tradedOn: string | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  strategy: string | null;
  notesLength: number;
  hasScreenshot: boolean;
  tagCount: number;
}

export interface ComponentScore {
  component: ScoreComponent;
  label: string;
  points: number;
  max: number;
}

export interface SetupScore {
  /** 0–100, integer, always finite. */
  score: number;
  grade: Grade;
  summary: string;
  breakdown: ComponentScore[];
  strengths: string[];
  improvements: string[];
  /** True when a level sits on the wrong side of entry for the direction. */
  hasGeometryError: boolean;
  /** False when there is nothing meaningful to score yet. */
  scorable: boolean;
}
