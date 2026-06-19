const COINGECKO_BASE = import.meta.env.PROD
  ? "https://api.coingecko.com/api/v3"
  : "/api/coingecko/api/v3";
const FEAR_GREED_BASE = import.meta.env.PROD
  ? "https://api.alternative.me"
  : "/api/feargreed";

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  sparkline_in_7d?: { price: number[] };
}

export interface MarketData {
  total_market_cap: number;
  total_volume: number;
  market_cap_change_percentage_24h: number;
  active_cryptocurrencies: number;
  markets: number;
}

export interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
}

export interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    price_btc: number;
    score: number;
  };
}

// Simple cache
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_DURATION = 120000; // 2 minutes

// In-flight request deduplication (stores parsed JSON, not Response, to avoid body-already-read)
const inflight = new Map<string, Promise<unknown>>();

function getCache(key: string) {
  const item = cache.get(key);
  if (item && Date.now() < item.expiry) return item.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiry: Date.now() + CACHE_DURATION });
}

async function fetchWithRetry(url: string, retries = 3, delay = 2000): Promise<Response> {
  const cached = getCache(url);
  if (cached) return new Response(JSON.stringify(cached), { status: 200 });

  // Deduplicate in-flight requests — each caller gets a fresh Response
  let promise = inflight.get(url);
  if (!promise) {
    promise = _fetchData(url, retries, delay);
    inflight.set(url, promise);
    promise.finally(() => inflight.delete(url));
  }
  const data = await promise;
  return new Response(JSON.stringify(data), { status: 200 });
}

async function _fetchData(url: string, retries: number, delay: number): Promise<unknown> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        const backoff = delay * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setCache(url, data);
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError || new Error("Max retries reached");
}

export async function getGlobalMarketData(): Promise<MarketData> {
  try {
    const response = await fetchWithRetry(`${COINGECKO_BASE}/global`);
    const data = await response.json();
    const globalData = data.data;

    return {
      total_market_cap: globalData.total_market_cap.usd,
      total_volume: globalData.total_volume.usd,
      market_cap_change_percentage_24h: globalData.market_cap_change_percentage_24h_usd,
      active_cryptocurrencies: globalData.active_cryptocurrencies,
      markets: globalData.markets,
    };
  } catch (error) {
    console.error("Error fetching global market data:", error);
    return {
      total_market_cap: 3.2e12,
      total_volume: 98e9,
      market_cap_change_percentage_24h: 2.5,
      active_cryptocurrencies: 12500,
      markets: 850,
    };
  }
}

export async function getTopCoins(limit = 10): Promise<Coin[]> {
  try {
    const response = await fetchWithRetry(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`,
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching top coins:", error);
    return [];
  }
}

export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  try {
    const response = await fetchWithRetry(`${COINGECKO_BASE}/search/trending`);
    const data = await response.json();
    return data.coins || [];
  } catch (error) {
    console.error("Error fetching trending coins:", error);
    return [];
  }
}

export async function getFearAndGreedIndex(): Promise<FearGreedData> {
  try {
    const response = await fetchWithRetry(`${FEAR_GREED_BASE}/fng/?limit=1`);
    const data = await response.json();
    return data.data?.[0] || { value: "50", value_classification: "Neutral", timestamp: "" };
  } catch (error) {
    console.error("Error fetching Fear & Greed Index:", error);
    return { value: "50", value_classification: "Neutral", timestamp: "" };
  }
}

export async function getTopGainers(limit = 5): Promise<Coin[]> {
  try {
    const response = await fetchWithRetry(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`,
    );
    const coins: Coin[] = await response.json();

    return coins
      .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching top gainers:", error);
    return [];
  }
}

export async function getCoinsByIds(ids: string[]): Promise<Coin[]> {
  try {
    const response = await fetchWithRetry(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`,
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching coins by IDs:", error);
    return [];
  }
}

export async function searchCoins(
  query: string,
): Promise<{ id: string; name: string; symbol: string }[]> {
  try {
    const response = await fetchWithRetry(
      `${COINGECKO_BASE}/search?query=${encodeURIComponent(query)}`,
    );
    const data = await response.json();
    return (data.coins || []).slice(0, 10);
  } catch (error) {
    console.error("Error searching coins:", error);
    return [];
  }
}

export function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toFixed(6)}`;
}

export function formatMarketCap(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)} T`;
  }
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)} B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)} M`;
  }
  return `$${value.toLocaleString("en-US")}`;
}

export function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
