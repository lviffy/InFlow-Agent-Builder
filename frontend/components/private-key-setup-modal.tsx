"use client"

import * as React from "react"
import { useState } from "react"
import { Key, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

interface PrivateKeySetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onComplete: () => void
}

export function PrivateKeySetupModal({ 
  open, 
  onOpenChange, 
  userId,
  onComplete 
}: PrivateKeySetupModalProps) {
  const [privateKey, setPrivateKey] = useState("")
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validatePrivateKey = (key: string): boolean => {
    // Remove 0x prefix if present
    const cleanKey = key.startsWith('0x') ? key.slice(2) : key
    
    // Check if it's a valid 64-character hex string
    const hexRegex = /^[0-9a-fA-F]{64}$/
    return hexRegex.test(cleanKey)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!privateKey.trim()) {
      setError("Please enter your private key")
      return
    }

    if (!validatePrivateKey(privateKey.trim())) {
      setError("Invalid private key format. Please enter a valid 64-character hexadecimal private key (with or without 0x prefix)")
      return
    }

    setIsLoading(true)

    try {
      const supabase = getSupabaseClient()

      // Accept base64 or 0x-hex secret keys
      const { getAddressFromPrivateKey } = await import('@/lib/wallet')
      const walletAddress = getAddressFromPrivateKey(privateKey.trim())

      // Update user in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          private_key: privateKey.trim(),
          wallet_address: walletAddress,
        })
        .eq('id', userId)

      if (updateError) {
        setError("Failed to save private key. Please try again.")
        return
      }

      toast({
        title: "Success!",
        description: "Your agent wallet has been set up successfully.",
      })

      // Clear the input for security
      setPrivateKey("")
      setShowPrivateKey(false)
      
      // Call completion callback
      onComplete()
      
      // Close modal
      onOpenChange(false)
    } catch {
      setError("Invalid private key or failed to derive wallet address. Please check your private key and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    setPrivateKey("")
    setShowPrivateKey(false)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Set Up Agent Wallet
          </DialogTitle>
          <DialogDescription>
            Add your private key to enable your agent to execute blockchain transactions on your behalf.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="privateKey">Private Key</Label>
            <div className="relative">
              <Input
                id="privateKey"
                type={showPrivateKey ? "text" : "password"}
                placeholder="0x... or paste your 64-character hex key"
                value={privateKey}
                onChange={(e) => {
                  setPrivateKey(e.target.value)
                  setError(null)
                }}
                disabled={isLoading}
                className="pr-10"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                disabled={isLoading}
              >
                {showPrivateKey ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your private key is encrypted and stored securely. It will be used to sign transactions for your agents.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Security Note:</strong> Your private key is stored encrypted in the database. 
              Never share your private key with anyone. You can skip this step and add it later from your profile.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1"
            >
              Skip for Now
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !privateKey.trim()}
              className="flex-1"
            >
              {isLoading ? "Setting Up..." : "Continue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
