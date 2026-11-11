import type { MarketType } from "@/types/database";

/**
 * Which market a symbol belongs to.
 *
 * `setups.market` is a NOT NULL enum and no broker export carries it, so
 * every imported row needs one inferred. The brief did not anticipate this —
 * it comes out of the schema, not the spec.
 *
 * Inference here is pattern matching on the ticker and nothing more, so it
 * reports how sure it is and the wizard offers a fallback the user sets once
 * for the whole file. A wrong market is not catastrophic — it filters and
 * groups, it does not change any number — but it is visible, and silently
 * filing every crypto trade under "stocks" would make the analytics lie
 * about what someone trades.
 */

const FIAT = new Set([
  "USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD", "SEK", "NOK",
  "DKK", "PLN", "HUF", "CZK", "TRY", "ZAR", "MXN", "SGD", "HKD", "CNH", "RON",
]);

const STABLE = new Set(["USDT", "USDC", "BUSD", "DAI", "TUSD", "FDUSD"]);

const CRYPTO_BASE = new Set([
  "BTC", "XBT", "ETH", "SOL", "XRP", "ADA", "DOGE", "AVAX", "DOT", "LINK",
  "MATIC", "BNB", "LTC", "TRX", "ATOM", "NEAR", "APT", "ARB", "OP", "SUI",
  "TON", "SHIB", "PEPE", "UNI", "AAVE", "FIL", "ICP", "ETC", "BCH", "XLM",
]);

const METALS = new Set(["XAU", "XAG", "XPT", "XPD"]);

const ENERGY = new Set([
  "WTI", "USOIL", "UKOIL", "BRENT", "NGAS", "NATGAS", "XTI", "XBR", "XNG",
]);

/** Index CFD names, which vary wildly between brokers. */
const INDICES = new Set([
  "NAS100", "NSDQ100", "US100", "NQ100", "USTEC", "NDX",
  "US30", "DJ30", "WS30", "DJI", "YM",
  "SPX500", "US500", "SP500", "SPX", "ES",
  "GER40", "GER30", "DAX", "DAX40", "DE40", "DE30",
  "UK100", "FTSE100", "FTSE",
  "JP225", "NIKKEI", "NI225",
  "FRA40", "CAC40", "EU50", "STOXX50", "ESP35", "AUS200", "HK50", "CHINA50",
  "VIX", "RUT", "US2000",
]);

/** Common CME/ICE futures root codes. */
const FUTURES_ROOTS = new Set([
  "ES", "NQ", "YM", "RTY", "CL", "GC", "SI", "HG", "NG", "ZB", "ZN", "ZC",
  "ZS", "ZW", "6E", "6B", "6J", "6A", "6C", "MES", "MNQ", "MGC", "MCL",
]);

export interface InferredMarket {
  market: MarketType;
  /** False when this is a fallback rather than a recognition. */
  confident: boolean;
  because: string;
}

/** Strips the punctuation brokers sprinkle through symbols: BTC/USDT, EUR_USD, AAPL.US */
function core(ticker: string): string {
  return ticker
    .toUpperCase()
    .replace(/\.(US|NAS|NYSE|L|DE|PA|MI|AS|HK|TO|AX|SW)$/i, "")
    .replace(/[^A-Z0-9]/g, "");
}

/** Splits a six-character pair into its halves, when it looks like one. */
function pair(symbol: string): [string, string] | null {
  if (symbol.length === 6) return [symbol.slice(0, 3), symbol.slice(3)];
  // BTCUSDT, ETHUSDC and friends: a known base plus a known quote.
  for (const quote of [...STABLE, ...FIAT]) {
    if (symbol.length > quote.length && symbol.endsWith(quote)) {
      return [symbol.slice(0, -quote.length), quote];
    }
  }
  return null;
}

export function inferMarket(rawTicker: string): InferredMarket {
  const symbol = core(rawTicker);
  if (!symbol) {
    return { market: "stocks", confident: false, because: "No symbol to read" };
  }

  // Perpetuals and dated crypto contracts announce themselves.
  if (/PERP$|SWAP$|-\d{6}$|USDTM$/.test(symbol)) {
    return { market: "crypto", confident: true, because: "Perpetual or swap contract" };
  }

  if (INDICES.has(symbol)) {
    return { market: "indices", confident: true, because: "Known index" };
  }

  const halves = pair(symbol);
  if (halves) {
    const [base, quote] = halves;

    if (METALS.has(base)) {
      return { market: "commodities", confident: true, because: `${base} is a metal` };
    }
    if (ENERGY.has(base) || ENERGY.has(symbol)) {
      return { market: "commodities", confident: true, because: "Energy symbol" };
    }
    if (STABLE.has(quote) || CRYPTO_BASE.has(base)) {
      return { market: "crypto", confident: true, because: `${base}/${quote} is a crypto pair` };
    }
    if (FIAT.has(base) && FIAT.has(quote)) {
      return { market: "forex", confident: true, because: `${base}/${quote} is a currency pair` };
    }
  }

  if (ENERGY.has(symbol)) {
    return { market: "commodities", confident: true, because: "Energy symbol" };
  }
  if (CRYPTO_BASE.has(symbol)) {
    return { market: "crypto", confident: true, because: "Known crypto" };
  }

  // A futures root plus a month-year code: ESZ6, CLM25.
  const futures = symbol.match(/^([A-Z0-9]{1,3})([FGHJKMNQUVXZ])(\d{1,2})$/);
  if (futures && FUTURES_ROOTS.has(futures[1])) {
    return { market: "futures", confident: true, because: "Futures contract code" };
  }

  // An option symbol in the OCC-ish shape: AAPL250117C00150000.
  if (/^[A-Z]{1,6}\d{6}[CP]\d{3,8}$/.test(symbol)) {
    return { market: "options", confident: true, because: "Option contract" };
  }

  // Short all-letter symbols are usually equities, but this is the weakest
  // read in the file, so it is flagged rather than asserted.
  if (/^[A-Z]{1,5}$/.test(symbol)) {
    return { market: "stocks", confident: false, because: "Short letter ticker — assumed equity" };
  }

  return { market: "stocks", confident: false, because: "Unrecognised symbol" };
}
