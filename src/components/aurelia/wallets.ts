export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface DetectedWallet extends WalletInfo {
  provider: NonNullable<Window['ethereum']>;
}

const WALLET_DEFS: WalletInfo[] = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊', color: '#F5841F' },
  { id: 'rabby', name: 'Rabby', icon: '🐰', color: '#8697FF' },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵', color: '#0052FF' },
  { id: 'brave', name: 'Brave Wallet', icon: '🦁', color: '#FB542B' },
  { id: 'trust', name: 'Trust Wallet', icon: '🛡️', color: '#3375BB' },
  { id: 'okx', name: 'OKX Wallet', icon: '🧩', color: '#1a8cff' },
];

export const INSTALL_URLS: Record<string, string> = {
  metamask: 'https://metamask.io/download/',
  rabby: 'https://rabby.io/',
  coinbase: 'https://www.coinbase.com/wallet',
  brave: 'https://brave.com/wallet/',
  trust: 'https://trustwallet.com/',
  okx: 'https://www.okx.com/web3',
};

const FLAG_MAP: Record<string, string> = {
  isMetaMask: 'metamask',
  isRabby: 'rabby',
  isCoinbaseWallet: 'coinbase',
  isBraveWallet: 'brave',
  isTrust: 'trust',
  isOKXWallet: 'okx',
};

export function detectWallets(): {
  detected: DetectedWallet[];
  undetected: WalletInfo[];
  hasWallet: boolean;
} {
  const eth = typeof window !== 'undefined' ? window.ethereum : undefined;
  const detected: DetectedWallet[] = [];
  const undetected: WalletInfo[] = [];

  if (eth) {
    for (const [flag, id] of Object.entries(FLAG_MAP)) {
      if ((eth as any)[flag]) {
        const def = WALLET_DEFS.find((w) => w.id === id);
        if (def) {
          detected.push({ ...def, provider: eth });
        }
      }
    }
    if (detected.length === 0) {
      detected.push({
        id: 'injected',
        name: 'Browser Wallet',
        icon: '🔗',
        color: '#6B7280',
        provider: eth,
      });
    }
  }

  for (const w of WALLET_DEFS) {
    if (!detected.some((d) => d.id === w.id)) {
      undetected.push(w);
    }
  }

  return { detected, undetected, hasWallet: !!eth };
}
