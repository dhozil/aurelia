import { useState, useEffect, useCallback } from "react";
import {
  getGlobalMarketData,
  getTopCoins,
  getTrendingCoins,
  getFearAndGreedIndex,
  getTopGainers,
  type Coin,
  type MarketData,
  type FearGreedData,
  type TrendingCoin,
} from "@/lib/crypto-api";

const REFRESH_INTERVAL = 300000; // 5 minutes

export function useMarketData() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getGlobalMarketData();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch market data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useTopCoins(limit = 10) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getTopCoins(limit);
      setCoins(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch coins");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { coins, loading, error, refetch: fetchData };
}

export function useTrendingCoins() {
  const [coins, setCoins] = useState<TrendingCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getTrendingCoins();
      setCoins(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trending coins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL * 2); // 10 minutes for trending
    return () => clearInterval(interval);
  }, [fetchData]);

  return { coins, loading, error, refetch: fetchData };
}

export function useFearAndGreedIndex() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getFearAndGreedIndex();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch Fear & Greed Index");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL * 2); // 10 minutes
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useTopGainers(limit = 5) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getTopGainers(limit);
      setCoins(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch top gainers");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL * 2); // 10 minutes
    return () => clearInterval(interval);
  }, [fetchData]);

  return { coins, loading, error, refetch: fetchData };
}

export function useAllMarketData() {
  const marketData = useMarketData();
  const topCoins = useTopCoins(4);
  const trendingCoins = useTrendingCoins();
  const fearGreed = useFearAndGreedIndex();
  const topGainers = useTopGainers(3);

  const loading =
    marketData.loading ||
    topCoins.loading ||
    trendingCoins.loading ||
    fearGreed.loading ||
    topGainers.loading;

  const refetchAll = useCallback(() => {
    marketData.refetch();
    topCoins.refetch();
    trendingCoins.refetch();
    fearGreed.refetch();
    topGainers.refetch();
  }, []);

  return {
    marketData: marketData.data,
    topCoins: topCoins.coins,
    trendingCoins: trendingCoins.coins,
    fearGreed: fearGreed.data,
    topGainers: topGainers.coins,
    loading,
    refetch: refetchAll,
  };
}
