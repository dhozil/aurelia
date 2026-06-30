import { useEffect, useState, useCallback } from "react";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
};

declare global {
  interface Window {
    ethereum?: EthProvider;
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

export function useMetaMask() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isBradbury, setIsBradbury] = useState(false);
  const [showSnapWarning, setShowSnapWarning] = useState(false);

  // Check if wallet supports wallet_getSnaps (MetaMask with Snap support)
  const checkSnapSupport = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    try {
      await eth.request({ method: "wallet_getSnaps" });
      setShowSnapWarning(false);
    } catch {
      setShowSnapWarning(true);
    }
  }, []);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

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
      setError("MetaMask not installed");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    try {
      setConnecting(true);
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAddress(accs?.[0] ?? null);

      // Detect Snap support immediately after connecting
      await checkSnapSupport();

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
      } else {
        setError("Failed to switch to Bradbury network");
        console.error(switchError);
      }
    }
  };

  const disconnect = () => {
    setAddress(null);
    setShowSnapWarning(false);
  };

  const dismissSnapWarning = () => setShowSnapWarning(false);
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
    showSnapWarning,
    dismissSnapWarning,
  };
}
