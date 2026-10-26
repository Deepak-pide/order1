import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL
  || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
)?.trim().replace(/\/+$/, '')
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim()

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null

export const isSupabaseConfigured = Boolean(supabase)

export function describeSupabaseError(error) {
  const message = error?.message || 'Unknown Supabase error'
  if (/invalid api key|invalid api_key/i.test(message)) {
    return 'Supabase rejected the API key (401 Invalid API key). Check that the project URL and key belong to the same project, then use its active Publishable key or legacy anon key. After changing .env.local, restart the Vite server.'
  }
  return message
}

export async function checkSupabaseConnection() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase URL and publishable key are not configured.')
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: supabasePublishableKey },
  })
  if (!response.ok) {
    let message = `Supabase health check failed (HTTP ${response.status}).`
    try {
      const result = await response.json()
      if (result.message) message = result.message
    } catch {
      message = `Supabase health check failed (HTTP ${response.status}).`
    }
    throw new Error(describeSupabaseError({ message }))
  }
}
