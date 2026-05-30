import { createClient } from '@supabase/supabase-js'

function getUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || url.includes('your_supabase')) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  return url.replace(/\/rest\/v1\/?$/, '') // strip /rest/v1 if mistakenly included
}

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
}

function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? getAnonKey()
}

// Browser/client-side client (singleton)
let _browser: ReturnType<typeof createClient> | null = null
export function getBrowserClient() {
  if (typeof window === 'undefined') return createClient(getUrl(), getAnonKey())
  if (!_browser) _browser = createClient(getUrl(), getAnonKey())
  return _browser
}

// Server-side admin client (new instance per call is fine for server)
export function getAdminClient() {
  return createClient(getUrl(), getServiceKey())
}

// Named exports for convenience
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop) {
    const c = getBrowserClient()
    const v = (c as any)[prop]
    return typeof v === 'function' ? v.bind(c) : v
  },
})

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop) {
    const c = getAdminClient()
    const v = (c as any)[prop]
    return typeof v === 'function' ? v.bind(c) : v
  },
})
