"use client"

import type React from "react"
import {
  ArrowRightLeft,
  Wallet,
  Coins,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  Repeat,
  FileText,
  Clock,
  History,
  CheckCircle,
  XCircle,
  Mail,
  ToggleLeft,
  ThumbsUp,
  Webhook,
  Users,
  ScrollText,
  Vote,
  ClipboardList,
} from "lucide-react"

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
    type: "wrap_oct",
    label: "Wrap OCT",
    description: "Wrap OCT tokens",
    icon: Repeat,
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
    type: "approve_token",
    label: "Approve Token",
    description: "Grant spending approval",
    icon: CheckCircle,
  },
  {
    type: "revoke_approval",
    label: "Revoke Approval",
    description: "Remove token allowance",
    icon: XCircle,
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
]

export default function NodeLibrary() {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, toolType: string) => {
    event.dataTransfer.setData("application/reactflow", toolType)
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200">
        <h2 className="text-sm font-medium text-neutral-900 tracking-tight">Tools</h2>
      </div>

      {/* Tools List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {toolTypes.map((tool) => {
            const Icon = tool.icon
            return (
              <div
                key={tool.type}
                draggable={true}
                onDragStart={(e) => onDragStart(e, tool.type)}
                className="group cursor-grab active:cursor-grabbing px-3 py-2.5 rounded border border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm transition-all duration-150"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-neutral-600 group-hover:text-neutral-900 transition-colors">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-900 tracking-tight">
                      {tool.label}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {tool.description}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-neutral-200 bg-neutral-50">
        <p className="text-xs text-neutral-500 leading-relaxed">
          Drag and drop tools to build your Agent
        </p>
      </div>
    </div>
  )
}
