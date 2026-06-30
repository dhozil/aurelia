import { useState, useRef, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  ShieldCheck,
  Wallet,
  TrendingUp,
  FileCode2,
  Bookmark,
  Eye,
  Brain,
  Settings,
  FileText,
  ChevronRight,
  BadgeCheck,
  Maximize2,
  Paperclip,
  Box,
  Globe,
  Send,
  X,
  Menu,
  BarChart3,
  Sparkles,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import aureliaImg from "@/assets/aurelia.jpg";
import { useMetaMask } from "./wallet";
import { useAllMarketData } from "@/hooks/use-crypto-data";
import { formatPrice, formatMarketCap, formatPercentage } from "@/lib/crypto-api";
import { sendToGenLayer, subscribeToAnalysis, type ChatMessage } from "@/lib/genlayer-service";
import {
  type ViewId,
  viewMeta,
  TokenSafetyView,
  WalletReviewView,
  DefiYieldView,
  SmartContractView,
  TopTokensView,
  GovernanceView,
  MarketTrendView,
  SavedChatsView,
  WatchlistView,
  MemoryView,
  SettingsView,
  DocsView,
} from "./views";
import { saveChat } from "@/lib/storage";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const todayChats: { id: ViewId; icon: typeof ShieldCheck; label: string }[] = [
  { id: "token-safety", icon: ShieldCheck, label: "Analyze Token Safety" },
  { id: "wallet-review", icon: Wallet, label: "Wallet Portfolio Review" },
  { id: "defi-yield", icon: TrendingUp, label: "DeFi Yield Opportunities" },
  { id: "smart-contract", icon: FileCode2, label: "Smart Contract Explained" },
];
const yesterdayChats: { id: ViewId; icon: typeof Sparkles; label: string }[] = [
  { id: "top-tokens", icon: Sparkles, label: "Top Tokens by Market Cap" },
  { id: "governance", icon: FileText, label: "Governance Proposal" },
  { id: "market-trend", icon: BarChart3, label: "Market Trend Overview" },
];
const bottomNav: { id: ViewId; icon: typeof Bookmark; label: string }[] = [
  { id: "saved", icon: Bookmark, label: "Saved Chats" },
  { id: "watchlist", icon: Eye, label: "Watchlist" },
  { id: "memory", icon: Brain, label: "Aurelia Memory" },
  { id: "settings", icon: Settings, label: "Settings" },
  { id: "docs", icon: FileText, label: "Documentation" },
];

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="url(#g)" />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="#f5d27a" />
          <stop offset="1" stopColor="#c89236" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Panel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/90">{title}</h3>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function Gauge({ value, label }: { value: number; label: string }) {
  const c = 2 * Math.PI * 38;
  const dash = (value / 100) * c * 0.75;
  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-[135deg]">
        <circle
          cx="50"
          cy="50"
          r="38"
          stroke="oklch(1 0 0 / 0.1)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${c * 0.75} ${c}`}
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="50"
          r="38"
          stroke="url(#gg)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gg" x1="0" y1="0" x2="100" y2="0">
            <stop stopColor="#ef4444" />
            <stop offset="0.5" stopColor="#eab308" />
            <stop offset="1" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{value}</span>
        <span className="mt-6 text-xs text-success">{label}</span>
      </div>
    </div>
  );
}

function ChatView({
  messages,
  onSend,
  loading,
  onNavigate,
}: {
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  loading: boolean;
  onNavigate: (viewId: ViewId) => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    { icon: ShieldCheck, label: "Analyze Token Safety", viewId: "token-safety" as ViewId },
    { icon: Wallet, label: "Check My Wallet", viewId: "wallet-review" as ViewId },
    { icon: TrendingUp, label: "DeFi Opportunities", viewId: "defi-yield" as ViewId },
    { icon: FileCode2, label: "Explain Contract", viewId: "smart-contract" as ViewId },
  ];

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/40">
          <Logo />
        </div>
        <h2 className="mt-6 text-2xl font-bold">Aurelia AI</h2>
        <p className="mt-2 text-sm text-muted-foreground">The Golden Oracle of Web3</p>
        <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
          Ask anything about blockchain. I can analyze tokens, wallets, smart contracts, and more.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => onNavigate(s.viewId)}
              className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs ring-1 ring-white/10 transition hover:bg-white/10"
            >
              <s.icon className="h-3 w-3 text-primary" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex gap-3"}>
              {msg.role === "assistant" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/40">
                  <Logo />
                </div>
              )}
              <div className={`max-w-xl min-w-0 ${msg.role === "user" ? "" : "flex-1"}`}>
                {msg.role === "assistant" && (
                  <div className="mb-1 text-xs text-muted-foreground">Aurelia</div>
                )}
                <div
                  className={`rounded-2xl p-4 ring-1 ring-white/10 ${
                    msg.role === "user" ? "rounded-tr-md bg-white/5" : "rounded-tl-md bg-white/5"
                  }`}
                >
                  {msg.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Analyzing with AI Consensus...
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
                {msg.txHash && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    TX: {msg.txHash.slice(0, 10)}...{msg.txHash.slice(-8)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderView(
  v: ViewId,
  chatMessages: ChatMessage[],
  onSend: (msg: string) => void,
  loading: boolean,
  walletAddress?: string,
  onLoadChat?: (messages: ChatMessage[]) => void,
  onNavigate?: (viewId: ViewId) => void,
) {
  switch (v) {
    case "chat":
      return (
        <ChatView
          messages={chatMessages}
          onSend={onSend}
          loading={loading}
          onNavigate={onNavigate || (() => {})}
        />
      );
    case "token-safety":
      return <TokenSafetyView walletAddress={walletAddress} />;
    case "wallet-review":
      return <WalletReviewView walletAddress={walletAddress} />;
    case "defi-yield":
      return <DefiYieldView walletAddress={walletAddress} />;
    case "smart-contract":
      return <SmartContractView walletAddress={walletAddress} />;
    case "top-tokens":
      return <TopTokensView />;
    case "governance":
      return <GovernanceView walletAddress={walletAddress} />;
    case "market-trend":
      return <MarketTrendView />;
    case "saved":
      return <SavedChatsView onLoadChat={onLoadChat || (() => {})} />;
    case "watchlist":
      return <WatchlistView />;
    case "memory":
      return <MemoryView />;
    case "settings":
      return <SettingsView />;
    case "docs":
      return <DocsView />;
  }
}

export default function AureliaApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<ViewId>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const {
    address,
    short,
    connect,
    disconnect,
    connecting,
    isBradbury,
    switchToBradbury,
    showSnapWarning,
    dismissSnapWarning,
  } = useMetaMask();
  const {
    marketData,
    topCoins,
    fearGreed,
    topGainers,
    loading: marketLoading,
  } = useAllMarketData();

  const unsubPollRef = useRef<(() => void) | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      unsubPollRef.current?.();
    };
  }, []);

  const meta = viewMeta[view];

  const handleSend = async (content: string) => {
    const userMessage: ChatMessage = {
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const loadingMessage: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date(),
      loading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Send TX — returns immediately after ACCEPTED
      const result = await sendToGenLayer(content, address || undefined);

      if (!result.analysisKey) {
        // Demo mode — result already in response
        setMessages((prev) => {
          const updated = prev.map((msg, i) =>
            i === prev.length - 1
              ? { ...msg, content: result.response, loading: false, txHash: result.txHash }
              : msg,
          );
          saveChat(updated);
          return updated;
        });
        setLoading(false);
        return;
      }

      // Start polling for result — subscribeToAnalysis polls every 3s
      console.log("[Aurelia] Starting poll for analysisKey:", result.analysisKey);
      unsubPollRef.current?.();
      unsubPollRef.current = subscribeToAnalysis(
        result.analysisKey,
        (parsed) => {
          if (parsed) {
            console.log("[Aurelia] Poll hit! Got result:", parsed);
            const formatted = formatResultObj(parsed);
            setMessages((prev) => {
              const updated = prev.map((msg, i) =>
                i === prev.length - 1
                  ? { ...msg, content: formatted, loading: false, txHash: result.txHash }
                  : msg,
              );
              saveChat(updated);
              return updated;
            });
            setLoading(false);
            // Stop polling once we got the result
            unsubPollRef.current?.();
            unsubPollRef.current = null;
          }
        },
        3000,
      );
    } catch {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1
            ? { ...msg, content: "Sorry, an error occurred. Please try again.", loading: false }
            : msg,
        ),
      );
      setLoading(false);
    }
  };

  function formatResultObj(obj: any): string {
    if (!obj || typeof obj !== "object") return String(obj);

    // For general Q&A, show answer as primary content
    if (obj.answer && typeof obj.answer === "string") {
      let text = obj.answer;
      if (obj.confidence) text += `\n\nConfidence: ${obj.confidence}`;
      return text;
    }

    const lines: string[] = [];
    const skipKeys = new Set(["analyzed_at", "analyzer", "query"]);

    const labels: Record<string, string> = {
      risk_score: "Risk Score",
      safety_level: "Safety Level",
      risk_level: "Risk Level",
      trust_score: "Trust Score",
      portfolio_value_usd: "Portfolio Value",
      asset_count: "Asset Count",
      pnl_30d: "30D PnL",
      summary: "Summary",
      ownership_renounced: "Ownership Renounced",
      has_mint_function: "Has Mint Function",
      liquidity_locked: "Liquidity Locked",
      honeypot_risk: "Honeypot Risk",
      warnings: "Warnings",
      red_flags: "Red Flags",
      recommendation: "Recommendation",
      risk_factors: "Risk Factors",
      positive_factors: "Positive Factors",
      overall_purpose: "Overall Purpose",
      functions: "Functions",
      security_notes: "Security Notes",
      user_warnings: "User Warnings",
      portfolio_score: "Portfolio Score",
      total_value_usd: "Total Value",
      strengths: "Strengths",
      weaknesses: "Weaknesses",
      market_sentiment: "Market Sentiment",
      risk_warnings: "Risk Warnings",
      recommendations: "Recommendations",
      proposal_summary: "Proposal Summary",
      key_changes: "Key Changes",
      impact: "Impact",
      comparison: "Comparison",
      key_differences: "Key Differences",
    };

    for (const [key, val] of Object.entries(obj)) {
      if (skipKeys.has(key)) continue;
      const label = labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      let formatted: string;
      if (val === null || val === undefined) continue;
      if (typeof val === "boolean") formatted = val ? "Yes" : "No";
      else if (typeof val === "number") formatted = val.toLocaleString();
      else if (Array.isArray(val))
        formatted =
          val.length === 0
            ? "None"
            : val.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
      else if (typeof val === "object") formatted = JSON.stringify(val, null, 2);
      else formatted = String(val);

      if (formatted) lines.push(`**${label}:** ${formatted}`);
    }

    return lines.join("\n\n") || JSON.stringify(obj, null, 2);
  }

  const handleNewChat = () => {
    setMessages([]);
    setView("chat");
    setChatInput("");
    setSidebarOpen(false);
  };

  const handleLoadChat = (loadedMessages: ChatMessage[]) => {
    setMessages(loadedMessages);
    setView("chat");
    setSidebarOpen(false);
  };

  const handleNavigate = (viewId: ViewId) => {
    setView(viewId);
    setSidebarOpen(false);
  };

  const NavBtn = ({
    id,
    icon: Icon,
    label,
  }: {
    id: ViewId;
    icon: typeof ShieldCheck;
    label: string;
  }) => (
    <button
      onClick={() => {
        setView(id);
        setSidebarOpen(false);
      }}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${view === id ? "bg-primary/15 text-foreground ring-1 ring-primary/30" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="relative min-h-screen text-foreground">
      <div className="relative z-10 flex h-screen">
        {/* Sidebar */}
        <aside
          className={`glass fixed inset-y-2 left-2 z-30 flex w-[280px] flex-col rounded-2xl p-4 transition-transform lg:static lg:m-2 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-[110%]"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo />
              <div>
                <div className="text-lg font-bold tracking-wide text-gold">AURELIA</div>
                <div className="text-[10px] text-muted-foreground">The Golden Oracle of Web3</div>
              </div>
            </div>
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleNewChat}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Chat
          </button>

          <button
            onClick={handleNewChat}
            className={`mt-3 flex w-full items-center justify-between rounded-xl px-3 py-2.5 ring-1 transition ${view === "chat" ? "bg-primary/15 ring-primary/30" : "bg-white/5 ring-white/10 hover:bg-white/10"}`}
          >
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>New Conversation</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <nav className="mt-4 flex-1 overflow-y-auto pr-1">
            <p className="px-2 text-[10px] font-semibold tracking-widest text-muted-foreground">
              TODAY
            </p>
            <ul className="mt-2 space-y-1">
              {todayChats.map((c) => (
                <li key={c.id}>
                  <NavBtn {...c} />
                </li>
              ))}
            </ul>
            <p className="mt-4 px-2 text-[10px] font-semibold tracking-widest text-muted-foreground">
              YESTERDAY
            </p>
            <ul className="mt-2 space-y-1">
              {yesterdayChats.map((c) => (
                <li key={c.id}>
                  <NavBtn {...c} />
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-border pt-3">
              <ul className="space-y-1">
                {bottomNav.map((c) => (
                  <li key={c.id}>
                    <NavBtn {...c} />
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Wallet / Profile */}
          {address && !showSnapWarning ? (
            <div className="mt-3 rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-purple-500 ring-2 ring-primary/50" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{short}</div>
                    <div className="text-[10px] text-gold">MetaMask</div>
                  </div>
                </div>
                <button
                  onClick={disconnect}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  aria-label="Disconnect"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/90 to-orange-500/90 px-3 py-2.5 text-sm font-semibold text-black ring-1 ring-amber-400/40 transition hover:brightness-110 disabled:opacity-60"
            >
              <Wallet className="h-4 w-4" /> {connecting ? "Connecting…" : "Connect MetaMask"}
            </button>
          )}
        </aside>

        {/* Center Chat */}
        <main className="flex flex-1 flex-col p-2 min-w-0">
          <div className="glass flex flex-1 flex-col overflow-hidden rounded-2xl">
            <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
              <button
                className="text-muted-foreground lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden lg:block" />
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/40">
                  <meta.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-base font-semibold">
                      {view === "chat" ? "Aurelia AI" : meta.title}
                    </h2>
                    <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {view === "chat"
                      ? "The Blockchain Speaks Through Aurelia."
                      : view === "top-tokens" || view === "market-trend"
                        ? "Live market data from CoinGecko"
                        : view === "saved"
                          ? "Your saved conversations"
                          : view === "watchlist"
                            ? "Your watched tokens"
                            : view === "memory"
                              ? "Your stored insights"
                              : view === "settings"
                                ? "Configure your preferences"
                                : view === "docs"
                                  ? "Learn how Aurelia works"
                                  : "Powered by GenLayer AI Consensus"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {address && (
                  <span className="hidden items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs text-amber-300 ring-1 ring-amber-400/30 md:inline-flex">
                    <Wallet className="h-3.5 w-3.5" />
                    {short}
                  </span>
                )}
                <div
                  className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 sm:flex ${
                    isBradbury
                      ? "bg-success/15 text-success ring-success/30"
                      : showSnapWarning
                        ? "bg-red-500/15 text-red-400 ring-red-500/30"
                        : "bg-amber-500/15 text-amber-300 ring-amber-400/30"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isBradbury ? "bg-success" : showSnapWarning ? "bg-red-400" : "bg-amber-400"
                    }`}
                  />
                  {isBradbury ? "Bradbury" : showSnapWarning ? "MetaMask Required" : "Connect Wallet"}
                </div>
                <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              {renderView(
                view,
                messages,
                handleSend,
                loading,
                address || undefined,
                handleLoadChat,
                handleNavigate,
              )}
            </div>

            {view === "chat" && (
              <div className="border-t border-border p-3 sm:p-4">
                <div className="glass rounded-2xl p-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                      placeholder="Ask anything about blockchain..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(chatInput);
                          setChatInput("");
                        }
                      }}
                      disabled={loading}
                    />
                    <button
                      onClick={() => {
                        handleSend(chatInput);
                        setChatInput("");
                      }}
                      disabled={!chatInput.trim() || loading}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      aria-label="Send"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Aurelia can make mistakes. Always do your own research.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Aurelia robot column */}
        <aside className="relative hidden w-[300px] shrink-0 p-2 lg:block xl:w-[340px]">
          <div className="glass relative h-full overflow-hidden rounded-2xl">
            <img
              src={aureliaImg}
              alt="Aurelia, the AI Oracle of Web3"
              className="h-full w-full object-cover object-top"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="glass rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                  <span className="text-xs font-semibold">Aurelia is online</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Listening to GEN Layer consensus.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Market panels - Real-time data */}
        <aside className="hidden w-[280px] shrink-0 flex-col gap-3 overflow-y-auto p-2 2xl:flex">
          {/* Total Market Cap */}
          <Panel title="Total Market Cap">
            {loading ? (
              <LoadingSpinner />
            ) : marketData ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {formatMarketCap(marketData.total_market_cap)}
                </span>
                <span
                  className={`text-xs ${marketData.market_cap_change_percentage_24h >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {formatPercentage(marketData.market_cap_change_percentage_24h)}
                </span>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Failed to load</div>
            )}
          </Panel>

          {/* Top Coins */}
          <Panel title="Trending Tokens">
            {loading ? (
              <LoadingSpinner />
            ) : topCoins.length > 0 ? (
              <ul className="space-y-2.5 text-sm">
                {topCoins.slice(0, 4).map((coin, index) => (
                  <li key={coin.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 text-[10px] font-bold">
                        {coin.symbol.toUpperCase().slice(0, 2)}
                      </span>
                      <span className="font-medium">{coin.symbol.toUpperCase()}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs">{formatPrice(coin.current_price)}</div>
                      <div
                        className={`text-[10px] ${(coin.price_change_percentage_24h || 0) >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {formatPercentage(coin.price_change_percentage_24h || 0)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground">Failed to load</div>
            )}
          </Panel>

          {/* Fear & Greed Index */}
          <Panel title="Fear & Greed Index">
            {loading ? (
              <LoadingSpinner />
            ) : fearGreed ? (
              <Gauge value={parseInt(fearGreed.value)} label={fearGreed.value_classification} />
            ) : (
              <div className="text-xs text-muted-foreground">Failed to load</div>
            )}
          </Panel>

          {/* Top Gainers */}
          <Panel title="Top Gainers">
            {loading ? (
              <LoadingSpinner />
            ) : topGainers.length > 0 ? (
              <ul className="space-y-2.5 text-sm">
                {topGainers.map((coin, index) => (
                  <li key={coin.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/30 text-[10px] font-bold">
                        {coin.symbol.toUpperCase().slice(0, 2)}
                      </span>
                      <span className="font-medium">{coin.symbol.toUpperCase()}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs">{formatPrice(coin.current_price)}</div>
                      <div className="text-[10px] text-success">
                        {formatPercentage(coin.price_change_percentage_24h || 0)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground">Failed to load</div>
            )}
          </Panel>
        </aside>
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Snap warning dialog for non-MetaMask wallets */}
      <AlertDialog open={showSnapWarning} onOpenChange={dismissSnapWarning}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">🦊</span> MetaMask Required
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-3 space-y-2 text-sm leading-relaxed">
              <p>
                Aurelia requires <strong>MetaMask</strong> with the <strong>GenLayer Snap</strong> to
                interact with the GenLayer network.
              </p>
              <p>
                The wallet you're using doesn't support <code>wallet_getSnaps</code>, which is needed
                for GenLayer integration.
              </p>
              <div className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs ring-1 ring-amber-500/30">
                <strong>Tip:</strong> Install MetaMask, then click "Connect MetaMask" to get started.
                The GenLayer Snap will install automatically on your first transaction.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={() => window.open("https://metamask.io/download/", "_blank")}
              className="w-full cursor-pointer"
            >
              Download MetaMask
            </AlertDialogAction>
            <button
              onClick={dismissSnapWarning}
              className="w-full rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-white/10 hover:bg-white/5"
            >
              I'll switch later
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
