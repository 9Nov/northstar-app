import { createClient } from '@supabase/supabase-js'

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

// Singleton browser client for client-side realtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _browserClient: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBrowserClient(): any {
  if (!_browserClient) {
    _browserClient = createBrowserClient()
  }
  return _browserClient
}

// Re-export as 'supabase' for client-side usage
