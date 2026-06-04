import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './supabase'

// In-memory rate limiter: max 5 failed attempts per username per 15 minutes
// Resets on successful login. Works within a single serverless instance.
const failedAttempts = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function isRateLimited(username: string): boolean {
  const now = Date.now()
  const entry = failedAttempts.get(username)
  if (!entry || now > entry.resetAt) return false
  return entry.count >= RATE_LIMIT_MAX
}

function recordFailure(username: string) {
  const now = Date.now()
  const entry = failedAttempts.get(username)
  if (!entry || now > entry.resetAt) {
    failedAttempts.set(username, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  } else {
    entry.count++
  }
}

function clearFailures(username: string) {
  failedAttempts.delete(username)
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const username = credentials.username.trim().toLowerCase()

        if (isRateLimited(username)) {
          throw new Error('too_many_attempts')
        }

        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, username, password_hash, name, surname, role, section_id, round_id')
          .eq('username', credentials.username)
          .single()

        if (error || !user) {
          recordFailure(username)
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!valid) {
          recordFailure(username)
          return null
        }

        clearFailures(username)

        return {
          id: user.id,
          name: `${user.name} ${user.surname}`,
          email: user.username,
          role: user.role,
          section_id: user.section_id,
          round_id: user.round_id,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.section_id = (user as any).section_id
        token.round_id = (user as any).round_id
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
        ;(session.user as any).section_id = token.section_id
        ;(session.user as any).round_id = token.round_id
        ;(session.user as any).id = token.userId
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}