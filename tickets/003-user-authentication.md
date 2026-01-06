# #003 ユーザー認証・セッション管理

**優先度**: 高
**Phase**: 2 - 認証・権限
**依存**: #001, #002
**担当**: Backend Developer

## 目的
社内ユーザーがメール・パスワードでログインできる認証機能を実装する。

## 受け入れ基準
- [ ] ログイン画面が実装されている
- [ ] メール・パスワードで認証できる
- [ ] セッション管理が機能している（Cookie/JWT）
- [ ] ログアウト機能が動作する
- [ ] 未認証ユーザーは保護されたページにアクセスできない
- [ ] パスワードは bcrypt でハッシュ化されている

## 実装詳細

### 1. NextAuth.js セットアップ

#### `src/app/api/auth/[...nextauth]/route.ts`
```typescript
import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### 2. ログイン画面

#### `src/app/login/page.tsx`
```typescript
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('メールアドレスまたはパスワードが正しくありません')
    } else {
      router.push('/inbox')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-bold">ログイン</h1>

        {error && (
          <div className="rounded bg-red-100 p-3 text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
        >
          ログイン
        </button>
      </form>
    </div>
  )
}
```

### 3. 認証保護（Middleware）

#### `src/middleware.ts`
```typescript
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

export const config = {
  matcher: ['/inbox/:path*', '/admin/:path*', '/api/:path*'],
}
```

### 4. ユーザー登録ユーティリティ（Admin用）

#### `src/lib/auth.ts`
```typescript
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { Role } from '@prisma/client'

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: Role = Role.AGENT
) {
  const passwordHash = await bcrypt.hash(password, 10)

  return await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
    },
  })
}
```

## テスト項目
- [ ] 正しいメール・パスワードでログインできる
- [ ] 間違ったパスワードでログインが拒否される
- [ ] ログイン後に `/inbox` にリダイレクトされる
- [ ] ログアウト後に保護されたページにアクセスできない
- [ ] セッションが永続化される（ページリロード後も認証状態が維持）

## 備考
- MVP では管理画面からのユーザー招待は不要（手動でDBに追加）
- Phase 2 でメール招待機能を実装予定
- パスワードリセット機能は Phase 2 で実装
