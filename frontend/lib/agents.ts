import { getSupabaseClient, type Agent } from './supabase'
import { AGENT_TEMPLATES } from './agent-templates'

export type PublicAgent = Agent & {
  creator_did: string | null
  creator_ons_name: string | null
  marketplace_source: 'template' | 'community'
}

export async function createAgent(
  userId: string,
  name: string,
  description: string | null,
  tools: Array<{ tool: string; next_tool: string | null; config?: Record<string, any> }>,
  gasBudget?: number | null,
  isPublic?: boolean
): Promise<Agent> {
  const supabase = getSupabaseClient()
  // Generate random API key
  const apiKey = generateApiKey()

  const { data, error } = await supabase
    .from('agents')
    .insert({
      user_id: userId,
      name,
      description,
      api_key: apiKey,
      tools,
      gas_budget: gasBudget ?? null,
      is_public: isPublic ?? false,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create agent: ${error.message}`)
  }

  return data
}

export async function getAgentsByUserId(userId: string): Promise<Agent[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch agents: ${error.message}`)
  }

  return data || []
}

export async function getAgentById(agentId: string): Promise<Agent | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch agent: ${error.message}`)
  }

  return data
}

export async function getAgentByApiKey(apiKey: string): Promise<Agent | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('api_key', apiKey)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch agent: ${error.message}`)
  }

  return data
}

export async function updateAgent(
  agentId: string,
  updates: {
    name?: string
    description?: string | null
    gas_budget?: number | null
    is_public?: boolean
    tools?: Array<{ tool: string; next_tool: string | null; config?: Record<string, any> }>
  }
): Promise<Agent> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update agent: ${error.message}`)
  }

  return data
}

export async function deleteAgent(agentId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('agents').delete().eq('id', agentId)

  if (error) {
    throw new Error(`Failed to delete agent: ${error.message}`)
  }
}

export async function getPublicAgents(): Promise<PublicAgent[]> {
  const supabase = getSupabaseClient()
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch public agents: ${error.message}`)
  const templateAgents = AGENT_TEMPLATES.map((template) => toTemplateMarketplaceAgent(template))
  if (!agents || agents.length === 0) return templateAgents

  // Fetch creator identity (DID / ONS) in one query
  const userIds = [...new Set(agents.map((a) => a.user_id))]
  const { data: users } = await supabase
    .from('users')
    .select('id, did, ons_name')
    .in('id', userIds)

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

  const communityAgents = agents.map((agent) => ({
    ...agent,
    creator_did: userMap[agent.user_id]?.did ?? null,
    creator_ons_name: userMap[agent.user_id]?.ons_name ?? null,
    marketplace_source: 'community' as const,
  }))

  const templateSignatures = new Set(templateAgents.map((agent) => getMarketplaceAgentSignature(agent)))

  return [
    ...templateAgents,
    ...communityAgents.filter((agent) => !templateSignatures.has(getMarketplaceAgentSignature(agent))),
  ]
}

export async function cloneAgent(
  userId: string,
  source: Agent
): Promise<Agent> {
  const supabase = getSupabaseClient()
  const apiKey = generateApiKey()
  const { data, error } = await supabase
    .from('agents')
    .insert({
      user_id: userId,
      name: `${source.name} (clone)`,
      description: source.description,
      api_key: apiKey,
      tools: source.tools,
      gas_budget: null,
      is_public: false,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to clone agent: ${error.message}`)
  return data
}

function generateApiKey(): string {
  // Generate a random 32-character API key
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function toTemplateMarketplaceAgent(template: (typeof AGENT_TEMPLATES)[number]): PublicAgent {
  const timestamp = '2026-01-01T00:00:00.000Z'

  return {
    id: `template:${template.id}`,
    user_id: 'template-library',
    name: template.name,
    description: template.description,
    api_key: `template-${template.id}`,
    gas_budget: null,
    is_public: true,
    tools: template.tools.map((tool) => ({ ...tool })),
    created_at: timestamp,
    updated_at: timestamp,
    creator_did: null,
    creator_ons_name: null,
    marketplace_source: 'template',
  }
}

function getMarketplaceAgentSignature(agent: Pick<Agent, 'name' | 'tools'>): string {
  return JSON.stringify({
    name: agent.name.trim().toLowerCase(),
    tools: agent.tools.map((tool) => ({
      tool: tool.tool,
      next_tool: tool.next_tool,
    })),
  })
}
