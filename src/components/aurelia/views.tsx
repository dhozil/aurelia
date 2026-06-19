import { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Wallet,
  TrendingUp,
  FileCode2,
  Sparkles,
  FileText,
  BarChart3,
  Bookmark,
  Eye,
  Brain,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Send,
  Trash2,
  Plus,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { ComponentType } from "react";
import { useTopCoins, useTopGainers } from "@/hooks/use-crypto-data";
import { formatPrice, formatPercentage } from "@/lib/crypto-api";
import { sendToGenLayer, subscribeToAnalysis } from "@/lib/genlayer-service";
import {
  getSavedChats,
  deleteSavedChat,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getMemory,
  addMemory,
  removeMemory,
  type SavedChat,
  type WatchlistItem,
  type MemoryItem,
} from "@/lib/storage";

const riskColors: Record<string, string> = {
  Low: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  High: "bg-orange-500/15 text-orange-400 ring-orange-500/30",
  Critical: "bg-red-500/15 text-red-400 ring-red-500/30",
  Safe: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  Warning: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  Dangerous: "bg-red-500/15 text-red-400 ring-red-500/30",
  Unknown: "bg-white/5 text-muted-foreground ring-white/10",
  Bullish: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  Neutral: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  Bearish: "bg-red-500/15 text-red-400 ring-red-500/30",
};

// Hook: submit analysis and get raw parsed result
function useAnalysisSubmit(type: string) {
  const [analyzing, setAnalyzing] = useState(false);
  const [parsed, setParsed] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.(); };
  }, []);

  const submit = async (query: string, walletAddress?: string) => {
    setAnalyzing(true);
    setParsed(null);
    setError(null);

    let unsub: (() => void) | null = null;
    try {
      const txResult = await sendToGenLayer(query, walletAddress);
      if (!txResult.analysisKey) {
        setAnalyzing(false);
        return;
      }
      unsub = subscribeToAnalysis(txResult.analysisKey, (data: any) => {
        if (data) {
          unsub?.();
          setParsed(data);
          setAnalyzing(false);
        }
      }, 10000);
      abortRef.current = unsub;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setAnalyzing(false);
    }
  };

  return { analyzing, parsed, error, submit };
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function BoolBadge({ value }: { value: boolean }) {
  return value
    ? <span className="inline-block rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-red-500/30">Yes</span>
    : <span className="inline-block rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">No</span>;
}

function AnalysisResultCard({ parsed, labels: extraLabels }: { parsed: any; labels?: Record<string, string> }) {
  const skip = new Set(["analyzed_at", "analyzer"]);
  const labels: Record<string, string> = {
    risk_score: "Risk Score", safety_level: "Safety Level", risk_level: "Risk Level",
    portfolio_value_usd: "Portfolio Value", asset_count: "Asset Count", pnl_30d: "30D PnL",
    ownership_renounced: "Ownership Renounced", has_mint_function: "Has Mint Function",
    liquidity_locked: "Liquidity Locked", honeypot_risk: "Honeypot Risk",
    market_sentiment: "Market Sentiment", portfolio_score: "Portfolio Score",
    total_value_usd: "Total Value", overall_purpose: "Overall Purpose",
    proposal_summary: "Proposal Summary", trust_score: "Trust Score",
    recommendation: "Recommendation",
    ...extraLabels,
  };

  if (!parsed) return null;

  // Fields that should show as badges
  const badgeFields = new Set(["risk_level", "safety_level", "market_sentiment", "honeypot_risk", "recommendation"]);

  // Fields that are booleans
  const boolFields = new Set(["ownership_renounced", "has_mint_function", "liquidity_locked"]);

  const entries = Object.entries(parsed).filter(([k]) => !skip.has(k) && k !== "summary");

  const summary = parsed.summary;

  return (
    <Card>
      <h4 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Analysis Result</h4>
      <div className="grid grid-cols-2 gap-4">
        {entries.map(([key, val]) => {
          if (val === null || val === undefined) return null;
          const label = labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          if (boolFields.has(key)) {
            return <MetricCard key={key} label={label} value={<BoolBadge value={Boolean(val)} />} />;
          }
          if (badgeFields.has(key)) {
            return (
              <MetricCard key={key} label={label}
                value={
                  <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ${riskColors[String(val)] || "bg-white/5 text-muted-foreground ring-white/10"}`}>
                    {String(val)}
                  </span>
                }
              />
            );
          }
          if (typeof val === "number") {
            return <MetricCard key={key} label={label} value={val.toLocaleString()} />;
          }
          if (typeof val === "boolean") {
            return <MetricCard key={key} label={label} value={<BoolBadge value={val} />} />;
          }
          if (Array.isArray(val)) {
            if (val.length === 0) return null;
            const innerLabels: Record<string, string> = {
              apr: "APR", tvl: "TVL", protocol: "Protocol", product: "Product",
              risk: "Risk", reputation: "Reputation",
            };
            const allObjects = val.every((v: any) => typeof v === "object" && v !== null && !Array.isArray(v));
            if (allObjects) {
              return (
                <div key={key} className="col-span-2">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
                  <div className="grid gap-3">
                    {val.map((item: any, i: number) => (
                      <div key={i} className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                          {Object.entries(item).map(([k, v]) => {
                            const lbl = innerLabels[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                            const valStr = String(v);
                            if (k === "risk" || k === "risk_level") {
                              return (
                                <div key={k} className="col-span-1">
                                  <span className="text-xs text-muted-foreground">{lbl}: </span>
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${riskColors[valStr] || "bg-white/5 text-foreground/80 ring-white/10"}`}>
                                    {valStr}
                                  </span>
                                </div>
                              );
                            }
                            if (k === "product" || k === "protocol") {
                              return (
                                <div key={k} className="col-span-1">
                                  <span className="text-xs text-muted-foreground">{lbl}: </span>
                                  <span className="font-medium text-foreground/90">{valStr}</span>
                                </div>
                              );
                            }
                            return (
                              <div key={k} className="col-span-1">
                                <span className="text-xs text-muted-foreground">{lbl}: </span>
                                <span className="text-foreground/80">{valStr}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={key} className="col-span-2 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <ul className="space-y-1">
                  {val.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                      {String(item)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          if (typeof val === "object") {
            return (
              <div key={key} className="col-span-2 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <div className="text-sm text-foreground/80">{JSON.stringify(val, null, 2)}</div>
              </div>
            );
          }
          const str = String(val);
          if (str.length > 80) {
            return (
              <div key={key} className="col-span-2 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <div className="text-sm text-foreground/80">{str}</div>
              </div>
            );
          }
          return <MetricCard key={key} label={label} value={str} />;
        })}
      </div>
      {summary && (
        <div className="mt-4 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
          <div className="text-xs text-muted-foreground">Summary</div>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{summary}</p>
        </div>
      )}
    </Card>
  );
}

// Helper: send TX + poll for result, returns abort function
function sendAndPoll(
  query: string,
  walletAddress?: string,
): { promise: Promise<string>; abort: () => void } {
  let unsub: (() => void) | null = null;
  const promise = new Promise<string>(async (resolve) => {
    const result = await sendToGenLayer(query, walletAddress);

    if (!result.analysisKey) {
      resolve(result.response);
      return;
    }

    unsub = subscribeToAnalysis(
      result.analysisKey,
      (parsed) => {
        if (parsed) {
          unsub?.();
          const lines: string[] = [];
          const skip = new Set(["analyzed_at", "analyzer"]);
          const labels: Record<string, string> = {
            risk_score: "Risk Score",
            safety_level: "Safety Level",
            risk_level: "Risk Level",
            portfolio_value_usd: "Portfolio Value",
            asset_count: "Asset Count",
            pnl_30d: "30D PnL",
            summary: "Summary",
            recommendations: "Recommendations",
            market_sentiment: "Market Sentiment",
            risk_warnings: "Risk Warnings",
            red_flags: "Red Flags",
            recommendation: "Recommendation",
            proposal_summary: "Proposal Summary",
            key_changes: "Key Changes",
            impact: "Impact",
            portfolio_score: "Portfolio Score",
            total_value_usd: "Total Value",
            strengths: "Strengths",
            weaknesses: "Weaknesses",
            overall_purpose: "Overall Purpose",
            functions: "Functions",
            security_notes: "Security Notes",
            user_warnings: "User Warnings",
            warnings: "Warnings",
            honeypot_risk: "Honeypot Risk",
            ownership_renounced: "Ownership Renounced",
            has_mint_function: "Has Mint Function",
            liquidity_locked: "Liquidity Locked",
            comparison: "Comparison",
            key_differences: "Key Differences",
            trust_score: "Trust Score",
            risk_factors: "Risk Factors",
            positive_factors: "Positive Factors",
          };
          for (const [k, v] of Object.entries(parsed)) {
            if (skip.has(k)) continue;
            const label =
              labels[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            let val: string;
            if (v === null || v === undefined) continue;
            if (typeof v === "boolean") val = v ? "Yes" : "No";
            else if (typeof v === "number") val = v.toLocaleString();
            else if (Array.isArray(v))
              val = v.length === 0 ? "None" : v.map((x) => String(x)).join(", ");
            else if (typeof v === "object") val = JSON.stringify(v, null, 2);
            else val = String(v);
            if (val) lines.push(`**${label}:** ${val}`);
          }
          resolve(lines.join("\n\n") || JSON.stringify(parsed, null, 2));
        }
      },
      10000,
    );
  });
  return { promise, abort: () => unsub?.() };
}

// Module-level state to persist analysis results across view switches
const _viewState = new Map<
  string,
  { analyzing: boolean; result: string | null; error: string | null }
>();

function useViewState(key: string) {
  const saved = _viewState.get(key) || { analyzing: false, result: null, error: null };
  const [analyzing, setAnalyzing] = useState(saved.analyzing);
  const [result, setResult] = useState<string | null>(saved.result);
  const [error, setError] = useState<string | null>(saved.error);

  const persist = (a: boolean, r: string | null, e: string | null) => {
    setAnalyzing(a);
    setResult(r);
    setError(e);
    _viewState.set(key, { analyzing: a, result: r, error: e });
  };

  return { analyzing, result, error, persist };
}

export type ViewId =
  | "chat"
  | "token-safety"
  | "wallet-review"
  | "defi-yield"
  | "smart-contract"
  | "top-tokens"
  | "governance"
  | "market-trend"
  | "saved"
  | "watchlist"
  | "memory"
  | "settings"
  | "docs";

export const viewMeta: Record<
  ViewId,
  { title: string; icon: ComponentType<{ className?: string }> }
> = {
  chat: { title: "New Conversation", icon: Sparkles },
  "token-safety": { title: "Analyze Token Safety", icon: ShieldCheck },
  "wallet-review": { title: "Wallet Portfolio Review", icon: Wallet },
  "defi-yield": { title: "DeFi Yield Opportunities", icon: TrendingUp },
  "smart-contract": { title: "Smart Contract Explained", icon: FileCode2 },
  "top-tokens": { title: "Top Tokens by Market Cap", icon: Sparkles },
  governance: { title: "Governance Proposal", icon: FileText },
  "market-trend": { title: "Market Trend Overview", icon: BarChart3 },
  saved: { title: "Saved Chats", icon: Bookmark },
  watchlist: { title: "Watchlist", icon: Eye },
  memory: { title: "Aurelia Memory", icon: Brain },
  settings: { title: "Settings", icon: Settings },
  docs: { title: "Documentation", icon: FileText },
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white/5 ring-1 ring-white/10">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}

export function TokenSafetyView({ walletAddress }: { walletAddress?: string }) {
  const [address, setAddress] = useState("");
  const { analyzing, parsed, error, submit } = useAnalysisSubmit("token");

  const handleAnalyze = () => {
    if (!address) return;
    submit(`Analyze token safety for contract: ${address}`, walletAddress);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-success/15 ring-1 ring-success/30">
            <ShieldCheck className="h-6 w-6 text-success" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Token Safety Analyzer</h3>
            <p className="text-xs text-muted-foreground">
              Scan any contract for honeypot, mint and liquidity risks.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-white/10 placeholder:text-muted-foreground focus:outline-none focus:ring-primary"
            placeholder="Paste contract address (0x...)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button
            onClick={handleAnalyze}
            disabled={!address || analyzing}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </div>
      </Card>

      {analyzing && (
        <Card>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-sm">Analyzing with AI Consensus...</span>
          </div>
        </Card>
      )}

      {error && (
        <Card>
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {parsed && <AnalysisResultCard parsed={parsed} />}

      {!analyzing && !parsed && !error && (
        <EmptyState
          icon={ShieldCheck}
          title="Ready to Analyze"
          description="Enter a token contract address above to check for security risks like honeypot, mint functions, and liquidity issues."
        />
      )}
    </div>
  );
}

export function WalletReviewView({ walletAddress }: { walletAddress?: string }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [parsed, setParsed] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.();
      abortRef.current = null;
    };
  }, []);

  const handleAnalyze = async () => {
    if (!walletAddress) return;
    setAnalyzing(true);
    setParsed(null);
    setError(null);

    let unsub: (() => void) | null = null;
    try {
      const txResult = await sendToGenLayer(
        `Analyze wallet portfolio for: ${walletAddress}`,
        walletAddress,
      );
      if (!txResult.analysisKey) {
        setAnalyzing(false);
        return;
      }
      unsub = subscribeToAnalysis(txResult.analysisKey, (data: any) => {
        if (data) {
          unsub?.();
          setParsed(data);
          setAnalyzing(false);
        }
      }, 10000);
      abortRef.current = unsub;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setAnalyzing(false);
    }
  };

  if (!walletAddress) {
    return (
      <EmptyState
        icon={Wallet}
        title="Connect Your Wallet"
        description="Connect your MetaMask wallet to view your portfolio, holdings, and transaction history."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Wallet Portfolio Review</h3>
            <p className="text-xs text-muted-foreground">
              Analyze your holdings and transaction history.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <div className="text-xs text-muted-foreground">Connected Wallet</div>
          <div className="mt-1 font-mono text-sm">{walletAddress}</div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="mt-4 w-full cursor-pointer rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {analyzing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
            </span>
          ) : (
            "Analyze My Wallet"
          )}
        </button>
      </Card>

      {analyzing && (
        <Card>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-sm">Analyzing with AI Consensus...</span>
          </div>
        </Card>
      )}

      {error && (
        <Card>
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {parsed && (
        <Card>
          <h4 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Analysis Result
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs text-muted-foreground">Portfolio Value</div>
              <div className="mt-1 text-lg font-bold">{parsed.portfolio_value_usd || "$0.00"}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs text-muted-foreground">Asset Count</div>
              <div className="mt-1 text-lg font-bold">{parsed.asset_count ?? 0}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs text-muted-foreground">30D PnL</div>
              <div className="mt-1 text-lg font-bold">{parsed.pnl_30d || "$0.00"}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs text-muted-foreground">Risk Level</div>
              <div className="mt-1">
                <span
                  className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ${
                    riskColors[parsed.risk_level] || "bg-white/5 text-muted-foreground ring-white/10"
                  }`}
                >
                  {parsed.risk_level || "Unknown"}
                </span>
              </div>
            </div>
          </div>
          {parsed.summary && (
            <div className="mt-4 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
              <div className="text-xs text-muted-foreground">Summary</div>
              <p className="mt-1 text-sm leading-relaxed text-foreground/80">{parsed.summary}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export function DefiYieldView({ walletAddress }: { walletAddress?: string }) {
  const [query, setQuery] = useState("");
  const { analyzing, parsed, error, submit } = useAnalysisSubmit("defi");

  const handleAnalyze = (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q) return;
    if (!searchQuery) setQuery(q);
    submit(`Find DeFi yield opportunities for: ${q}`, walletAddress);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-success/15 ring-1 ring-success/30">
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">DeFi Yield Finder</h3>
            <p className="text-xs text-muted-foreground">
              Find the best yield opportunities across DeFi protocols.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-white/10 placeholder:text-muted-foreground focus:outline-none focus:ring-primary"
            placeholder="e.g., 'best USDC yield' or 'ETH staking'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          />
          <button
            onClick={() => handleAnalyze()}
            disabled={!query || analyzing}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Best USDC yield", "ETH staking", "GEN farming", "Low risk DeFi"].map((s) => (
            <button
              key={s}
              onClick={() => handleAnalyze(s)}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs ring-1 ring-white/10 hover:bg-white/10"
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {analyzing && (
        <Card>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-sm">Finding opportunities with AI Consensus...</span>
          </div>
        </Card>
      )}

      {error && (
        <Card>
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {parsed && <AnalysisResultCard parsed={parsed} />}

      {!analyzing && !parsed && !error && (
        <EmptyState
          icon={TrendingUp}
          title="Find DeFi Opportunities"
          description="Enter a search query above or click a suggestion to find yield opportunities."
        />
      )}
    </div>
  );
}

export function SmartContractView({ walletAddress }: { walletAddress?: string }) {
  const [code, setCode] = useState("");
  const { analyzing, parsed, error, submit } = useAnalysisSubmit("contract");

  const handleTranslate = () => {
    if (!code) return;
    submit(`Translate this smart contract to plain language:\n\n${code}`, walletAddress);
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-semibold">Smart Contract Translator</h3>
        <p className="text-xs text-muted-foreground">
          Paste source code, Aurelia explains it in plain language.
        </p>
        <textarea
          className="mt-4 h-40 w-full rounded-xl bg-black/30 p-4 font-mono text-xs ring-1 ring-white/10 placeholder:text-muted-foreground focus:outline-none focus:ring-primary"
          placeholder="Paste your smart contract code here..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          onClick={handleTranslate}
          disabled={!code || analyzing}
          className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {analyzing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Translating...
            </span>
          ) : (
            "Translate to Plain Language"
          )}
        </button>
      </Card>

      {analyzing && (
        <Card>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-sm">Translating with AI Consensus...</span>
          </div>
        </Card>
      )}

      {error && (
        <Card>
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {parsed && <AnalysisResultCard parsed={parsed} />}

      {!analyzing && !parsed && !error && !code && (
        <EmptyState
          icon={FileCode2}
          title="Paste Contract Code"
          description="Enter Solidity, Vyper, or any smart contract code above to get a plain language explanation."
        />
      )}
    </div>
  );
}

export function TopTokensView() {
  const { coins, loading } = useTopCoins(10);

  return (
    <Card>
      <h3 className="text-lg font-semibold">Top Tokens by Market Cap</h3>
      <p className="text-xs text-muted-foreground">Live data from CoinGecko</p>
      {loading ? (
        <LoadingSpinner />
      ) : coins.length > 0 ? (
        <div className="mt-4 space-y-2">
          {coins.map((coin, index) => (
            <div
              key={coin.id}
              className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-xs font-bold">
                  {coin.symbol.toUpperCase().slice(0, 2)}
                </span>
                <div>
                  <div className="text-sm font-semibold">{coin.symbol.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground">{coin.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{formatPrice(coin.current_price)}</div>
                <div
                  className={`text-xs ${(coin.price_change_percentage_24h || 0) >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {formatPercentage(coin.price_change_percentage_24h || 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">Failed to load tokens</div>
      )}
    </Card>
  );
}

export function GovernanceView({ walletAddress }: { walletAddress?: string }) {
  const [query, setQuery] = useState("");
  const { analyzing, parsed, error, submit } = useAnalysisSubmit("governance");

  const handleAnalyze = (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q) return;
    if (!searchQuery) setQuery(q);
    submit(`Analyze governance proposal: ${q}`, walletAddress);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Governance Hub</h3>
            <p className="text-xs text-muted-foreground">
              Analyze governance proposals with AI-powered insights.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-white/10 placeholder:text-muted-foreground focus:outline-none focus:ring-primary"
            placeholder="e.g., 'Aave proposal 123' or 'Uniswap fee switch'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          />
          <button
            onClick={() => handleAnalyze()}
            disabled={!query || analyzing}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Aave proposal", "Uniswap fee", "GEN governance", "DAO vote"].map((s) => (
            <button
              key={s}
              onClick={() => handleAnalyze(s)}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs ring-1 ring-white/10 hover:bg-white/10"
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {analyzing && (
        <Card>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-sm">Analyzing with AI Consensus...</span>
          </div>
        </Card>
      )}

      {error && (
        <Card>
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {parsed && <AnalysisResultCard parsed={parsed} />}

      {!analyzing && !parsed && !error && (
        <EmptyState
          icon={FileText}
          title="Analyze Governance"
          description="Enter a proposal name or click a suggestion to get AI-powered analysis."
        />
      )}
    </div>
  );
}

export function MarketTrendView() {
  const { coins, loading } = useTopGainers(5);

  return (
    <Card>
      <h3 className="text-lg font-semibold">Top Gainers (24h)</h3>
      <p className="text-xs text-muted-foreground">Live market data</p>
      {loading ? (
        <LoadingSpinner />
      ) : coins.length > 0 ? (
        <div className="mt-4 space-y-2">
          {coins.map((coin, index) => (
            <div
              key={coin.id}
              className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/30 text-xs font-bold">
                  {coin.symbol.toUpperCase().slice(0, 2)}
                </span>
                <div>
                  <div className="text-sm font-semibold">{coin.symbol.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground">{coin.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{formatPrice(coin.current_price)}</div>
                <div className="text-xs text-success">
                  {formatPercentage(coin.price_change_percentage_24h || 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">Failed to load gainers</div>
      )}
    </Card>
  );
}

export function SavedChatsView({
  onLoadChat,
}: {
  onLoadChat: (messages: import("@/lib/genlayer-service").ChatMessage[]) => void;
}) {
  const [chats, setChats] = useState<SavedChat[]>([]);

  useEffect(() => {
    setChats(getSavedChats());
  }, []);

  const handleDelete = (id: string) => {
    deleteSavedChat(id);
    setChats(getSavedChats());
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Saved Chats</h3>
          <span className="text-xs text-muted-foreground">{chats.length} chats</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Your conversations are saved automatically. Click to load.
        </p>
      </Card>

      {chats.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No Saved Chats"
          description="Start a conversation and it will be saved automatically."
        />
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <Card key={chat.id}>
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => onLoadChat(chat.messages)} className="flex-1 text-left">
                  <div className="text-sm font-medium">{chat.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(chat.updatedAt)}</span>
                    <span>·</span>
                    <span>{chat.messages.length} messages</span>
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(chat.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function WatchlistView() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const { coins, loading } = useTopCoins(100);

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const handleAdd = () => {
    if (!newSymbol.trim()) return;
    const coin = coins.find((c) => c.symbol.toLowerCase() === newSymbol.trim().toLowerCase());
    const name = newName.trim() || coin?.name || newSymbol.trim();
    const result = addToWatchlist(newSymbol.trim(), name);
    if (result) {
      setWatchlist(getWatchlist());
      setNewSymbol("");
      setNewName("");
    }
  };

  const handleRemove = (id: string) => {
    removeFromWatchlist(id);
    setWatchlist(getWatchlist());
  };

  const getWatchlistWithPrices = () => {
    return watchlist.map((item) => {
      const coin = coins.find((c) => c.symbol.toLowerCase() === item.symbol.toLowerCase());
      return {
        ...item,
        price: coin?.current_price ?? null,
        change24h: coin?.price_change_percentage_24h ?? null,
      };
    });
  };

  const watchlistWithPrices = getWatchlistWithPrices();

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-semibold">Watchlist</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Track tokens you're interested in. Prices update live.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-muted-foreground focus:outline-none focus:ring-primary"
            placeholder="Token symbol (e.g., BTC)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newSymbol.trim()}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </Card>

      {loading && watchlistWithPrices.length > 0 && (
        <Card>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Loading prices...</span>
          </div>
        </Card>
      )}

      {watchlistWithPrices.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="Empty Watchlist"
          description="Add tokens above to track their prices."
        />
      ) : (
        <div className="space-y-2">
          {watchlistWithPrices.map((item) => (
            <Card key={item.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-sm font-bold">
                    {item.symbol.slice(0, 2)}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{item.symbol}</div>
                    <div className="text-xs text-muted-foreground">{item.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.price !== null && (
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatPrice(item.price)}</div>
                      {item.change24h !== null && (
                        <div
                          className={`text-xs ${item.change24h >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {formatPercentage(item.change24h)}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove from watchlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function MemoryView() {
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    setMemory(getMemory());
  }, []);

  const handleAdd = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    addMemory(newKey.trim(), newValue.trim());
    setMemory(getMemory());
    setNewKey("");
    setNewValue("");
  };

  const handleRemove = (id: string) => {
    removeMemory(id);
    setMemory(getMemory());
  };

  const presetMemories = [
    { key: "Main Wallet", value: "Connect your wallet to set" },
    { key: "Preferred Language", value: "English" },
    { key: "Risk Tolerance", value: "Moderate" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-semibold">Aurelia Memory</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Store context about yourself. Aurelia remembers this across sessions.
        </p>
        <div className="mt-4 space-y-2">
          <input
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-muted-foreground focus:outline-none focus:ring-primary"
            placeholder="Key (e.g., Main Wallet)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-muted-foreground focus:outline-none focus:ring-primary"
            placeholder="Value (e.g., 0x1234...abcd)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newKey.trim() || !newValue.trim()}
            className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Save Memory
          </button>
        </div>
      </Card>

      {memory.length === 0 && (
        <Card>
          <h4 className="text-sm font-semibold text-muted-foreground">Suggested Memories</h4>
          <div className="mt-2 space-y-2">
            {presetMemories.map((preset) => (
              <div
                key={preset.key}
                className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
              >
                <div>
                  <div className="text-sm">{preset.key}</div>
                  <div className="text-xs text-muted-foreground">{preset.value}</div>
                </div>
                <button
                  onClick={() => {
                    setNewKey(preset.key);
                    setNewValue("");
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Set
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {memory.length > 0 && (
        <div className="space-y-2">
          {memory.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">{item.key}</div>
                  <div className="mt-0.5 truncate text-sm font-medium">{item.value}</div>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove memory"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsView() {
  return (
    <Card>
      <h3 className="text-lg font-semibold">Settings</h3>
      {[
        { k: "Theme", v: "Dark (Aurelia)" },
        { k: "Language", v: "English" },
        { k: "Default Network", v: "GEN Layer" },
        { k: "Notifications", v: "On" },
        { k: "Aurelia Memory", v: "Enabled" },
      ].map((r) => (
        <div
          key={r.k}
          className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-0"
        >
          <span className="text-muted-foreground">{r.k}</span>
          <span className="font-medium">{r.v}</span>
        </div>
      ))}
    </Card>
  );
}

export function DocsView() {
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  const docs = [
    {
      id: "getting-started",
      title: "Getting Started",
      content: `## Getting Started with Aurelia

Aurelia is an AI Oracle for natural language blockchain interaction, built on GenLayer's AI Consensus.

### Quick Start

1. **Connect Your Wallet** — Click "Connect MetaMask" in the sidebar
2. **Switch to Bradbury** — Aurelia runs on GenLayer Testnet (Chain ID: 4221)
3. **Get GEN Tokens** — Visit the faucet for testnet tokens
4. **Start Asking** — Type any question about blockchain in the chat

### What Can Aurelia Do?

- **Token Safety Analysis** — Check if a token is safe, detect honeypots and scams
- **Wallet Intelligence** — Analyze your portfolio, track holdings and PnL
- **Smart Contract Translation** — Explain any contract in plain language
- **DeFi Yield Advisor** — Find the best yield opportunities
- **Governance Analysis** — Understand DAO proposals
- **Scam Detection** — Identify phishing and fraud attempts

### Network Configuration

| Setting | Value |
|---------|-------|
| Network | GenLayer Bradbury |
| Chain ID | 4221 |
| RPC | https://rpc-bradbury.genlayer.com |
| Explorer | https://explorer-bradbury.genlayer.com |`,
    },
    {
      id: "token-analyzer",
      title: "Token Risk Analyzer",
      content: `## Token Risk Analyzer

Analyze any ERC-20 token for security risks using AI Consensus.

### How It Works

1. Enter a token contract address
2. Aurelia's AI validators analyze the contract
3. Get a comprehensive risk report

### What's Checked

- **Honeypot Detection** — Can you sell the token?
- **Mint Functions** — Can new tokens be created?
- **Blacklist Risk** — Can the owner block your wallet?
- **Liquidity Lock** — Is liquidity locked or can it be pulled?
- **Ownership** — Is ownership renounced?
- **Holder Distribution** — Are tokens concentrated?

### Risk Score

- **0-30**: Low Risk — Generally safe
- **31-60**: Medium Risk — Exercise caution
- **61-80**: High Risk — Significant concerns
- **81-100**: Critical Risk — Do not interact

### Example Query

"Analyze token safety for 0x1234...abcd"`,
    },
    {
      id: "wallet-intelligence",
      title: "Wallet Intelligence",
      content: `## Wallet Intelligence

Get deep insights into any wallet address or your connected wallet.

### Features

- **Portfolio Overview** — Total value and asset breakdown
- **Transaction History** — Recent activity and patterns
- **Token Holdings** — All ERC-20 tokens with values
- **NFT Collection** — Digital assets in the wallet
- **DeFi Positions** — Staking, lending, LP positions
- **PnL Tracking** — Profit and loss over time

### Privacy Note

Wallet analysis uses on-chain data only. No private keys are ever accessed.

### Example Queries

- "Analyze my wallet portfolio"
- "What tokens does 0x1234...abcd hold?"
- "Show me my DeFi positions"`,
    },
    {
      id: "contract-translator",
      title: "Smart Contract Translator",
      content: `## Smart Contract Translator

Translate any smart contract code into plain language explanations.

### Supported Languages

- Solidity
- Vyper
- Yul
- Any EVM-compatible code

### What It Explains

- **Function Logic** — What each function does
- **Security Patterns** — Reentrancy guards, access control
- **Token Economics** — Supply, minting, burning
- **Admin Powers** — What the owner can do
- **User Risks** — What you agree to when interacting

### How to Use

1. Paste the contract source code
2. Click "Translate to Plain Language"
3. Read the human-readable explanation

### Example

Paste any Solidity contract and Aurelia will explain:
- What the contract does
- How it handles money
- What permissions it requires
- Any potential risks`,
    },
    {
      id: "defi-advisor",
      title: "DeFi Yield Advisor",
      content: `## DeFi Yield Advisor

Find the best yield opportunities across DeFi protocols.

### What It Analyzes

- **Lending Protocols** — Aave, Compound, etc.
- **Liquid Staking** — Lido, Rocket Pool
- **LP Opportunities** — Uniswap, Curve
- **Farming** — Various yield farms
- **Bridging** — Cross-chain yields

### Risk Assessment

Each opportunity includes:
- **APR/APY** — Expected annual return
- **TVL** — Total value locked
- **Risk Level** — Low, Medium, High
- **Protocol** — Which platform

### Example Queries

- "Find best USDC yield"
- "Compare ETH staking options"
- "Low risk DeFi opportunities"`,
    },
    {
      id: "genlayer-arch",
      title: "GenLayer Architecture",
      content: `## GenLayer Architecture

Aurelia is powered by GenLayer's AI Consensus protocol.

### How It Works

1. **Intelligent Contracts** — Python-based smart contracts with LLM access
2. **AI Consensus** — Multiple LLM validators verify each result
3. **Non-determinism Handling** — Ensures consistent outputs
4. **Oracle Integration** — Access to off-chain data

### Key Concepts

- **Validators** — LLM nodes that execute and verify contracts
- **Consensus** — Agreement mechanism for AI outputs
- **Non-determinism** — Randomness in LLM responses
- **Strict Equality** — Validators must produce identical results

### Contract Types

Aurelia uses several GenLayer contracts:

| Contract | Purpose |
|----------|---------|
| AureliaOracle | Main entry point |
| TokenAnalyzer | Token safety checks |
| WalletAnalyzer | Portfolio analysis |
| ContractTranslator | Code explanation |
| OnChainMemory | Persistent storage |

### Network

- **Testnet**: Bradbury (Chain ID: 4221)
- **Validators**: 5 LLM nodes
- **Consensus**: AI-powered verification`,
    },
  ];

  if (activeDoc) {
    const doc = docs.find((d) => d.id === activeDoc);
    if (doc) {
      return (
        <div className="space-y-4">
          <button
            onClick={() => setActiveDoc(null)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            ← Back to Documentation
          </button>
          <Card>
            <h3 className="text-lg font-semibold">{doc.title}</h3>
            <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {doc.content}
            </div>
          </Card>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-semibold">Documentation</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Aurelia is built on GenLayer's AI Consensus — every analysis is verified by a network of
          LLM validators.
        </p>
      </Card>

      <div className="space-y-2">
        {docs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setActiveDoc(doc.id)}
            className="flex w-full items-center justify-between rounded-xl bg-white/5 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/10"
          >
            <div>
              <div className="text-sm font-semibold">{doc.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {doc.content.split("\n")[0].replace("## ", "")}
              </div>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
