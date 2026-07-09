<h1 align="center">
  <img src="public/favicon.svg" width="35" height="35" style="vertical-align:middle;margin-right:8px" alt="Aurelia">
  AURELIA
</h1>

<p align="center">
  <strong>The Golden Oracle of Web3</strong><br />
  <em>"Ask Anything. Understand Everything."</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TanStack%20Start-latest-FF4154?logo=reactrouter" alt="TanStack Start" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/GenLayer-Bradbury-8B5CF6" alt="GenLayer Bradbury" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## 🔮 What Is Aurelia?

Blockchain holds billions of data points — wallets, smart contracts, tokens, NFTs, governance, validators, staking, bridges, DeFi. But that data is hard to understand.

**Aurelia turns blockchain data into human conversation.**

Instead of jumping between explorers, dashboards, and analytics tools, just ask:

```
💬 "What happened to my wallet this week?"
💬 "Is this token safe?"
💬 "Explain this contract."
💬 "What is GenLayer?"
```

Aurelia answers — powered by **GenLayer AI Consensus**, where every response is verified by a network of validators.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 👛 **Wallet Intelligence** | Portfolio analysis, PnL, wallet activity |
| 🛡️ **Token Risk Analyzer** | Check token safety: honeypot, mint, blacklist, liquidity |
| 📄 **Smart Contract Translator** | Translate contract code to plain English |
| 🚨 **Scam Detector** | Detect scams by contract, website, wallet |
| 📈 **AI DeFi Advisor** | Staking/yield recommendations by APR, TVL, risk |
| 🗳️ **Governance Interpreter** | Summarize and explain governance proposals |
| 💼 **Portfolio AI** | Portfolio score, diversification, risk analysis |
| 🔬 **Blockchain Research** | Compare blockchains and on-chain metrics |
| 💾 **On-Chain Memory** | Store analysis results on-chain for repeat queries |
| 🤖 **Ask Anything** | Ask any blockchain question — BTC, ETH, DeFi, NFT, etc |

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────┐
│                 FRONTEND                    │
│    React 19 · TanStack Start · Tailwind v4  │
│         Radix UI · GenLayerJS SDK           │
└─────────────────────┬───────────────────────┘
                      │ writeContract / readContract
                      ▼
┌─────────────────────────────────────────────┐
│          AURELIAORACLE.PY                   │
│     GenLayer Intelligent Contract           │
│  wallet · token · defi · governance · chat  │
└─────────────────────┬───────────────────────┘
                      │ run_nondet_unsafe
                      ▼
┌─────────────────────────────────────────────┐
│         GENLAYER AI CONSENSUS               │
│   LLM Validators · Equivalence Principle    │
└─────────────────────┬───────────────────────┘
                      │ verified result
                      ▼
┌─────────────────────────────────────────────┐
│            BLOCKCHAIN DATA                  │
│  Wallets · Tokens · Contracts · DeFi · Gov  │
└─────────────────────────────────────────────┘
```

---

## 🧰 Tech Stack

### Frontend
| | |
|---|---|
| **Framework** | React 19 + TanStack Start (SSR) |
| **Styling** | Tailwind CSS v4 |
| **UI** | Radix UI + shadcn/ui |
| **State** | TanStack Query |
| **Wallet** | MetaMask (ethers.js) |
| **Build** | Vite + Nitro |

### Smart Contract
| | |
|---|---|
| **Platform** | GenLayer (Testnet Bradbury) |
| **Chain ID** | 4221 |
| **RPC** | `https://rpc-bradbury.genlayer.com` |
| **Language** | Python (GenVM) |
| **Consensus** | AI Consensus (Optimistic Democracy) |
| **Contract** | `0x73a017D6C51cb3a231097d1d5e6309FA4339F17c` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- GenLayer CLI: `npm install -g genlayer`
- MetaMask with Bradbury network

### Install & Run

```bash
git clone https://github.com/dhozil/aurelia.git
cd aurelia
npm install
npm run dev
```

### Deploy Contract

```bash
# Set network
genlayer network testnet-bradbury

# Get testnet GEN (https://testnet-faucet.genlayer.foundation/)

# Deploy
genlayer deploy contracts/AureliaOracle.py

# Update address in src/lib/genlayer-service.ts
```

---

## 📁 Project Structure

```
aurelia/
├── contracts/
│   └── AureliaOracle.py         # GenLayer contract (all-in-one)
├── src/
│   ├── components/
│   │   ├── aurelia/
│   │   │   ├── AureliaApp.tsx   # Main app
│   │   │   ├── views.tsx        # All analysis views
│   │   │   └── wallet.ts        # MetaMask hook
│   │   └── ui/                   # shadcn/ui primitives
│   ├── hooks/                    # React hooks (crypto, analysis)
│   ├── lib/                      # genlayer-service, crypto-api, storage
│   ├── assets/                   # Static assets
│   ├── routes/                   # TanStack Router
│   ├── router.tsx
│   ├── server.ts
│   └── styles.css
├── vercel.json
├── vite.config.ts
└── package.json
```

---

## 📋 Smart Contract API

### `AureliaOracle.py`

| Method | Type | Description |
|--------|------|-------------|
| `analyze_token(contract_address)` | write | Token safety analysis |
| `analyze_wallet(address, balance?)` | write | Wallet portfolio analysis |
| `translate_contract(code)` | write | Translate contract to plain language |
| `detect_scam(contract, website)` | write | Scam detection |
| `defi_advisor(query)` | write | DeFi yield advisory |
| `interpret_governance(proposal)` | write | Governance interpretation |
| `analyze_portfolio(address)` | write | Portfolio analysis |
| `research_comparison(query)` | write | Blockchain comparison |
| `ask_genlayer(query)` | write | Ask anything about blockchain |
| `get_analysis(key)` | view | Get stored analysis result |
| `get_request_count()` | view | Total request count |
| `get_request(req_id)` | view | Request details by ID |

---

## 💻 Frontend Integration

```typescript
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });

// Write — triggers AI consensus
const txHash = await client.writeContract({
  address: "0x73a017D6C51cb3a231097d1d5e6309FA4339F17c",
  functionName: "analyze_token",
  args: ["0x..."],
});

// Wait for ACCEPTED
await client.waitForTransactionReceipt({ hash: txHash, retries: 60, interval: 10000 });

// Read result
const result = await client.readContract({
  address: contractAddress,
  functionName: "get_analysis",
  args: ["0x..."],
});
```

---

## 🧪 Testing

```bash
npm run lint       # ESLint
npm run build      # TypeScript + Vite build
```

---

## 🗺️ Roadmap

- [x] UI Development
- [x] Smart Contract (GenLayer)
- [x] GenLayer Testnet Deployment
- [x] MetaMask Integration
- [ ] Live Blockchain Data Integration
- [ ] Knowledge Base (blockchain data folder)
- [ ] GenLayer Mainnet Launch
- [ ] Multi-chain Support

---

## 📄 License

MIT

---

<p align="center">
  <em>Built with GenLayer AI Consensus</em>
</p>
