import { useEffect, useState } from "react";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

const BRADBURY_CHAIN_ID = "0x107d";
const BRADBURY_NETWORK = {
  chainId: BRADBURY_CHAIN_ID,
  chainName: "GenLayer Bradbury",
  nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"],
};

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isBradbury, setIsBradbury] = useState(false);
  const [walletLabel, setWalletLabel] = useState<string>("EVM Wallet");

  // Detect wallet name
  const detectWallet = () => {
    const eth = window.ethereum as any;
    if (!eth) return "EVM Wallet";
    if (eth.isMetaMask) return "MetaMask";
    if (eth.isRabby) return "Rabby";
    if (eth.isCoinbaseWallet) return "Coinbase Wallet";
    if (eth.isTrust) return "Trust Wallet";
    if (eth.isBraveWallet) return "Brave Wallet";
    if (eth.isOKXWallet) return "OKX Wallet";
    return "EVM Wallet";
  };

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

    setWalletLabel(detectWallet());

    eth
      .request({ method: "eth_accounts" })
      .then((accs) => {
        const a = (accs as string[])?.[0];
        if (a) setAddress(a);
      })
      .catch(() => {});

    eth
      .request({ method: "eth_chainId" })
      .then((id) => {
        const hexId = id as string;
        setChainId(hexId);
        setIsBradbury(hexId === BRADBURY_CHAIN_ID);
      })
      .catch(() => {});

    const handleAccounts = (...args: unknown[]) => {
      const accs = args[0] as string[];
      setAddress(accs?.[0] ?? null);
      // Re-detect wallet when account changes (wallet might have changed)
      setWalletLabel(detectWallet());
    };

    const handleChain = (...args: unknown[]) => {
      const id = args[0] as string;
      setChainId(id);
      setIsBradbury(id === BRADBURY_CHAIN_ID);
    };

    eth.on?.("accountsChanged", handleAccounts);
    eth.on?.("chainChanged", handleChain);

    return () => {
      eth.removeListener?.("accountsChanged", handleAccounts);
      eth.removeListener?.("chainChanged", handleChain);
    };
  }, []);

  const connect = async () => {
    setError(null);
    const eth = window.ethereum;
    if (!eth) {
      setError("No EVM wallet detected");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    try {
      setConnecting(true);
      setWalletLabel(detectWallet());
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAddress(accs?.[0] ?? null);

      const currentChainId = (await eth.request({ method: "eth_chainId" })) as string;
      if (currentChainId !== BRADBURY_CHAIN_ID) {
        await switchToBradbury();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const switchToBradbury = async () => {
    const eth = window.ethereum;
    if (!eth) return;

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BRADBURY_CHAIN_ID }],
      });
    } catch (switchError: unknown) {
      if ((switchError as { code?: number }).code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [BRADBURY_NETWORK],
          });
        } catch (addError) {
          setError("Failed to add Bradbury network");
          console.error(addError);
        }
      }
    }
  };

  const disconnect = () => {
    setAddress(null);
  };

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return {
    address,
    short,
    connect,
    disconnect,
    connecting,
    error,
    chainId,
    isBradbury,
    switchToBradbury,
    walletLabel,
  };
}