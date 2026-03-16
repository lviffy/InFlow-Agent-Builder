"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Send, Loader2, ChevronDown, ChevronUp, Wrench, ArrowLeft, ArrowRight, CircleDot, Fingerprint, AtSign, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { UserProfile } from "@/components/user-profile"
import { useAuth } from "@/lib/auth"
import { getAgentById } from "@/lib/agents"
import { sendChatWithMemory } from "@/lib/backend"
import type { Agent } from "@/lib/supabase"
import type { AgentChatResponse } from "@/lib/types"
import { getTxExplorerUrl } from "@/lib/onechain"
import { useCurrentAccount } from "@mysten/dapp-kit"

interface ToolCallInfo {
  tool: string
  parameters: Record<string, any>
}

interface ToolResultInfo {
  success: boolean
  tool: string
  result: any
  error?: string
}

interface ToolResults {
  tool_calls: ToolCallInfo[]
  results: ToolResultInfo[]
  routing_plan?: any
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  conversationId?: string
  toolResults?: ToolResults
}

function ToolDetailsView({ toolResults }: { toolResults: ToolResults }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!toolResults?.tool_calls?.length) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors">
          <Wrench className="h-3 w-3" />
          <span>{toolResults.tool_calls.length} tool call{toolResults.tool_calls.length > 1 ? "s" : ""}</span>
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {toolResults.tool_calls.map((toolCall, index) => {
          const result = toolResults.results[index]
          return (
            <div key={index} className="rounded-md border border-neutral-800 bg-neutral-950/60 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-800 bg-neutral-900/60">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono border-neutral-700 text-neutral-200">
                  {toolCall.tool}
                </Badge>
                <ArrowRight className="h-2.5 w-2.5 text-neutral-500" />
                <span className="text-[10px] font-medium text-neutral-400">
                  {result?.success ? "ok" : "err"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
                <div className="p-2">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-medium">Request</span>
                  <pre className="mt-1 text-[10px] font-mono text-neutral-300 whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(toolCall.parameters || {}, null, 2)}
                  </pre>
                </div>
                <div className="p-2 overflow-hidden">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-medium">Response</span>
                  <div className="mt-1 max-h-[160px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <pre className="text-[10px] font-mono text-neutral-300 whitespace-pre-wrap break-all leading-relaxed">
                      {result?.error
                        ? JSON.stringify({ error: result.error }, null, 2)
                        : JSON.stringify(result?.result || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}

function formatContent(content: string): string {
  // Clean up AI thinking / reasoning that leaks into the response
  let cleaned = content
    // Remove lines like "The user wants to..." or "I need to use the send_email tool..."
    .replace(/^(The user wants to[\s\S]*?(?:\n\n|$))/m, '')
    .replace(/^(I need to use the \w+ tool[\s\S]*?(?:\n\n|$))/m, '')
    .replace(/^(I'?ll compose[\s\S]*?(?:\n\n|$))/m, '')
    // Remove standalone raw JSON blocks that aren't in code fences
    .replace(/^\{\n\s+"to":[\s\S]*?^\}$/gm, '')
    // Remove duplicate JSON echo like {"to": "...", "subject": "...", "body": "..."}
    .replace(/^\{"to":\s*"[^"]+",\s*"subject":\s*"[^"]+",\s*"(?:body|text)":\s*"[^"]*"\}$/gm, '')
    // Trim leading/trailing whitespace and collapse excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return cleaned
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:text-foreground/80 transition-colors">$1</a>')
    .replace(/(https?:\/\/[^\s<]+)/g, (match) => {
      if (match.includes('href="')) return match
      return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:text-foreground/80 transition-colors">${match}</a>`
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/```(?:json)?\n([\s\S]*?)\n```/g, (_, code) => {
      return `<pre class="mt-2 rounded border border-neutral-800 bg-neutral-900/60 p-2.5 font-mono text-[11px] overflow-x-auto leading-relaxed">${code}</pre>`
    })
    .replace(/`([^`]+)`/g, '<code class="bg-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
}

function getSuggestedPrompt(tool: string): string {
  const prompts: Record<string, string> = {
    transfer: "Send 1 OCT to…",
    get_balance: "Check my balance",
    get_usdo_balance: "Check my USDO balance",
    fetch_price: "What's the OCT price?",
    deploy_token: "Deploy a new token",
    deploy_nft_collection: "Deploy an NFT collection",
    mint_nft: "Mint an NFT",
    airdrop: "Airdrop tokens",
    send_email: "Send an email",
    create_dao: "Create a DAO",
    create_proposal: "Create a proposal",
    vote_on_proposal: "Vote on a proposal",
    swap_tokens: "Swap OCT for USDT",
    get_swap_quote: "Quote OCT → USDT",
    condition_check: "Check a condition",
    wallet_history: "Show my transactions",
    tx_status: "Check a transaction",
    check_oneid: "Check ONEID",
    check_ons: "Resolve a .one name",
    cross_border_transfer: "Send a cross-border payment",
  }
  return prompts[tool] ?? `Use ${tool}`
}

export default function AgentChatPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.agentId as string
  const { logout, dbUser, privyWalletAddress } = useAuth()
  const account = useCurrentAccount()

  const [agent, setAgent] = useState<Agent | null>(null)
  const [loadingAgent, setLoadingAgent] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // On OneChain the backend handles transaction signing server-side via the stored secret key.
  // Client-side signing is removed — just return the digest from the backend response.
  const handleMetaMaskTransaction = async (_txData: any): Promise<string> => {
    throw new Error("Client-side signing not supported. Transactions are signed by the backend keypair.")
  }

  useEffect(() => {
    const loadAgent = async () => {
      if (!agentId) { router.push("/my-agents"); return }
      try {
        const agentData = await getAgentById(agentId)
        if (!agentData) {
          toast({ title: "Agent not found", description: "The agent you're looking for doesn't exist", variant: "destructive" })
          router.push("/my-agents")
          return
        }
        setAgent(agentData)
      } catch (error: any) {
        console.error("Error loading agent:", error)
        toast({ title: "Error", description: "Failed to load agent", variant: "destructive" })
        router.push("/my-agents")
      } finally {
        setLoadingAgent(false)
      }
    }
    loadAgent()
  }, [agentId, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!loadingAgent && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [loadingAgent])

  const handleSend = async () => {
    if (!input.trim() || isLoading || !agent || !dbUser?.id) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    const userQuery = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      const data = await sendChatWithMemory({
        agentId: agent.id,
        userId: dbUser.id,
        message: userQuery,
        conversationId: conversationId,
        systemPrompt: `You are a helpful AI assistant for blockchain operations. The agent has these tools: ${agent.tools?.map((t) => t.tool).join(", ")}`,
        walletAddress: privyWalletAddress || account?.address || undefined,
      })

      if (data.isNewConversation) {
        setConversationId(data.conversationId)
      }

      // Check if any tool results require MetaMask signing
      let finalMessage = data.message
      if (data.toolResults?.results) {
        for (const result of data.toolResults.results) {
          if (result.success && result.result?.requiresMetaMask && result.result?.transaction) {
            try {
              // Show signing prompt
              toast({
                title: "Transaction Signing",
                description: "Please confirm the transaction in your wallet...",
              })

              const txHash = await handleMetaMaskTransaction(result.result)
              
              // Update message with transaction hash
              const explorerUrl = getTxExplorerUrl(txHash)
              finalMessage += `\n\n✅ Transaction confirmed!\nTransaction Hash: [${txHash.slice(0, 10)}...${txHash.slice(-8)}](${explorerUrl})`
              
              toast({
                title: "Success",
                description: "Transaction confirmed on blockchain",
              })
            } catch (error: any) {
              finalMessage += `\n\n❌ Transaction failed: ${error.message}`
              toast({
                title: "Transaction Failed",
                description: error.message,
                variant: "destructive",
              })
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalMessage,
        timestamp: new Date(),
        conversationId: data.conversationId,
        toolResults: data.toolResults,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${error.message || "Failed to get response from agent"}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      toast({ title: "Error", description: error.message || "Failed to chat with agent", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loadingAgent) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!agent) return null

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="shrink-0 border-b border-neutral-800">
          <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => router.push("/my-agents")}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Back</p></TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-4 bg-neutral-700" />
              <span className="text-sm font-medium text-neutral-100">{agent.name}</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 font-normal bg-neutral-800 text-neutral-200 border border-neutral-700">
                {agent.tools?.length || 0} {(agent.tools?.length || 0) === 1 ? "tool" : "tools"}
              </Badge>
              {agent.gas_budget != null && agent.gas_budget > 0 && (
                <Badge className="text-[10px] h-4 px-1.5 py-0 font-normal bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
                  ⛽ {agent.gas_budget} OCT sponsored
                </Badge>
              )}
            </div>
            <UserProfile
              onLogout={() => {
                logout()
                router.push("/")
              }}
            />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto max-w-2xl px-4 py-6">
            {messages.length === 0 && (
              <div className="flex min-h-[65vh] items-center justify-center">
                <div className="text-center space-y-4 max-w-sm">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border">
                    <CircleDot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-100">{agent.name}</p>
                    {(dbUser?.ons_name || dbUser?.did) && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1">
                        {dbUser.ons_name
                          ? <><AtSign className="h-2.5 w-2.5" />{dbUser.ons_name}</>
                          : <><Fingerprint className="h-2.5 w-2.5" />DID #{dbUser.did}</>}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{agent.description || "Send a message to begin."}</p>
                  </div>
                  {agent.tools && agent.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {agent.tools.slice(0, 4).map((t, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(getSuggestedPrompt(t.tool))}
                          className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900/70 px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
                        >
                          <Zap className="h-2.5 w-2.5" />
                          {getSuggestedPrompt(t.tool)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] min-w-0 rounded-2xl px-4 py-2.5 break-words",
                      message.role === "user"
                        ? "bg-neutral-200 text-neutral-900 rounded-br-md"
                        : "bg-neutral-900/60 text-neutral-100 border border-neutral-800 rounded-bl-md"
                    )}
                  >
                    <div
                      className="text-sm leading-relaxed whitespace-pre-wrap break-words [&_a]:underline [&_a]:underline-offset-2"
                      dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                    />

                    {message.role === "assistant" && message.toolResults && (
                      <ToolDetailsView toolResults={message.toolResults} />
                    )}

                    <div
                      className={cn(
                        "text-[10px] mt-1.5",
                        message.role === "user" ? "text-neutral-600" : "text-neutral-500"
                      )}
                    >
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl rounded-bl-md px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Thinking…</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input */}
        <footer className="shrink-0 border-t border-neutral-800 bg-background">
          <div className="mx-auto flex max-w-2xl items-end gap-2 px-4 py-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-lg border-neutral-700 bg-neutral-900/50 px-3 py-2.5 text-sm placeholder:text-neutral-500 focus-visible:bg-neutral-950 focus-visible:ring-1 focus-visible:ring-neutral-500"
              disabled={isLoading || !dbUser?.id}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || !dbUser?.id}
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-lg bg-neutral-200 text-neutral-900 hover:bg-neutral-300"
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Send</p></TooltipContent>
            </Tooltip>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}