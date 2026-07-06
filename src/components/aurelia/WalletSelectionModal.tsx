import { Wallet, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { detectWallets, INSTALL_URLS } from "./wallets";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnect: () => void;
  connecting: boolean;
}

export function WalletSelectionModal({ open, onOpenChange, onConnect, connecting }: Props) {
  const { detected, undetected, hasWallet } = detectWallets();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Connect your EVM wallet to interact with Aurelia on GenLayer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          {detected.length > 0 && (
            <>
              {detected.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    onConnect();
                    onOpenChange(false);
                  }}
                  disabled={connecting}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left transition hover:border-primary/50 hover:bg-primary/5 cursor-pointer disabled:opacity-50"
                >
                  <span
                    className="grid h-10 w-10 flex-none place-items-center rounded-xl text-lg"
                    style={{ backgroundColor: w.color + "20" }}
                  >
                    {w.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{w.name}</div>
                    <div className="text-xs text-muted-foreground">Detected · Click to connect</div>
                  </div>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </>
          )}

          {!hasWallet && (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/50 p-4 text-center">
              <Wallet className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No wallet detected</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Install a browser wallet to get started.
              </p>
            </div>
          )}

          {(!hasWallet || undetected.length > 0) && (
            <div className="mt-1">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Install a wallet
              </p>
              <div className="grid gap-2">
                {(hasWallet ? undetected : undetected).map((w) => (
                  <a
                    key={w.id}
                    href={INSTALL_URLS[w.id] || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-2.5 text-left text-sm transition hover:border-border/80 hover:bg-card"
                  >
                    <span
                      className="grid h-8 w-8 flex-none place-items-center rounded-lg text-base"
                      style={{ backgroundColor: w.color + "15" }}
                    >
                      {w.icon}
                    </span>
                    <span className="flex-1 font-medium">{w.name}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {detected.length === 0 && hasWallet && (
            <button
              onClick={() => {
                onConnect();
                onOpenChange(false);
              }}
              disabled={connecting}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left transition hover:border-primary/50 hover:bg-primary/5 cursor-pointer disabled:opacity-50"
            >
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Browser Wallet</div>
                <div className="text-xs text-muted-foreground">Click to connect</div>
              </div>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
