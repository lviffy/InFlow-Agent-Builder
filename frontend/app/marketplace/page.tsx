"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Bot,
  Loader2,
  GitFork,
  AtSign,
  Fingerprint,
  ArrowLeft,
  Globe,
  Search,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { getPublicAgents, cloneAgent, type PublicAgent } from "@/lib/agents"
import { UserProfile } from "@/components/user-profile"
import { AgentWalletModal } from "@/components/agent-wallet"
import { toast } from "@/components/ui/use-toast"

const TOOL_LABELS: Record<string, string> = {
  transfer: "Transfer",
  get_balance: "Balance",
  get_usdo_balance: "USDO",
  deploy_token: "Token",
  deploy_nft_collection: "NFT Collection",
  mint_nft: "Mint NFT",
  airdrop: "Airdrop",
  fetch_price: "Price",
  send_email: "Email",
  condition_check: "Logic",
  yes_no_answer: "Vote",
  send_webhook: "Webhook",
  create_dao: "DAO",
  create_proposal: "Proposal",
  vote_on_proposal: "Vote",
  get_proposal: "Proposal",
  get_swap_quote: "Quote",
  swap_tokens: "Swap",
  get_dex_pools: "DEX Pools",
  get_dex_price: "DEX Price",
  cross_border_transfer: "Cross-Border",
  check_oneid: "ONEID",
  check_ons: "ONS",
  wallet_history: "History",
  tx_status: "Tx Status",
  token_metadata: "Token Info",
}

export default function Marketplace() {
  const router = useRouter()
  const { ready, authenticated, user, logout, isWalletLogin } = useAuth()
  const [agents, setAgents] = useState<PublicAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [cloning, setCloning] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [walletModalOpen, setWalletModalOpen] = useState(false)

  useEffect(() => {
    fetchPublic()
  }, [])

  const fetchPublic = async () => {
    setLoading(true)
    try {
      const data = await getPublicAgents()
      setAgents(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleClone = async (agent: PublicAgent) => {
    if (!authenticated || !user?.id) {
      toast({
        title: "Login required",
        description: "Connect your wallet to clone this agent.",
        variant: "destructive",
      })
      return
    }
    setCloning(agent.id)
    try {
      const cloned = await cloneAgent(user.id, agent)
      toast({
        title: "Agent cloned!",
        description: `"${cloned.name}" has been added to your agents.`,
      })
      router.push(`/agent-builder?agent=${cloned.id}`)
    } catch (err: any) {
      toast({ title: "Clone failed", description: err.message, variant: "destructive" })
    } finally {
      setCloning(null)
    }
  }

  const filtered = agents.filter((a) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      a.name.toLowerCase().includes(q) ||
      (a.description ?? "").toLowerCase().includes(q) ||
      a.tools.some((t) => t.tool.toLowerCase().includes(q))
    )
  })

  return (
    <TooltipProvider>
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-6 py-10">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-5 w-5 text-foreground/70" />
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Agent Marketplace
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Discover and clone public agents built by the community.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {ready && authenticated && (
                <>
                  <AgentWalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} hideButton={isWalletLogin} />
                  <UserProfile onLogout={logout} />
                </>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 text-xs font-medium">
              <Link href="/my-agents">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                My Agents
              </Link>
            </Button>
            <div className="flex-1" />
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search agents…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <Separator className="my-6" />

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-medium text-foreground">
                {agents.length === 0 ? "No public agents yet" : "No results"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                {agents.length === 0
                  ? "Be the first! Toggle \"Publish to Marketplace\" when saving an agent."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((agent) => (
                <div
                  key={agent.id}
                  className="group flex flex-col rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/40"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                      <Bot className="h-4 w-4 text-foreground/70" />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-medium shrink-0"
                          disabled={cloning === agent.id}
                          onClick={() => handleClone(agent)}
                        >
                          {cloning === agent.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <GitFork className="mr-1.5 h-3.5 w-3.5" />
                              Clone
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Copy to your agents and customise</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Name + badges */}
                  <div className="mt-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {agent.name}
                      </p>
                      {agent.marketplace_source === "template" && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 py-0 text-[10px] font-medium bg-neutral-800 text-neutral-200 border border-neutral-700"
                        >
                          Built-in
                        </Badge>
                      )}
                    </div>
                    {(agent.creator_ons_name || agent.creator_did) && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        {agent.creator_ons_name ? (
                          <><AtSign className="h-2.5 w-2.5" />{agent.creator_ons_name}</>
                        ) : (
                          <><Fingerprint className="h-2.5 w-2.5" />DID #{agent.creator_did}</>
                        )}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                      {agent.description || "No description"}
                    </p>
                  </div>

                  {/* Tool chips */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {agent.tools.slice(0, 6).map((t, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-[10px] font-normal px-1.5 py-0 h-4"
                      >
                        {TOOL_LABELS[t.tool] ?? t.tool}
                      </Badge>
                    ))}
                    {agent.tools.length > 6 && (
                      <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-4">
                        +{agent.tools.length - 6}
                      </Badge>
                    )}
                  </div>

                  {/* Gas badge */}
                  {agent.gas_budget != null && agent.gas_budget > 0 && (
                    <div className="mt-2">
                      <Badge className="text-[10px] font-normal px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
                        ⛽ {agent.gas_budget} OCT sponsored
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </TooltipProvider>
  )
}
