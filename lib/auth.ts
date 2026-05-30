import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './supabase'

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

        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, username, password_hash, name, surname, role, section_id, round_id')
          .eq('username', credentials.username)
          .single()

        console.log('[auth] query result:', { user: user?.username, error })

        if (error || !user) return null

        const valid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!valid) return null

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
