import type { Node, XYPosition } from "reactflow"
import type { NodeData } from "./types"

let toolIdCounter = 0

export const generateNodeId = (type: string): string => {
  toolIdCounter++
  return `${type}-${toolIdCounter}`
}

export const createNode = ({
  type,
  position,
  id,
  config,
}: {
  type: string
  position: XYPosition
  id: string
  config?: Record<string, any>
}): Node<NodeData> => {
  return {
    id,
    type,
    position,
    data: {
      label: getDefaultLabel(type),
      description: getDefaultDescription(type),
      config: config ?? {},
    },
  }
}

const getDefaultLabel = (type: string): string => {
  const labels: Record<string, string> = {
    transfer: "Transfer",
    swap: "Swap",
    get_balance: "Get Balance",
    deploy_token: "Deploy Token",
    deploy_nft_collection: "Deploy NFT Collection",
    create_dao: "Create DAO",
    airdrop: "Airdrop",
    fetch_price: "Fetch Price",
    deposit_yield: "Deposit Yield",
    wrap_oct: "Wrap OCT",
    token_metadata: "Token Metadata",
    tx_status: "Transaction Status",
    wallet_history: "Wallet History",
    approve_token: "Approve Token",
    revoke_approval: "Revoke Approval",
    send_email: "Send Email",
    condition_check: "Condition Check",
    yes_no_answer: "Yes / No",
    send_webhook: "Send Webhook",
    create_proposal: "Create Proposal",
    vote_on_proposal: "Vote",
    get_proposal: "Get Proposal",
    mint_nft: "Mint NFT",
    get_swap_quote: "Swap Quote",
    swap_tokens: "Swap Tokens",
    get_dex_pools: "DEX Pools",
    get_dex_price: "DEX Price",
    cross_border_transfer: "Cross-Border Transfer",
    check_oneid: "Check ONEID",
  }
  return labels[type] || "Tool"
}

const getDefaultDescription = (type: string): string => {
  const descriptions: Record<string, string> = {
    transfer: "Transfer tokens or assets",
    swap: "Swap tokens",
    get_balance: "Get wallet balance",
    deploy_token: "Deploy Move fungible token",
    deploy_nft_collection: "Deploy Move NFT collection",
    create_dao: "Create a new DAO",
    airdrop: "Airdrop tokens to addresses",
    fetch_price: "Fetch token price",
    deposit_yield: "Deposit to yield farming",
    wrap_oct: "Wrap OCT tokens",
    token_metadata: "Get token info",
    tx_status: "Check tx confirmations",
    wallet_history: "Fetch recent transactions",
    approve_token: "Grant spending approval",
    revoke_approval: "Remove token allowance",
    send_email: "Send email notifications",
    condition_check: "Evaluate true/false condition",
    yes_no_answer: "Record a yes or no decision",
    send_webhook: "POST payload to a webhook URL",
    create_proposal: "Submit a governance proposal",
    vote_on_proposal: "Cast a yes/no/abstain vote",
    get_proposal: "Fetch proposal details & tally",
    mint_nft: "Mint an NFT from a collection",
    get_swap_quote: "Get ONEDEX quote without trading",
    swap_tokens: "Execute swap on ONEDEX",
    get_dex_pools: "List ONEDEX liquidity pools",
    get_dex_price: "Get on-chain token price",
    cross_border_transfer: "ONETRANSFER international payment",
    check_oneid: "Verify wallet ONEID / KYC status",
  }
  return descriptions[type] || "Workflow tool"
}
