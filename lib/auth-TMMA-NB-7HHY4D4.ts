import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { createServiceClient } from './supabase'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const supabase = createServiceClient()
        const { data: user } = await supabase
          .from('users')
          .select('id, username, password_hash, name, surname, role, section_id, round_id')
          .eq('username', credentials.username)
          .single()

        if (!user) return null

        const isValid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!isValid) return null

        return {
          id: user.id,
          username: user.username,
          name: `${user.name} ${user.surname}`,
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
        token.id = user.id
        token.username = (user as any).username
        token.role = (user as any).role
        token.section_id = (user as any).section_id
        token.round_id = (user as any).round_id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).username = token.username
        ;(session.user as any).role = token.role
        ;(session.user as any).section_id = token.section_id
        ;(session.user as any).round_id = token.round_id
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}
