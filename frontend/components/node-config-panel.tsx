"use client"

import { useState } from "react"
import { X, Send, CheckCircle2, AlertCircle, Webhook, ToggleLeft, ThumbsUp, Users, ScrollText, Vote, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WorkflowNode } from "@/lib/types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface NodeConfigPanelProps {
  node: WorkflowNode
  updateNodeData: (nodeId: string, data: any) => void
  onClose: () => void
}

export default function NodeConfigPanel({ node, updateNodeData, onClose }: NodeConfigPanelProps) {
  const isEmail = node.type === "send_email"
  const isWebhook = node.type === "send_webhook"
  const isCondition = node.type === "condition_check"
  const isYesNo = node.type === "yes_no_answer"
  const isCreateDao = node.type === "create_dao"
  const isCreateProposal = node.type === "create_proposal"
  const isVote = node.type === "vote_on_proposal"
  const isGetProposal = node.type === "get_proposal"

  // Email form state
  const [to, setTo] = useState((node.data.config as any)?.to || "")
  const [subject, setSubject] = useState((node.data.config as any)?.subject || "")
  const [body, setBody] = useState((node.data.config as any)?.text || "")
  const [cc, setCc] = useState((node.data.config as any)?.cc || "")
  const [bcc, setBcc] = useState((node.data.config as any)?.bcc || "")
  const [replyTo, setReplyTo] = useState((node.data.config as any)?.replyTo || "")
  const [useHtml, setUseHtml] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  // Webhook form state
  const [webhookUrl, setWebhookUrl] = useState((node.data.config as any)?.url || "")
  const [webhookPayload, setWebhookPayload] = useState(
    (node.data.config as any)?.payload
      ? JSON.stringify((node.data.config as any).payload, null, 2)
      : '{\n  "event": "inflow_trigger"\n}'
  )
  const [webhookMethod, setWebhookMethod] = useState((node.data.config as any)?.method || "POST")
  const [webhookSecret, setWebhookSecret] = useState((node.data.config as any)?.secret || "")
  const [webhookSending, setWebhookSending] = useState(false)
  const [webhookResult, setWebhookResult] = useState<{ success: boolean; message: string } | null>(null)
  const [webhookPayloadError, setWebhookPayloadError] = useState<string | null>(null)

  // Condition check form state
  const [condExpression, setCondExpression] = useState((node.data.config as any)?.expression || "")
  const [condVariables, setCondVariables] = useState(
    (node.data.config as any)?.variables
      ? JSON.stringify((node.data.config as any).variables, null, 2)
      : ""
  )
  const [condDescription, setCondDescription] = useState((node.data.config as any)?.description || "")
  const [condResult, setCondResult] = useState<{ success: boolean; message: string } | null>(null)
  const [condLoading, setCondLoading] = useState(false)

  // Yes/No form state
  const [yesNoQuestion, setYesNoQuestion] = useState((node.data.config as any)?.question || "")
  const [yesNoAnswer, setYesNoAnswer] = useState<"yes" | "no" | "">((node.data.config as any)?.answer || "")

  // Create DAO state
  const [daoName, setDaoName] = useState((node.data.config as any)?.name || "")
  const [daoDescription, setDaoDescription] = useState((node.data.config as any)?.description || "")
  const [daoVotingDays, setDaoVotingDays] = useState((node.data.config as any)?.votingPeriodDays || "7")
  const [daoQuorum, setDaoQuorum] = useState((node.data.config as any)?.quorumPercent || "51")
  const [daoWallet, setDaoWallet] = useState((node.data.config as any)?.walletAddress || "")
  const [daoLoading, setDaoLoading] = useState(false)
  const [daoResult, setDaoResult] = useState<{ success: boolean; message: string; daoId?: string } | null>(null)

  // Create Proposal state
  const [propDaoId, setPropDaoId] = useState((node.data.config as any)?.daoId || "")
  const [propTitle, setPropTitle] = useState((node.data.config as any)?.title || "")
  const [propDescription, setPropDescription] = useState((node.data.config as any)?.description || "")
  const [propWallet, setPropWallet] = useState((node.data.config as any)?.walletAddress || "")
  const [propActions, setPropActions] = useState((node.data.config as any)?.actions ? JSON.stringify((node.data.config as any).actions, null, 2) : "")
  const [propLoading, setPropLoading] = useState(false)
  const [propResult, setPropResult] = useState<{ success: boolean; message: string; proposalId?: string } | null>(null)

  // Vote state
  const [voteProposalId, setVoteProposalId] = useState((node.data.config as any)?.proposalId || "")
  const [voteChoice, setVoteChoice] = useState<"yes" | "no" | "abstain" | "">((node.data.config as any)?.vote || "")
  const [voteWallet, setVoteWallet] = useState((node.data.config as any)?.walletAddress || "")
  const [voteLoading, setVoteLoading] = useState(false)
  const [voteResult, setVoteResult] = useState<{ success: boolean; message: string } | null>(null)

  // Get Proposal state
  const [getProposalId, setGetProposalId] = useState((node.data.config as any)?.proposalId || "")
  const [getProposalLoading, setGetProposalLoading] = useState(false)
  const [getProposalResult, setGetProposalResult] = useState<{ success: boolean; message: string; data?: any } | null>(null)

  // Persist config changes back to the node
  const syncConfig = (overrides: Record<string, string> = {}) => {
    const config = { to, subject, text: body, cc, bcc, replyTo, ...overrides }
    updateNodeData(node.id, { config })
  }

  const handleSendEmail = async () => {
    if (!to) {
      setSendResult({ success: false, message: "At least the 'To' field is required to send." })
      return
    }
    setSending(true)
    setSendResult(null)
    try {
      const payload: Record<string, any> = {
        to: to.split(",").map((e: string) => e.trim()),
        subject,
        ...(useHtml ? { html: body } : { text: body }),
        ...(cc && { cc }),
        ...(bcc && { bcc }),
        ...(replyTo && { replyTo }),
      }
      const res = await fetch(`${BACKEND_URL}/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setSendResult({ success: true, message: `Sent! ID: ${data.messageId}` })
      } else {
        setSendResult({ success: false, message: data.error || "Failed to send email" })
      }
    } catch (err: any) {
      setSendResult({ success: false, message: err.message || "Network error" })
    } finally {
      setSending(false)
    }
  }

  // ── Webhook handler ──
  const handleSendWebhook = async () => {
    if (!webhookUrl) {
      setWebhookResult({ success: false, message: "Webhook URL is required." })
      return
    }
    let parsedPayload: any = {}
    if (webhookPayload.trim()) {
      try {
        parsedPayload = JSON.parse(webhookPayload)
        setWebhookPayloadError(null)
      } catch {
        setWebhookPayloadError("Invalid JSON payload — please fix before sending.")
        return
      }
    }
    setWebhookSending(true)
    setWebhookResult(null)
    try {
      const body: Record<string, any> = {
        url: webhookUrl,
        payload: parsedPayload,
        method: webhookMethod,
      }
      if (webhookSecret) body.secret = webhookSecret
      const res = await fetch(`${BACKEND_URL}/webhook/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setWebhookResult({ success: true, message: `Sent! Status ${data.responseStatus}` })
      } else {
        setWebhookResult({ success: false, message: data.error || "Webhook failed" })
      }
    } catch (err: any) {
      setWebhookResult({ success: false, message: err.message || "Network error" })
    } finally {
      setWebhookSending(false)
    }
  }

  // ── Condition check handler (client-side preview eval) ──
  const handleRunCondition = async () => {
    if (!condExpression.trim()) {
      setCondResult({ success: false, message: "Expression is required." })
      return
    }
    setCondLoading(true)
    setCondResult(null)
    try {
      let variables: Record<string, any> = {}
      if (condVariables.trim()) {
        try { variables = JSON.parse(condVariables) } catch {
          setCondResult({ success: false, message: "Invalid JSON in Variables field." })
          setCondLoading(false)
          return
        }
      }
      // Client-side safe evaluation
      const keys = Object.keys(variables)
      const vals = Object.values(variables)
      // eslint-disable-next-line no-new-func
      const fn = new Function(...keys, `"use strict"; return !!(${condExpression})`)
      const value = fn(...vals)
      setCondResult({ success: true, message: `Preview result: ${value === true ? "✅ TRUE" : "❌ FALSE"}` })
    } catch (err: any) {
      setCondResult({ success: false, message: `Evaluation error: ${err.message}` })
    } finally {
      setCondLoading(false)
    }
  }

  // ── Sync helpers ──
  const syncWebhookConfig = (overrides: Record<string, any> = {}) => {
    const config = { url: webhookUrl, method: webhookMethod, secret: webhookSecret, ...overrides }
    try { config.payload = JSON.parse(webhookPayload) } catch { /* keep as-is */ }
    updateNodeData(node.id, { config })
  }

  const syncConditionConfig = (overrides: Record<string, any> = {}) => {
    const config = { expression: condExpression, description: condDescription, ...overrides }
    if (condVariables.trim()) { try { config.variables = JSON.parse(condVariables) } catch { /* ignore */ } }
    updateNodeData(node.id, { config })
  }

  const syncYesNoConfig = (overrides: Record<string, any> = {}) => {
    updateNodeData(node.id, { config: { question: yesNoQuestion, answer: yesNoAnswer, ...overrides } })
  }

  // ── Governance handlers ──
  const handleCreateDao = async () => {
    if (!daoName || !daoWallet) {
      setDaoResult({ success: false, message: "Name and wallet address are required." })
      return
    }
    setDaoLoading(true)
    setDaoResult(null)
    try {
      const res = await fetch(`${BACKEND_URL}/governance/create-dao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: daoName,
          description: daoDescription,
          votingPeriodDays: Number(daoVotingDays),
          quorumPercent: Number(daoQuorum),
          walletAddress: daoWallet,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDaoResult({ success: true, message: `DAO created! ID: ${data.dao.daoId}`, daoId: data.dao.daoId })
        updateNodeData(node.id, { config: { name: daoName, description: daoDescription, votingPeriodDays: daoVotingDays, quorumPercent: daoQuorum, walletAddress: daoWallet, _result: { daoId: data.dao.daoId } } })
      } else {
        setDaoResult({ success: false, message: data.error || "Failed to create DAO" })
      }
    } catch (err: any) {
      setDaoResult({ success: false, message: err.message || "Network error" })
    } finally {
      setDaoLoading(false)
    }
  }

  const handleCreateProposal = async () => {
    if (!propDaoId || !propTitle || !propWallet) {
      setPropResult({ success: false, message: "DAO ID, title, and wallet address are required." })
      return
    }
    setPropLoading(true)
    setPropResult(null)
    try {
      let actions: any[] = []
      if (propActions.trim()) {
        try { actions = JSON.parse(propActions) } catch { /* ignore */ }
      }
      const res = await fetch(`${BACKEND_URL}/governance/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daoId: propDaoId, title: propTitle, description: propDescription, walletAddress: propWallet, actions }),
      })
      const data = await res.json()
      if (data.success) {
        setPropResult({ success: true, message: `Proposal created! ID: ${data.proposal.proposalId}`, proposalId: data.proposal.proposalId })
        updateNodeData(node.id, { config: { daoId: propDaoId, title: propTitle, description: propDescription, walletAddress: propWallet, _result: { proposalId: data.proposal.proposalId } } })
      } else {
        setPropResult({ success: false, message: data.error || "Failed to create proposal" })
      }
    } catch (err: any) {
      setPropResult({ success: false, message: err.message || "Network error" })
    } finally {
      setPropLoading(false)
    }
  }

  const handleVote = async () => {
    if (!voteProposalId || !voteChoice || !voteWallet) {
      setVoteResult({ success: false, message: "Proposal ID, vote choice, and wallet address are required." })
      return
    }
    setVoteLoading(true)
    setVoteResult(null)
    try {
      const res = await fetch(`${BACKEND_URL}/governance/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: voteProposalId, vote: voteChoice, walletAddress: voteWallet }),
      })
      const data = await res.json()
      if (data.success) {
        const t = data.tally
        setVoteResult({ success: true, message: `Vote "${voteChoice.toUpperCase()}" recorded! Tally — Yes: ${t?.yes ?? 0}, No: ${t?.no ?? 0}, Abstain: ${t?.abstain ?? 0}` })
      } else {
        setVoteResult({ success: false, message: data.error || "Vote failed" })
      }
    } catch (err: any) {
      setVoteResult({ success: false, message: err.message || "Network error" })
    } finally {
      setVoteLoading(false)
    }
  }

  const handleGetProposal = async () => {
    if (!getProposalId) {
      setGetProposalResult({ success: false, message: "Proposal ID is required." })
      return
    }
    setGetProposalLoading(true)
    setGetProposalResult(null)
    try {
      const res = await fetch(`${BACKEND_URL}/governance/proposal/${getProposalId.trim()}`)
      const data = await res.json()
      if (data.success) {
        const p = data.proposal
        const s = data.stats
        setGetProposalResult({ success: true, message: `"${p.title}" — Status: ${p.status}, Yes: ${s?.yesPercent} (${p.votes?.yes ?? 0}), Total votes: ${s?.totalVotes}`, data: { proposal: p, stats: s } })
      } else {
        setGetProposalResult({ success: false, message: data.error || "Proposal not found" })
      }
    } catch (err: any) {
      setGetProposalResult({ success: false, message: err.message || "Network error" })
    } finally {
      setGetProposalLoading(false)
    }
  }

  // ── Email config panel ──
  if (isEmail) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Send Email</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {/* To */}
          <div className="space-y-1">
            <Label htmlFor="email-to" className="text-xs font-medium">
              To
            </Label>
            <Input
              id="email-to"
              placeholder="alice@example.com, bob@example.com"
              value={to}
              onChange={(e) => { setTo(e.target.value); syncConfig({ to: e.target.value }) }}
            />
            <p className="text-[10px] text-muted-foreground">Comma-separated for multiple recipients</p>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <Label htmlFor="email-subject" className="text-xs font-medium">
              Subject
            </Label>
            <Input
              id="email-subject"
              placeholder="Transaction Receipt — Token Deployment"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); syncConfig({ subject: e.target.value }) }}
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-body" className="text-xs font-medium">
                Body
              </Label>
              <button
                type="button"
                onClick={() => setUseHtml(!useHtml)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  useHtml
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-gray-300 hover:border-gray-400"
                }`}
              >
                {useHtml ? "HTML" : "Plain text"}
              </button>
            </div>
            <Textarea
              id="email-body"
              placeholder={useHtml ? "<h1>Hello!</h1><p>Your token was deployed.</p>" : "Hello! Your token was deployed successfully."}
              value={body}
              onChange={(e) => { setBody(e.target.value); syncConfig({ text: e.target.value }) }}
              rows={5}
              className="font-mono text-xs"
            />
          </div>

          {/* CC */}
          <div className="space-y-1">
            <Label htmlFor="email-cc" className="text-xs font-medium">CC</Label>
            <Input
              id="email-cc"
              placeholder="team@example.com"
              value={cc}
              onChange={(e) => { setCc(e.target.value); syncConfig({ cc: e.target.value }) }}
            />
          </div>

          {/* BCC */}
          <div className="space-y-1">
            <Label htmlFor="email-bcc" className="text-xs font-medium">BCC</Label>
            <Input
              id="email-bcc"
              placeholder="audit@example.com"
              value={bcc}
              onChange={(e) => { setBcc(e.target.value); syncConfig({ bcc: e.target.value }) }}
            />
          </div>

          {/* Reply-To */}
          <div className="space-y-1">
            <Label htmlFor="email-reply" className="text-xs font-medium">Reply-To</Label>
            <Input
              id="email-reply"
              placeholder="support@example.com"
              value={replyTo}
              onChange={(e) => { setReplyTo(e.target.value); syncConfig({ replyTo: e.target.value }) }}
            />
          </div>

          {/* Send result banner */}
          {sendResult && (
            <div
              className={`flex items-start gap-2 p-2 rounded-md text-xs ${
                sendResult.success
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {sendResult.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span className="break-all">{sendResult.message}</span>
            </div>
          )}

          {/* AI hint */}
          <div className="p-2 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700">
            💡 Tip: You can also ask the AI chatbot to compose and send emails for you. Just say something like &quot;Send an email to alice@example.com about the token deployment.&quot;
          </div>
        </div>

        {/* Send button */}
        <div className="pt-3 border-t mt-3">
          <Button
            onClick={handleSendEmail}
            disabled={sending || !to}
            className="w-full"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" /> Send Email
              </span>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ── Webhook config panel ──
  if (isWebhook) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Send Webhook</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {/* URL */}
          <div className="space-y-1">
            <Label htmlFor="wh-url" className="text-xs font-medium">Webhook URL <span className="text-red-500">*</span></Label>
            <Input
              id="wh-url"
              placeholder="https://hooks.example.com/notify"
              value={webhookUrl}
              onChange={(e) => { setWebhookUrl(e.target.value); syncWebhookConfig({ url: e.target.value }) }}
            />
          </div>

          {/* Method */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">HTTP Method</Label>
            <Select
              value={webhookMethod}
              onValueChange={(v) => { setWebhookMethod(v); syncWebhookConfig({ method: v }) }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["POST", "PUT", "PATCH", "GET", "DELETE"].map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payload */}
          <div className="space-y-1">
            <Label htmlFor="wh-payload" className="text-xs font-medium">Payload (JSON)</Label>
            <Textarea
              id="wh-payload"
              placeholder={'{\n  "event": "inflow_trigger"\n}'}
              value={webhookPayload}
              onChange={(e) => {
                setWebhookPayload(e.target.value)
                setWebhookPayloadError(null)
                syncWebhookConfig()
              }}
              rows={6}
              className="font-mono text-xs"
            />
            {webhookPayloadError && (
              <p className="text-[10px] text-red-600">{webhookPayloadError}</p>
            )}
          </div>

          {/* HMAC Secret */}
          <div className="space-y-1">
            <Label htmlFor="wh-secret" className="text-xs font-medium">HMAC Secret <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="wh-secret"
              type="password"
              placeholder="Signs payload with SHA-256"
              value={webhookSecret}
              onChange={(e) => { setWebhookSecret(e.target.value); syncWebhookConfig({ secret: e.target.value }) }}
            />
            <p className="text-[10px] text-muted-foreground">If set, adds an <code>X-Webhook-Signature</code> header to the request.</p>
          </div>

          {/* Result banner */}
          {webhookResult && (
            <div
              className={`flex items-start gap-2 p-2 rounded-md text-xs ${
                webhookResult.success
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {webhookResult.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span className="break-all">{webhookResult.message}</span>
            </div>
          )}

          <div className="p-2 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700">
            💡 Tip: Use this node at the end of a workflow to notify external services (n8n, Slack, custom APIs) when your blockchain task completes.
          </div>
        </div>

        {/* Send button */}
        <div className="pt-3 border-t mt-3">
          <Button
            onClick={handleSendWebhook}
            disabled={webhookSending || !webhookUrl}
            className="w-full"
          >
            {webhookSending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Webhook className="h-4 w-4" /> Send Webhook
              </span>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ── Condition Check config panel ──
  if (isCondition) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Condition Check</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {/* Expression */}
          <div className="space-y-1">
            <Label htmlFor="cond-expr" className="text-xs font-medium">Expression <span className="text-red-500">*</span></Label>
            <Input
              id="cond-expr"
              placeholder="balance > 100"
              value={condExpression}
              onChange={(e) => { setCondExpression(e.target.value); syncConditionConfig({ expression: e.target.value }) }}
            />
            <p className="text-[10px] text-muted-foreground">
              e.g. <code>balance &gt; 100</code>, <code>price &lt; 0.5</code>, <code>status === &quot;funded&quot;</code>
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="cond-desc" className="text-xs font-medium">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="cond-desc"
              placeholder="Is the wallet funded enough?"
              value={condDescription}
              onChange={(e) => { setCondDescription(e.target.value); syncConditionConfig({ description: e.target.value }) }}
            />
          </div>

          {/* Variables */}
          <div className="space-y-1">
            <Label htmlFor="cond-vars" className="text-xs font-medium">Variables (JSON) <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="cond-vars"
              placeholder={'{\n  "balance": 150,\n  "threshold": 100\n}'}
              value={condVariables}
              onChange={(e) => { setCondVariables(e.target.value); syncConditionConfig() }}
              rows={5}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">Inject values into the expression at runtime.</p>
          </div>

          {/* Result banner */}
          {condResult && (
            <div
              className={`flex items-start gap-2 p-2 rounded-md text-xs ${
                condResult.success
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {condResult.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span className="break-all">{condResult.message}</span>
            </div>
          )}

          <div className="p-2 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700">
            💡 Use this node to gate later steps — connect its output to a Transfer or Email node to conditionally execute based on on-chain state. The &quot;Preview&quot; button tests your expression locally with the variables you provide.
          </div>
        </div>

        <div className="pt-3 border-t mt-3">
          <Button
            onClick={handleRunCondition}
            disabled={condLoading || !condExpression.trim()}
            className="w-full"
          >
            {condLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Evaluating…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ToggleLeft className="h-4 w-4" /> Preview Expression
              </span>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ── Yes / No config panel ──
  if (isYesNo) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Yes / No Decision</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* Question */}
          <div className="space-y-1">
            <Label htmlFor="yn-question" className="text-xs font-medium">Question</Label>
            <Input
              id="yn-question"
              placeholder="Should we proceed with the deployment?"
              value={yesNoQuestion}
              onChange={(e) => { setYesNoQuestion(e.target.value); syncYesNoConfig({ question: e.target.value }) }}
            />
          </div>

          {/* Answer buttons */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Answer</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setYesNoAnswer("yes")
                  syncYesNoConfig({ answer: "yes" })
                }}
                className={`flex-1 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                  yesNoAnswer === "yes"
                    ? "bg-green-500 border-green-500 text-white shadow-md"
                    : "border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600"
                }`}
              >
                ✅ Yes
              </button>
              <button
                type="button"
                onClick={() => {
                  setYesNoAnswer("no")
                  syncYesNoConfig({ answer: "no" })
                }}
                className={`flex-1 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                  yesNoAnswer === "no"
                    ? "bg-red-500 border-red-500 text-white shadow-md"
                    : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600"
                }`}
              >
                ❌ No
              </button>
            </div>
            {yesNoAnswer && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                Decision recorded: <strong>{yesNoAnswer === "yes" ? "Yes (true)" : "No (false)"}</strong>
              </p>
            )}
          </div>

          <div className="p-2 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700">
            💡 Use this node for governance approval gates, manual override steps, or any binary decision point in your workflow.
          </div>
        </div>

        <div className="pt-3 border-t mt-3">
          <Button
            disabled={!yesNoAnswer}
            onClick={() => syncYesNoConfig()}
            className="w-full"
          >
            <span className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" /> Save Decision
            </span>
          </Button>
        </div>
      </div>
    )
  }

  // ── Create DAO panel ──
  if (isCreateDao) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Create DAO</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label htmlFor="dao-name" className="text-xs font-medium">DAO Name <span className="text-red-500">*</span></Label>
            <Input id="dao-name" placeholder="MyDAO" value={daoName}
              onChange={(e) => { setDaoName(e.target.value); updateNodeData(node.id, { config: { name: e.target.value, description: daoDescription, votingPeriodDays: daoVotingDays, quorumPercent: daoQuorum, walletAddress: daoWallet } }) }} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dao-desc" className="text-xs font-medium">Description</Label>
            <Textarea id="dao-desc" placeholder="A decentralized governance organization for…" value={daoDescription} rows={3}
              onChange={(e) => { setDaoDescription(e.target.value); updateNodeData(node.id, { config: { name: daoName, description: e.target.value, votingPeriodDays: daoVotingDays, quorumPercent: daoQuorum, walletAddress: daoWallet } }) }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="dao-days" className="text-xs font-medium">Voting Period (days)</Label>
              <Input id="dao-days" type="number" min="1" max="365" placeholder="7" value={daoVotingDays}
                onChange={(e) => { setDaoVotingDays(e.target.value); updateNodeData(node.id, { config: { name: daoName, description: daoDescription, votingPeriodDays: e.target.value, quorumPercent: daoQuorum, walletAddress: daoWallet } }) }} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dao-quorum" className="text-xs font-medium">Quorum %</Label>
              <Input id="dao-quorum" type="number" min="1" max="100" placeholder="51" value={daoQuorum}
                onChange={(e) => { setDaoQuorum(e.target.value); updateNodeData(node.id, { config: { name: daoName, description: daoDescription, votingPeriodDays: daoVotingDays, quorumPercent: e.target.value, walletAddress: daoWallet } }) }} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dao-wallet" className="text-xs font-medium">Creator Wallet Address <span className="text-red-500">*</span></Label>
            <Input id="dao-wallet" placeholder="0x..." value={daoWallet}
              onChange={(e) => { setDaoWallet(e.target.value); updateNodeData(node.id, { config: { name: daoName, description: daoDescription, votingPeriodDays: daoVotingDays, quorumPercent: daoQuorum, walletAddress: e.target.value } }) }} />
          </div>
          {daoResult && (
            <div className={`flex items-start gap-2 p-2 rounded-md text-xs ${daoResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {daoResult.success ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span className="break-all">{daoResult.message}</span>
            </div>
          )}
          <div className="p-2 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700">
            💡 Once created, copy the DAO ID to use in downstream Create Proposal and Vote nodes.
          </div>
        </div>

        <div className="pt-3 border-t mt-3">
          <Button onClick={handleCreateDao} disabled={daoLoading || !daoName || !daoWallet} className="w-full">
            {daoLoading ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating…</span>
              : <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Create DAO</span>}
          </Button>
        </div>
      </div>
    )
  }

  // ── Create Proposal panel ──
  if (isCreateProposal) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Create Proposal</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label htmlFor="prop-dao" className="text-xs font-medium">DAO ID <span className="text-red-500">*</span></Label>
            <Input id="prop-dao" placeholder="dao_abc123..." value={propDaoId}
              onChange={(e) => { setPropDaoId(e.target.value); updateNodeData(node.id, { config: { daoId: e.target.value, title: propTitle, description: propDescription, walletAddress: propWallet } }) }} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prop-title" className="text-xs font-medium">Title <span className="text-red-500">*</span></Label>
            <Input id="prop-title" placeholder="Increase treasury allocation by 10%" value={propTitle}
              onChange={(e) => { setPropTitle(e.target.value); updateNodeData(node.id, { config: { daoId: propDaoId, title: e.target.value, description: propDescription, walletAddress: propWallet } }) }} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prop-desc" className="text-xs font-medium">Description</Label>
            <Textarea id="prop-desc" placeholder="This proposal aims to…" value={propDescription} rows={4}
              onChange={(e) => { setPropDescription(e.target.value); updateNodeData(node.id, { config: { daoId: propDaoId, title: propTitle, description: e.target.value, walletAddress: propWallet } }) }} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prop-wallet" className="text-xs font-medium">Proposer Wallet <span className="text-red-500">*</span></Label>
            <Input id="prop-wallet" placeholder="0x..." value={propWallet}
              onChange={(e) => { setPropWallet(e.target.value); updateNodeData(node.id, { config: { daoId: propDaoId, title: propTitle, description: propDescription, walletAddress: e.target.value } }) }} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prop-actions" className="text-xs font-medium">Actions (JSON) <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="prop-actions" placeholder={'[{"type": "transfer", "to": "0x...", "amount": 100}]'} value={propActions} rows={3} className="font-mono text-xs"
              onChange={(e) => { setPropActions(e.target.value) }} />
          </div>
          {propResult && (
            <div className={`flex items-start gap-2 p-2 rounded-md text-xs ${propResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {propResult.success ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span className="break-all">{propResult.message}</span>
            </div>
          )}
          <div className="p-2 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700">
            💡 Copy the returned Proposal ID to use in Vote nodes downstream.
          </div>
        </div>

        <div className="pt-3 border-t mt-3">
          <Button onClick={handleCreateProposal} disabled={propLoading || !propDaoId || !propTitle || !propWallet} className="w-full">
            {propLoading ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Submitting…</span>
              : <span className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> Submit Proposal</span>}
          </Button>
        </div>
      </div>
    )
  }

  // ── Vote panel ──
  if (isVote) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Vote className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Vote on Proposal</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label htmlFor="vote-prop" className="text-xs font-medium">Proposal ID <span className="text-red-500">*</span></Label>
            <Input id="vote-prop" placeholder="prop_abc123..." value={voteProposalId}
              onChange={(e) => { setVoteProposalId(e.target.value); updateNodeData(node.id, { config: { proposalId: e.target.value, vote: voteChoice, walletAddress: voteWallet } }) }} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Vote <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              {(["yes", "no", "abstain"] as const).map((v) => (
                <button key={v} type="button"
                  onClick={() => { setVoteChoice(v); updateNodeData(node.id, { config: { proposalId: voteProposalId, vote: v, walletAddress: voteWallet } }) }}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-xs font-semibold capitalize transition-all ${
                    voteChoice === v
                      ? v === "yes" ? "bg-green-500 border-green-500 text-white shadow-md" : v === "no" ? "bg-red-500 border-red-500 text-white shadow-md" : "bg-gray-500 border-gray-500 text-white shadow-md"
                      : "border-gray-200 text-gray-500 hover:border-gray-400"
                  }`}>
                  {v === "yes" ? "✅ Yes" : v === "no" ? "❌ No" : "🤐 Abstain"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="vote-wallet" className="text-xs font-medium">Voter Wallet Address <span className="text-red-500">*</span></Label>
            <Input id="vote-wallet" placeholder="0x..." value={voteWallet}
              onChange={(e) => { setVoteWallet(e.target.value); updateNodeData(node.id, { config: { proposalId: voteProposalId, vote: voteChoice, walletAddress: e.target.value } }) }} />
          </div>

          {voteResult && (
            <div className={`flex items-start gap-2 p-2 rounded-md text-xs ${voteResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {voteResult.success ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span className="break-all">{voteResult.message}</span>
            </div>
          )}
          <div className="p-2 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700">
            💡 Each wallet can change their vote — submitting again replaces the previous vote.
          </div>
        </div>

        <div className="pt-3 border-t mt-3">
          <Button onClick={handleVote} disabled={voteLoading || !voteProposalId || !voteChoice || !voteWallet} className="w-full">
            {voteLoading ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Voting…</span>
              : <span className="flex items-center gap-2"><Vote className="h-4 w-4" /> Cast Vote</span>}
          </Button>
        </div>
      </div>
    )
  }

  // ── Get Proposal panel ──
  if (isGetProposal) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Get Proposal</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label htmlFor="get-prop-id" className="text-xs font-medium">Proposal ID <span className="text-red-500">*</span></Label>
            <Input id="get-prop-id" placeholder="prop_abc123..." value={getProposalId}
              onChange={(e) => { setGetProposalId(e.target.value); updateNodeData(node.id, { config: { proposalId: e.target.value } }) }} />
          </div>

          {getProposalResult && (
            <div className={`flex items-start gap-2 p-2 rounded-md text-xs ${getProposalResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {getProposalResult.success ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span className="break-all">{getProposalResult.message}</span>
            </div>
          )}

          {getProposalResult?.success && getProposalResult.data && (
            <div className="p-2 rounded-md bg-gray-50 border border-gray-200 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Vote Tally</p>
              <div className="flex gap-3 text-xs">
                <span className="text-green-700 font-medium">✅ Yes: {getProposalResult.data.proposal?.votes?.yes ?? 0}</span>
                <span className="text-red-700 font-medium">❌ No: {getProposalResult.data.proposal?.votes?.no ?? 0}</span>
                <span className="text-gray-600">🤐 Abstain: {getProposalResult.data.proposal?.votes?.abstain ?? 0}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Yes share: <strong>{getProposalResult.data.stats?.yesPercent}</strong> · Status: <strong>{getProposalResult.data.proposal?.status}</strong>
              </p>
            </div>
          )}

          <div className="p-2 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700">
            💡 Use this node to query live vote tallies after a Vote node, or to check proposal status before executing downstream actions.
          </div>
        </div>

        <div className="pt-3 border-t mt-3">
          <Button onClick={handleGetProposal} disabled={getProposalLoading || !getProposalId.trim()} className="w-full">
            {getProposalLoading ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Loading…</span>
              : <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Fetch Proposal</span>}
          </Button>
        </div>
      </div>
    )
  }

  // ── Default config panel for other tools ──
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tool Information</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="tool-name">Tool Name</Label>
          <div className="p-3 bg-gray-100 rounded-md">
            <p className="text-sm font-medium">{node.data.label || node.type || "Unknown"}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tool-id">Tool ID</Label>
          <div className="p-3 bg-gray-100 rounded-md">
            <p className="text-sm font-mono">{node.type || "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
