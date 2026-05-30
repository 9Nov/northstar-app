import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || url === 'your_supabase_url_here') throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  return url
}

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(getSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }
  return _supabase
}

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    _supabaseAdmin = createClient(getSupabaseUrl(), key)
  }
  return _supabaseAdmin
}

// Convenience aliases — use these in client components
export const supabase = {
  channel: (...args: Parameters<SupabaseClient['channel']>) => getSupabase().channel(...args),
  removeChannel: (...args: Parameters<SupabaseClient['removeChannel']>) => getSupabase().removeChannel(...args),
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabase().from(...args),
}

// Server-side admin client
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin()
    const val = (client as any)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})
