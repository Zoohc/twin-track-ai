import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase-server'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // 최초 로그인 시에만 Supabase 프로필 생성/조회
      if (trigger === 'signIn' && user?.email) {
        // 기존 프로필 조회
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .single()

        if (existing) {
          token.profileId = existing.id as string
        } else {
          // 새 프로필 생성
          const { data: created } = await supabaseAdmin
            .from('profiles')
            .insert({ email: user.email, plan: 'free' })
            .select('id')
            .single()

          if (created) {
            token.profileId = created.id as string
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.profileId) {
        session.userId = token.profileId
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
})
