import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

function generateAgentWallet(): { address: string; privateKey: string } {
  const keypair = Ed25519Keypair.generate()
  return {
    address: keypair.toSuiAddress(),
    privateKey: keypair.getSecretKey(), // base64-encoded 64-byte secret
  }
}

/**
 * Generates a deterministic 13-digit DID from a wallet address.
 * Mimics OneChain's DID system — a unique numeric identifier per user.
 */
function generateDID(address: string): string {
  // Hash the address bytes into a stable 13-digit number
  let hash = 0n
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31n + BigInt(address.charCodeAt(i))) & 0xFFFFFFFFFFFFFFFFn
  }
  // Force into 13-digit range: 1000000000000 – 9999999999999
  const min = 1000000000000n
  const range = 8999999999999n
  const did = (hash % range) + min
  return did.toString()
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { address } = await req.json()

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    // Try to fetch existing user
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', address)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: fetchError.message, code: fetchError.code },
        { status: 500 }
      )
    }

    if (existing) {
      // Auto-provision agent wallet for existing users who don't have one yet
      if (!existing.private_key) {
        const agentWallet = generateAgentWallet()
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            private_key: agentWallet.privateKey,
            wallet_address: agentWallet.address,
            did: existing.did ?? generateDID(address),
            ons_name: existing.ons_name ?? null,
          })
          .eq('id', address)
          .select()
          .single()

        if (updateError) {
          // Non-fatal — return user as-is, they can set up manually
          return NextResponse.json({ user: existing, created: false })
        }

        return NextResponse.json({ user: updatedUser, created: false })
      }

      // Back-fill DID for existing users who pre-date this feature
      if (!existing.did) {
        const { data: updatedUser } = await supabaseAdmin
          .from('users')
          .update({ did: generateDID(address) })
          .eq('id', address)
          .select()
          .single()
        return NextResponse.json({ user: updatedUser ?? existing, created: false })
      }

      return NextResponse.json({ user: existing, created: false })
    }

    // Create new user with auto-generated agent wallet
    const agentWallet = generateAgentWallet()
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: address,
        private_key: agentWallet.privateKey,
        wallet_address: agentWallet.address,
        did: generateDID(address),
        ons_name: null,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        { error: createError.message, code: createError.code, details: createError.details },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: newUser, created: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
