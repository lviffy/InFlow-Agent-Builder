"use client"

import type React from "react"
import { useState } from "react"
import {
  ArrowRightLeft,
  Wallet,
  Coins,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  FileText,
  Clock,
  History,
  Mail,
  ToggleLeft,
  ThumbsUp,
  Webhook,
  Users,
  ScrollText,
  Vote,
  ClipboardList,
  ArrowUpDown,
  Shuffle,
  LayoutGrid,
  BarChart2,
  Globe,
  ShieldCheck,
  Zap,
  AtSign,
} from "lucide-react"
import { AGENT_TEMPLATES, CATEGORY_LABELS } from "@/lib/agent-templates"
import type { AgentTemplate } from "@/lib/agent-templates"

const toolTypes = [
  {
    type: "transfer",
    label: "Transfer",
    description: "Transfer tokens or assets",
    icon: ArrowRightLeft,
  },
  {
    type: "get_balance",
    label: "Get Balance",
    description: "Get wallet balance",
    icon: Wallet,
  },
  {
    type: "get_usdo_balance",
    label: "Get USDO Balance",
    description: "Check USDO stablecoin balance",
    icon: Wallet,
  },
  {
    type: "deploy_token",
    label: "Deploy Token",
    description: "Deploy Move fungible token",
    icon: Coins,
  },
  {
    type: "deploy_nft_collection",
    label: "Deploy NFT",
    description: "Deploy Move NFT collection",
    icon: ImageIcon,
  },
  {
    type: "mint_nft",
    label: "Mint NFT",
    description: "Mint an NFT from a collection",
    icon: Sparkles,
  },
  {
    type: "fetch_price",
    label: "Fetch Price",
    description: "Fetch token price",
    icon: TrendingUp,
  },
  {
    type: "token_metadata",
    label: "Token Metadata",
    description: "Get token info",
    icon: FileText,
  },
  {
    type: "tx_status",
    label: "Transaction Status",
    description: "Check tx confirmations",
    icon: Clock,
  },
  {
    type: "wallet_history",
    label: "Wallet History",
    description: "Fetch recent transactions",
    icon: History,
  },
  {
    type: "send_email",
    label: "Send Email",
    description: "Send email notifications",
    icon: Mail,
  },
  {
    type: "condition_check",
    label: "Condition Check",
    description: "Evaluate true/false condition",
    icon: ToggleLeft,
  },
  {
    type: "yes_no_answer",
    label: "Yes / No",
    description: "Record a yes or no decision",
    icon: ThumbsUp,
  },
  {
    type: "send_webhook",
    label: "Send Webhook",
    description: "POST payload to a webhook URL",
    icon: Webhook,
  },
  {
    type: "create_dao",
    label: "Create DAO",
    description: "Deploy on-chain governance DAO",
    icon: Users,
  },
  {
    type: "create_proposal",
    label: "Create Proposal",
    description: "Submit a governance proposal",
    icon: ScrollText,
  },
  {
    type: "vote_on_proposal",
    label: "Vote",
    description: "Cast a yes/no/abstain vote",
    icon: Vote,
  },
  {
    type: "get_proposal",
    label: "Get Proposal",
    description: "Fetch proposal details & tally",
    icon: ClipboardList,
  },
  // ── OneChain Ecosystem ────────────────────────────────────────────────────
  {
    type: "get_swap_quote",
    label: "Swap Quote",
    description: "Get ONEDEX quote without trading",
    icon: ArrowUpDown,
  },
  {
    type: "swap_tokens",
    label: "Swap Tokens",
    description: "Execute swap on ONEDEX",
    icon: Shuffle,
  },
  {
    type: "get_dex_pools",
    label: "DEX Pools",
    description: "List ONEDEX liquidity pools",
    icon: LayoutGrid,
  },
  {
    type: "get_dex_price",
    label: "DEX Price",
    description: "Get on-chain token price",
    icon: BarChart2,
  },
  {
    type: "cross_border_transfer",
    label: "Cross-Border Transfer",
    description: "ONETRANSFER international payment",
    icon: Globe,
  },
  {
    type: "check_oneid",
    label: "Check ONEID",
    description: "Verify wallet ONEID / KYC status",
    icon: ShieldCheck,
  },
  {
    type: "check_ons",
    label: "Resolve ONS Name",
    description: "Resolve .one name ↔ wallet address",
    icon: AtSign,
  },
]

interface NodeLibraryProps {
  onApplyTemplate?: (template: AgentTemplate) => void
}

export default function NodeLibrary({ onApplyTemplate }: NodeLibraryProps) {
  const [activeTab, setActiveTab] = useState<"tools" | "templates">("tools")

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, toolType: string) => {
    event.dataTransfer.setData("application/reactflow", toolType)
    event.dataTransfer.effectAllowed = "move"
  }

  const categoryOrder: AgentTemplate["category"][] = ["gamefi", "defi", "automation"]
  const grouped = categoryOrder.reduce<Record<string, AgentTemplate[]>>((acc, cat) => {
    acc[cat] = AGENT_TEMPLATES.filter((t) => t.category === cat)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full bg-[#0f1115] text-neutral-100">
      {/* Tab Header */}
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("tools")}
          className={`flex-1 px-3 py-2.5 text-xs font-medium tracking-tight transition-colors ${
            activeTab === "tools"
              ? "text-neutral-100 border-b-2 border-neutral-500 bg-neutral-900"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Tools
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex-1 px-3 py-2.5 text-xs font-medium tracking-tight transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "templates"
              ? "text-neutral-100 border-b-2 border-neutral-500 bg-neutral-900"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Zap className="h-3 w-3" strokeWidth={2} />
          Templates
        </button>
      </div>

      {/* Tools Tab */}
      {activeTab === "tools" && (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {toolTypes.map((tool) => {
                const Icon = tool.icon
                return (
                  <div
                    key={tool.type}
                    draggable={true}
                    onDragStart={(e) => onDragStart(e, tool.type)}
                    className="group cursor-grab active:cursor-grabbing px-3 py-2.5 rounded border border-neutral-800 bg-neutral-900 hover:border-neutral-600 hover:bg-neutral-800 transition-all duration-150"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-neutral-400 group-hover:text-neutral-200 transition-colors">
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-neutral-100 tracking-tight">
                          {tool.label}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-neutral-800 bg-[#0b0d10]">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Drag and drop tools to build your Agent
            </p>
          </div>
        </>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-4">
              {categoryOrder.map((cat) => {
                const templates = grouped[cat]
                if (!templates?.length) return null
                return (
                  <div key={cat}>
                    <div className="px-1 pb-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
                        {CATEGORY_LABELS[cat]}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => onApplyTemplate?.(template)}
                          className="w-full text-left px-3 py-2.5 rounded border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition-all duration-150 group"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-base leading-none mt-0.5">{template.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-neutral-100 tracking-tight group-hover:text-neutral-100">
                                {template.name}
                              </div>
                              <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                                {template.description}
                              </div>
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {template.tools.map((t, i) => (
                                  <span
                                    key={i}
                                    className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono"
                                  >
                                    {t.tool}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-neutral-800 bg-[#0b0d10]">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Click a template to load it onto the canvas
            </p>
          </div>
        </>
      )}
    </div>
  )
}
