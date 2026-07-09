import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const DEPLOYED_CONTRACT_ADDRESS = "0x5598809D8B2D103B9488525a624D496918C0D0c4";
const EXPLORER_URL = "https://explorer-bradbury.genlayer.com";

// ── Wallet Provider ──────────────────────────────────────────────────────────

function getProvider() {
  return (window as any).ethereum || null;
}

async function ensureCorrectNetwork() {
  const eth = getProvider();
  if (!eth) throw new Error("No EVM wallet detected");

  const chainIdHex = await eth.request({ method: "eth_chainId" });
  if (chainIdHex?.toLowerCase() !== "0x107d") {
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x107d" }],
      });
    } catch (switchErr: any) {
      if (switchErr.code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x107d",
              chainName: "GenLayer Bradbury Testnet",
              nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
              rpcUrls: ["https://rpc-bradbury.genlayer.com"],
              blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"],
            },
          ],
        });
      } else {
        throw switchErr;
      }
    }
  }
}

// ── GenLayer Client ──────────────────────────────────────────────────────────

let _writeClient: any = null;
let _writeClientAddress: string = "";
let _readClient: any = null;

async function getClient(walletAddress: string) {
  if (_writeClient && _writeClientAddress === walletAddress) return _writeClient;
  const eth = getProvider();
  const client = createClient({
    chain: testnetBradbury,
    account: walletAddress as `0x${string}`,
    provider: eth || undefined,
  });
  _writeClient = client;
  _writeClientAddress = walletAddress;
  return client;
}

function getReadClient() {
  if (_readClient) return _readClient;
  _readClient = createClient({ chain: testnetBradbury });
  return _readClient;
}

// ── Contract Read/Write ──────────────────────────────────────────────────────

async function readContractFn(client: any, functionName: string, args: any[] = []): Promise<any> {
  const result = await client.readContract({
    address: getContractAddress(),
    functionName,
    args,
  });
  return mapContractResult(result);
}

async function waitForTxAcceptance(
  client: any,
  txHash: string,
  maxRetries = 60,
  interval = 10000,
): Promise<void> {
  // SDK's waitForTransactionReceipt treats VALIDATORS_TIMEOUT/UNDETERMINED
  // as "decided states" and returns early — but the TX may still progress to ACCEPTED.
  // We use it as a first fast check, then fall back to our own polling.
  let status: string;
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      retries: 10,
      interval,
    });
    status = receipt.statusName || "";
  } catch {
    status = "PENDING";
  }

  if (status === "ACCEPTED" || status === "FINALIZED") return;

  // TX hit a timeout state — it may still be processing.
  // Poll getTransaction directly until true ACCEPTED/FINALIZED.
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < maxRetries; i++) {
    await sleep(interval);
    try {
      const tx = await client.getTransaction({ hash: txHash });
      const s = tx.statusName || String(tx.status);
      if (s === "ACCEPTED" || s === "FINALIZED") {
        console.log(`[Aurelia] TX now ${s}: ${txHash}`);
        return;
      }
      if (s === "CANCELED") {
        throw new Error(`Transaction ${txHash} was canceled`);
      }
      status = s;
    } catch (e: any) {
      if (e.message?.includes("canceled")) throw e;
      console.warn(`[Aurelia] TX poll error: ${e.message}`);
    }
  }
  throw new Error(
    `Timed out waiting for ${txHash} to reach ACCEPTED (last status: ${status})`,
  );
}

async function writeContractFn(
  client: any,
  functionName: string,
  args: any[] = [],
): Promise<string> {
  console.log(
    `[Aurelia] writeContract: ${functionName}(${JSON.stringify(args).substring(0, 100)})`,
  );
  console.log(`[Aurelia] Contract: ${getContractAddress()}`);

  const txHash = await client.writeContract({
    address: getContractAddress(),
    functionName,
    args,
    value: BigInt(0),
    consensusMaxRotations: 1,
  });
  console.log(`[Aurelia] TX submitted: ${txHash}`);
  console.log(`[Aurelia] Explorer: ${EXPLORER_URL}/tx/${txHash}`);

  await waitForTxAcceptance(client, txHash);
  console.log(`[Aurelia] TX accepted: ${txHash}`);
  return txHash;
}

// ── Result Normalization ─────────────────────────────────────────────────────

function mapContractResult(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === "object" && !Array.isArray(val)) {
    if (val.type === "BigInt" || val.type === "bigint") return Number(val);
    if (val.value !== undefined) return val.value;
    if (val.inner !== undefined) return val.inner;
  }
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  if (typeof val === "object" && val !== null) {
    const normalized: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v && typeof v === "object" && (v as any).type === "BigInt") {
        normalized[k] = Number((v as any).value ?? v);
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        normalized[k] = mapContractResult(v);
      } else {
        normalized[k] = v;
      }
    }
    return normalized;
  }
  return val;
}

function formatResult(obj: any): string {
  if (!obj || typeof obj !== "object") return String(obj);

  const lines: string[] = [];

  const formatValue = (key: string, val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "number") return val.toLocaleString();
    if (Array.isArray(val)) {
      if (val.length === 0) return "None";
      return val.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
    }
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

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
    analyzed_at: "Analyzed At",
    analyzer: "Analyzer",
  };

  // Skip meta fields in output
  const skipKeys = new Set(["analyzed_at", "analyzer"]);

  for (const [key, val] of Object.entries(obj)) {
    if (skipKeys.has(key)) continue;
    const label = labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const formatted = formatValue(key, val);
    if (formatted) {
      lines.push(`**${label}:** ${formatted}`);
    }
  }

  return lines.join("\n\n") || JSON.stringify(obj, null, 2);
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  txHash?: string;
  loading?: boolean;
}

export type AnalysisType =
  | "token"
  | "wallet"
  | "contract"
  | "scam"
  | "defi"
  | "governance"
  | "portfolio"
  | "research"
  | "general";

const CONTRACT_ADDRESS_KEY = "aurelia_contract_address";

export function getContractAddress(): string {
  return localStorage.getItem(CONTRACT_ADDRESS_KEY) || DEPLOYED_CONTRACT_ADDRESS;
}

export function setContractAddress(address: string) {
  localStorage.setItem(CONTRACT_ADDRESS_KEY, address);
}

function detectAnalysisType(query: string): AnalysisType {
  const lower = query.toLowerCase();

  if (
    lower.includes("token") &&
    (lower.includes("safe") ||
      lower.includes("scam") ||
      lower.includes("honeypot") ||
      lower.includes("risk"))
  ) {
    return "token";
  }
  if (
    lower.includes("wallet") ||
    lower.includes("portfolio") ||
    lower.includes("balance") ||
    lower.includes("holdings")
  ) {
    return "wallet";
  }
  if (
    lower.includes("contract") ||
    lower.includes("explain") ||
    lower.includes("code") ||
    lower.includes("translate")
  ) {
    return "contract";
  }
  if (
    lower.includes("scam") ||
    lower.includes("fraud") ||
    lower.includes("phishing") ||
    lower.includes("suspicious")
  ) {
    return "scam";
  }
  if (
    lower.includes("defi") ||
    lower.includes("staking") ||
    lower.includes("yield") ||
    lower.includes("apr") ||
    lower.includes("farm")
  ) {
    return "defi";
  }
  if (
    lower.includes("governance") ||
    lower.includes("proposal") ||
    lower.includes("voting") ||
    lower.includes("dao")
  ) {
    return "governance";
  }
  if (
    lower.includes("compare") ||
    lower.includes("research") ||
    lower.includes("analysis") ||
    lower.includes("versus")
  ) {
    return "research";
  }
  return "general";
}

// ── Balance Fetching ─────────────────────────────────────────────────────────

async function fetchWalletBalance(walletAddress: string): Promise<string> {
  try {
    const eth = getProvider();
    if (!eth) return "";
    const balanceHex = await eth.request({
      method: "eth_getBalance",
      params: [walletAddress, "latest"],
    });
    const balanceWei = BigInt(balanceHex);
    const balanceGen = Number(balanceWei) / 1e18;
    return `GEN: ${balanceGen.toFixed(4)} (${balanceWei.toString()} wei)`;
  } catch {
    return "";
  }
}

// ── Main API: Write Transaction ─────────────────────────────────────────────

/**
 * Send write TX to GenLayer. Returns immediately after ACCEPTED.
 * The caller should poll get_analysis() separately.
 */
export async function sendToGenLayer(
  query: string,
  walletAddress?: string,
  balanceData?: string,
): Promise<{ response: string; txHash?: string; analysisKey: string }> {
  const contractAddress = getContractAddress();

  console.log("[Aurelia] Contract address:", contractAddress);
  console.log("[Aurelia] Wallet:", walletAddress);

  if (!contractAddress) {
    console.log("[Aurelia] No contract address, using demo mode");
    return { ...generateDemoResponse(query), analysisKey: "" };
  }

  if (!walletAddress) {
    console.log("[Aurelia] No wallet connected, using demo mode");
    return { ...generateDemoResponse(query), analysisKey: "" };
  }

  try {
    const client = await getClient(walletAddress);

    const analysisType = detectAnalysisType(query);
    console.log("[Aurelia] Analysis type:", analysisType);

    let functionName: string;
    let args: string[];
    let analysisKey: string;

    switch (analysisType) {
      case "token":
        functionName = "analyze_token";
        args = [query];
        analysisKey = query; // contract address is the key
        break;
      case "wallet": {
        functionName = "analyze_wallet";
        const bal = balanceData || await fetchWalletBalance(walletAddress);
        args = bal ? [walletAddress, bal] : [walletAddress];
        analysisKey = walletAddress;
        break;
      }
      case "contract":
        functionName = "translate_contract";
        args = [query];
        analysisKey = ""; // resolved after TX
        break;
      case "scam":
        functionName = "detect_scam";
        args = [query, ""];
        analysisKey = query;
        break;
      case "defi":
        functionName = "defi_advisor";
        args = [query];
        analysisKey = ""; // resolved after TX
        break;
      case "governance":
        functionName = "interpret_governance";
        args = [query];
        analysisKey = ""; // resolved after TX
        break;
      case "research":
        functionName = "research_comparison";
        args = [query];
        analysisKey = ""; // resolved after TX
        break;
      case "general":
        functionName = "ask_genlayer";
        args = [query];
        analysisKey = ""; // resolved after TX
        break;
      case "portfolio":
        functionName = "analyze_portfolio";
        args = [walletAddress];
        analysisKey = walletAddress;
        break;
    }

    const keyPrefix: Record<string, string> = {
      contract: "translate",
      defi: "defi",
      governance: "gov",
      research: "research",
      general: "chat",
    };

    console.log("[Aurelia] Calling:", functionName, "with args:", args);

    // Fire TX — MetaMask popup for signature
    console.log("[Aurelia] Sending writeContract TX...");
    const txHash = await writeContractFn(client, functionName, args);

    // Resolve dynamic analysisKey from request_counter
    if (!analysisKey) {
      const prefix = keyPrefix[analysisType];
      if (prefix) {
        const count = await readContractFn(getReadClient(), "get_request_count", []);
        const n = Number(count);
        analysisKey = `${prefix}_${n - 1}`;
      }
    }

    console.log(`[Aurelia] Analysis key: ${analysisKey}`);

    return {
      response: "",
      txHash,
      analysisKey,
    };
  } catch (error) {
    console.error("[Aurelia] GenLayer error:", error);
    return {
      response: `**Error connecting to GenLayer**\n\n${error instanceof Error ? error.message : "Unknown error"}\n\n**Troubleshooting:**\n1. Connect your EVM wallet (MetaMask, Rabby, etc.) to Bradbury network\n2. Check if you have GEN tokens for gas\n3. Verify contract address: ${contractAddress}\n\n**Network Config:**\n- Chain: testnetBradbury\n- Chain ID: 4221\n\n*Falling back to demo mode*`,
      txHash: "",
      analysisKey: "",
    };
  }
}

// ── Realtime Polling System ──────────────────────────────────────────────────

type PollCallback<T> = (data: T | null) => void;
type PollUnsubscribe = () => void;

/**
 * Subscribe to realtime analysis updates.
 * Polls get_analysis(address) every 3 seconds.
 * Detects new data by checking analyzed_at timestamp.
 */
export function subscribeToAnalysis(
  address: string,
  callback: PollCallback<any>,
  intervalMs = 10000,
): PollUnsubscribe {
  let lastResult: string = "";
  let active = true;
  let attempt = 0;

  const poll = async () => {
    if (!active) return;
    try {
      const raw = await readContractFn(getReadClient(), "get_analysis", [address]);
      if (!raw || !active) return;

      const str = typeof raw === "string" ? raw : JSON.stringify(raw);
      if (str !== lastResult && str.trim() !== "" && str !== '""' && str !== "{}") {
        try {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (parsed && typeof parsed === "object") {
            lastResult = str;
            callback(parsed);
          }
        } catch {
          // parse failed — ignore
        }
      }
      attempt = 0;
    } catch (e: any) {
      console.warn("[Aurelia] Poll error:", e.message);
      attempt++;
    }
    if (active) {
      const wait = Math.min(intervalMs * Math.pow(1.5, attempt), 60000);
      setTimeout(poll, wait);
    }
  };

  poll();
  return () => {
    active = false;
  };
}

// ── Demo Data ────────────────────────────────────────────────────────────────

function generateDemoResponse(query: string): { response: string } {
  const lower = query.toLowerCase();

  if (
    lower.includes("token") &&
    (lower.includes("safe") || lower.includes("scam") || lower.includes("honeypot"))
  ) {
    return {
      response: `**Token Safety Analysis** (Demo Mode)\n\nRisk Score: **78/100** (Caution)\n\n**Checklist:**\n- Ownership Renounced: Yes\n- Mint Function: None\n- Blacklist: None\n- Liquidity Locked: Yes (365 days)\n- Top 5 Holders: 31%\n- Honeypot Risk: Low\n\n**Warnings:**\n- Owner can still mint tokens\n- 62% supply held by 5 wallets\n\n**Summary:** Token has moderate risk. Some centralization concerns but generally safe.\n\n*Powered by GenLayer AI Consensus*`,
    };
  }

  if (lower.includes("wallet") || lower.includes("portfolio") || lower.includes("balance")) {
    return {
      response: `**Wallet Analysis** (Demo Mode)\n\n**Portfolio Value:** $0.00\n**Asset Count:** 0\n**30D PnL:** $0.00\n**Risk Level:** Low\n\n**Summary:** No real data available in demo mode. Connect to GenLayer for accurate on-chain analysis.\n\n*Powered by GenLayer AI Consensus*`,
    };
  }

  if (lower.includes("contract") || lower.includes("explain") || lower.includes("code")) {
    return {
      response: `**Smart Contract Translation** (Demo Mode)\n\nThis function allows the position owner to close their trade.\n\n**What it does:**\n1. Checks you actually own the position\n2. Calculates the payout amount\n3. Sends the tokens back to your wallet\n\n**Security Notes:**\n- Uses reentrancy guard\n- Requires owner authorization\n\n**User Warnings:**\n- Functions may fail if insufficient gas\n- Check approval before calling\n\n*Translated by Aurelia using GenLayer AI*`,
    };
  }

  if (lower.includes("scam") || lower.includes("fraud") || lower.includes("phishing")) {
    return {
      response: `**Scam Detection Report** (Demo Mode)\n\nRisk Level: **High** (Score: 85/100)\n\n**Red Flags:**\n- Website domain only 5 days old\n- Contract has blacklist function\n- No liquidity lock\n- Anonymous team\n\n**Recommendation:** Do Not Interact\n\n**Summary:** Multiple high-risk indicators detected. Avoid this project.\n\n*Analyzed by Aurelia using GenLayer AI Consensus*`,
    };
  }

  if (lower.includes("defi") || lower.includes("staking") || lower.includes("yield")) {
    return {
      response: `**DeFi Yield Opportunities** (Demo Mode)\n\n**Top Recommendations:**\n\n1. **Aave USDC** - APR: 5.32% | TVL: $1.2B | Risk: Low\n2. **Lido stETH** - APR: 3.84% | TVL: $22.4B | Risk: Low\n3. **GEN-ETH LP** - APR: 42.15% | TVL: $48M | Risk: High\n4. **Pendle PT-eETH** - APR: 18.6% | TVL: $320M | Risk: Medium\n\n**Market Sentiment:** Neutral\n\n*Recommended by Aurelia DeFi Advisor*`,
    };
  }

  if (lower.includes("governance") || lower.includes("proposal")) {
    return {
      response: `**Governance Proposal Analysis** (Demo Mode)\n\n**Proposal:** GIP-026 - Enable cross-chain GEN bridge\n\n**Summary:**\nThis proposal aims to enable cross-chain bridging for GEN token, allowing users to move GEN between GenLayer and other supported chains.\n\n**Impact:**\n- Token Economics: Increased liquidity and accessibility\n- Community: Better cross-chain experience\n- Protocol: New bridge infrastructure needed\n\n**Voting Status:**\n- For: 54%\n- Against: 38%\n- Pending: 8%\n\n*Interpreted by Aurelia Governance AI*`,
    };
  }

  return {
    response: `**Demo Mode**\n\nI understand your query: "${query}"\n\nTo get live analysis powered by GenLayer AI Consensus:\n\n1. Connect your wallet to Bradbury network\n2. Make sure you have GEN tokens\n3. Try again\n\n**Network:**\n- RPC: https://rpc-bradbury.genlayer.com\n- Chain ID: 4221\n- Explorer: https://explorer-bradbury.genlayer.com\n\n*Aurelia - The Golden Oracle of Web3*`,
  };
}
