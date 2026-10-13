/**
 * Hand-maintained mirror of supabase/migrations/0001_init.sql.
 *
 * Once the Supabase CLI is linked to the project this file can be replaced by
 * `supabase gen types typescript --linked > types/database.ts`; the shape below
 * matches what the generator produces so nothing else has to change.
 */

export type SubscriptionTier = "free" | "pro" | "elite";
export type ThemePreference = "dark" | "light" | "system";
export type AIAnalysisType =
  | "setup_analysis"
  | "auto_tagging"
  | "ocr_levels"
  | "score_explanation";
export type AIAnalysisStatus = "pending" | "processing" | "completed" | "failed";

export type MarketType = "forex" | "crypto" | "stocks" | "indices" | "futures" | "commodities" | "options";
export type TradeDirection = "long" | "short";
export type TradeResult = "win" | "loss" | "breakeven" | "pending";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  subscription_tier: SubscriptionTier;
  theme: ThemePreference;
  email_notifications: boolean;
  product_updates: boolean;
  created_at: string;
  updated_at: string;
}

export type SetupRow = {
  id: string;
  user_id: string;
  title: string;
  ticker: string;
  market: MarketType;
  direction: TradeDirection;
  traded_on: string | null;
  traded_at: string | null;
  entry: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward: number | null;
  result: TradeResult;
  strategy: string | null;
  notes: string | null;
  tags: string[];
  screenshot_path: string | null;
  is_favorite: boolean;
  /** Maintained by trigger in migration 0003; never written by the app. */
  search_text: string | null;
  /** Generated column from migration 0004; never written by the app. */
  notes_length: number;
  created_at: string;
  updated_at: string;
}

export type AIAnalysisRow = {
  id: string;
  setup_id: string;
  user_id: string;
  analysis_type: AIAnalysisType;
  status: AIAnalysisStatus;
  model: string | null;
  analysis_version: number;
  input_hash: string;
  used_screenshot: boolean;
  result_json: unknown;
  confidence: number | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
};

export type AIUsageRow = {
  id: string;
  user_id: string;
  feature: string;
  used_vision: boolean;
  created_at: string;
};

type Insertable<T, Optional extends keyof T> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insertable<
          ProfileRow,
          | "full_name"
          | "avatar_url"
          | "bio"
          | "subscription_tier"
          | "theme"
          | "email_notifications"
          | "product_updates"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      setup_ai_analyses: {
        Row: AIAnalysisRow;
        Insert: Insertable<
          AIAnalysisRow,
          | "id"
          | "analysis_type"
          | "status"
          | "model"
          | "analysis_version"
          | "used_screenshot"
          | "result_json"
          | "confidence"
          | "error_code"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<AIAnalysisRow>;
        Relationships: [];
      };
      ai_usage: {
        Row: AIUsageRow;
        Insert: Insertable<AIUsageRow, "id" | "used_vision" | "created_at">;
        Update: Partial<AIUsageRow>;
        Relationships: [];
      };
      setups: {
        Row: SetupRow;
        Insert: Insertable<
          SetupRow,
          | "id"
          | "traded_on"
          | "traded_at"
          | "entry"
          | "stop_loss"
          | "take_profit"
          | "risk_reward"
          | "result"
          | "strategy"
          | "notes"
          | "tags"
          | "screenshot_path"
          | "is_favorite"
          | "search_text"
          | "notes_length"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<SetupRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      subscription_tier: SubscriptionTier;
      theme_preference: ThemePreference;
      market_type: MarketType;
      trade_direction: TradeDirection;
      trade_result: TradeResult;
      ai_analysis_type: AIAnalysisType;
      ai_analysis_status: AIAnalysisStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}
