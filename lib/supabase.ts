import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return url.replace(/\/rest\/v1\/?$/, '')
}

// Browser singleton
let _browser: SupabaseClient | null = null
export function getBrowserClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    return createClient(getUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }
  if (!_browser) {
    _browser = createClient(getUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }
  return _browser
}

// Server admin client
export function getAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(getUrl(), key)
}

// Convenience exports
// Client-side: use getBrowserClient() for realtime
export const supabase = {
  get channel() { return getBrowserClient().channel.bind(getBrowserClient()) },
  get removeChannel() { return getBrowserClient().removeChannel.bind(getBrowserClient()) },
  get from() { return getBrowserClient().from.bind(getBrowserClient()) },
}

// Server-side: supabaseAdmin is a getter that returns a fresh admin client
// Use in API routes: supabaseAdmin.from(...)
export const supabaseAdmin: SupabaseClient = new Proxy(
  {} as SupabaseClient,
  {
    get(_target, prop: string) {
      const client = getAdminClient()
      const value = (client as any)[prop]
      return typeof value === 'function' ? (value as Function).bind(client) : value
    },
  }
)
