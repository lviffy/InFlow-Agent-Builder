"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getTxExplorerUrl } from "@/lib/onechain";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (executionToken: string, paymentId: string) => void;
  toolName: string;
  toolDisplayName: string;
  price: number; // OCT amount
  description?: string;
  agentId?: string;
}

type PaymentStep = "idle" | "paying" | "verifying" | "success" | "error";

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  toolName,
  toolDisplayName,
  price,
  description,
  agentId,
}: PaymentModalProps) {
  const account = useCurrentAccount();
  const authenticated = !!account;
  const userId = account?.address ?? null;

  const [step, setStep] = useState<PaymentStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep("idle");
      setError(null);
      setTxHash(null);
    }
  }, [isOpen]);

  const handlePayment = async () => {
    if (!authenticated || !userId) {
      // Prompt user to use ConnectButton from @mysten/dapp-kit
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setError(null);
      setStep("paying");

      const payResponse = await fetch("/api/payments/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, agentId, toolName, octAmount: price.toString() }),
      });

      if (!payResponse.ok) {
        const err = await payResponse.json();
        throw new Error(err.error || "Payment failed");
      }

      const payData = await payResponse.json();
      setTxHash(payData.digest ?? null);

      // Verify payment
      setStep("verifying");
      const verifyResponse = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentHash: payData.digest, userId, agentId, toolName }),
      });

      if (!verifyResponse.ok) {
        const errData = await verifyResponse.json();
        throw new Error(errData.error || "Payment verification failed");
      }

      const data = await verifyResponse.json();
      setStep("success");
      toast.success("Payment successful! 🎉");

      setTimeout(() => {
        onSuccess(data.executionToken, data.paymentId);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Payment error:", err);
      setStep("error");
      setError(err.message || "Payment failed");
      toast.error(err.message || "Payment failed");
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case "paying":    return "Processing payment on OneChain...";
      case "verifying": return "Verifying payment on blockchain...";
      case "success":   return "Payment successful! 🎉";
      case "error":     return error || "Something went wrong";
      default:          return "";
    }
  };

  const isProcessing = ["paying", "verifying"].includes(step);
  const isComplete = step === "success";
  const hasError = step === "error";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">💳</span>
            Payment Required
          </DialogTitle>
          <DialogDescription>Secure payment on OneChain</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 dark:bg-muted/20 p-4">
            <h3 className="font-semibold text-lg mb-1">{toolDisplayName}</h3>
            {description && <p className="text-sm text-muted-foreground mb-3">{description}</p>}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{price.toFixed(4)}</span>
              <span className="text-muted-foreground">OCT</span>
            </div>
          </div>

          {step !== "idle" && (
            <div className={`rounded-lg p-4 ${
              hasError ? "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200"
              : isComplete ? "bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200"
              : "bg-secondary/20 dark:bg-secondary/20 text-accent-foreground dark:text-foreground"
            }`}>
              <div className="flex items-center gap-3">
                {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
                {isComplete && <CheckCircle className="h-5 w-5" />}
                {hasError && <XCircle className="h-5 w-5" />}
                <span className="text-sm font-medium">{getStepMessage()}</span>
              </div>
            </div>
          )}

          {txHash && (
            <a href={getTxExplorerUrl(txHash)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 dark:text-secondary">
              View transaction on OneChain Explorer
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xl">🛡️</span>
            <div>
              <div className="font-medium text-foreground">Escrow Protection</div>
              <div className="text-xs">Funds held securely until service delivered</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={isProcessing || isComplete} className="flex-1">
            {isProcessing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
            ) : isComplete ? "Complete!" : authenticated ? "Pay with Wallet" : "Connect Wallet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
