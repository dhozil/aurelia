<p align="center">
  <img src="src/assets/aurelia.jpg" alt="Aurelia" width="120" style="border-radius: 24px" />
</p>

<h1 align="center">AURELIA</h1>

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

## 🔮 Apa Itu Aurelia?

Blockchain menyimpan miliaran data — wallet, smart contract, token, NFT, governance, validator, staking, bridge, DeFi. Tapi data itu sulit dipahami.

**Aurelia mengubah data blockchain menjadi percakapan manusia.**

Daripada buka explorer, dashboard, dan analytics tool berbeda, cukup tanya:

```
💬 "Apa yang terjadi pada wallet saya minggu ini?"
💬 "Apakah token ini aman?"
💬 "Jelaskan kontrak ini."
💬 "Apa itu GenLayer?"
```

Aurelia akan menjawab — ditenagai **GenLayer AI Consensus** yang memverifikasi setiap jawaban oleh jaringan validator.

---

## ✨ Fitur

| Fitur | Deskripsi |
|-------|-----------|
| 👛 **Wallet Intelligence** | Analisis portfolio, PnL, aktivitas wallet |
| 🛡️ **Token Risk Analyzer** | Cek keamanan token: honeypot, mint, blacklist, liquidity |
| 📄 **Smart Contract Translator** | Terjemahkan kode kontrak ke bahasa manusia |
| 🚨 **Scam Detector** | Deteksi scam berdasarkan contract, website, wallet |
| 📈 **AI DeFi Advisor** | Rekomendasi staking/yield berdasarkan APR, TVL, risiko |
| 🗳️ **Governance Interpreter** | Ringkas dan jelaskan proposal governance |
| 💼 **Portfolio AI** | Analisis portfolio score, diversifikasi, risiko |
| 🔬 **Blockchain Research** | Bandingkan blockchain/metrik secara on-chain |
| 💾 **On-Chain Memory** | Simpan hasil analisis di blockchain untuk query berulang |
| 🤖 **Ask Anything** | Tanya apa pun tentang blockchain — BTC, ETH, DeFi, NFT, dll |

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
| **Contract** | `0x5598809D8B2D103B9488525a624D496918C0D0c4` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- GenLayer CLI: `npm install -g genlayer`
- MetaMask with Bradbury network

### Install & Run

```bash
git clone https://github.com/your-repo/aurelia.git
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
| `analyze_token(contract_address)` | write | Analisis keamanan token |
| `analyze_wallet(address, balance?)` | write | Analisis wallet portfolio |
| `translate_contract(code)` | write | Terjemahkan kode kontrak |
| `detect_scam(contract, website)` | write | Deteksi scam |
| `defi_advisor(query)` | write | Advisory DeFi yield |
| `interpret_governance(proposal)` | write | Interpretasi governance |
| `analyze_portfolio(address)` | write | Analisis portfolio |
| `research_comparison(query)` | write | Perbandingan blockchain |
| `ask_genlayer(query)` | write | Tanya apa pun tentang blockchain |
| `get_analysis(key)` | view | Ambil hasil analisis |
| `get_request_count()` | view | Total request |
| `get_request(req_id)` | view | Detail request by ID |

---

## 💻 Frontend Integration

```typescript
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });

// Write — triggers AI consensus
const txHash = await client.writeContract({
  address: "0x5598809D8B2D103B9488525a624D496918C0D0c4",
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
