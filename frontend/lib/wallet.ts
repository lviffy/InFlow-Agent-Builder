import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { getSupabaseClient } from './supabase'
import { onechainClient, mistToOct } from './onechain'

/**
 * Create a new Ed25519 keypair (OneChain wallet).
 * Returns the Sui address and base64-encoded secret key.
 */
export function createWallet(): { address: string; privateKey: string } {
  const keypair = Ed25519Keypair.generate()
  return {
    address: keypair.toSuiAddress(),
    privateKey: keypair.getSecretKey(), // base64-encoded 64-byte secret
  }
}

/**
 * Derive a Sui address from a base64 or 0x-hex secret key.
 */
export function getAddressFromPrivateKey(secretKey: string): string {
  try {
    const keypair = secretKey.startsWith('0x')
      ? Ed25519Keypair.fromSecretKey(Buffer.from(secretKey.slice(2), 'hex'))
      : Ed25519Keypair.fromSecretKey(secretKey)
    return keypair.toSuiAddress()
  } catch {
    throw new Error('Invalid private key')
  }
}

/**
 * Validate an Ed25519 secret key (base64 or 0x-hex).
 */
export function isValidPrivateKey(secretKey: string): boolean {
  try {
    getAddressFromPrivateKey(secretKey)
    return true
  } catch {
    return false
  }
}

/**
 * Save wallet to the user's Supabase profile.
 */
export async function saveWalletToUser(
  userId: string,
  walletAddress: string,
  privateKey: string
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({ wallet_address: walletAddress, private_key: privateKey })
    .eq('id', userId)
  if (error) throw new Error(`Failed to save wallet: ${error.message}`)
}

/**
 * Remove wallet from the user's Supabase profile.
 */
export async function removeWalletFromUser(userId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({ wallet_address: null, private_key: null })
    .eq('id', userId)
  if (error) throw new Error(`Failed to remove wallet: ${error.message}`)
}

/**
 * Fetch OCT balance for a given address.
 */
export async function getTokenBalances(address: string): Promise<{ oct: string }> {
  try {
    const balance = await onechainClient.getBalance({
      owner: address,
      coinType: '0x2::oct::OCT',
    })
    const formatted = mistToOct(BigInt(balance.totalBalance))
    return { oct: parseFloat(formatted).toFixed(4) }
  } catch {
    return { oct: '0.0000' }
  }
}

/**
 * Legacy alias — maps `oct` → `stt` so existing components still compile.
 * @deprecated Use getTokenBalances which returns { oct } instead.
 */
export async function getLegacyTokenBalances(
  address: string
): Promise<{ stt: string }> {
  const { oct } = await getTokenBalances(address)
  return { stt: oct }
}
