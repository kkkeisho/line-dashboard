# #018 Admin設定画面（ユーザー・タグ管理）

**優先度**: 中
**Phase**: 7 - 管理・監査
**依存**: #003, #004, #015
**担当**: Full-stack Developer

## 目的
Admin ユーザーがシステム設定を行える管理画面を実装する。

## 受け入れ基準
- [ ] ユーザー一覧が表示される
- [ ] ユーザーを作成できる（Admin）
- [ ] ユーザーの役割を変更できる
- [ ] ユーザーを削除できる
- [ ] タグ管理画面にアクセスできる
- [ ] Adminのみアクセスできる（権限チェック）

## 実装詳細

### 1. Admin画面レイアウト

#### `src/app/admin/layout.tsx`
```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/inbox')
    }
  }, [status, session, router])

  if (status === 'loading' || session?.user?.role !== 'ADMIN') {
    return <div>Loading...</div>
  }

  return (
    <div className="flex h-screen">
      {/* サイドバー */}
      <aside className="w-64 border-r bg-gray-50 p-4">
        <h2 className="mb-4 text-xl font-bold">管理画面</h2>
        <nav className="space-y-2">
          <Link
            href="/admin/users"
            className="block rounded p-2 hover:bg-gray-200"
          >
            ユーザー管理
          </Link>
          <Link
            href="/admin/tags"
            className="block rounded p-2 hover:bg-gray-200"
          >
            タグ管理
          </Link>
          <Link
            href="/admin/audit-logs"
            className="block rounded p-2 hover:bg-gray-200"
          >
            監査ログ
          </Link>
          <Link href="/inbox" className="block rounded p-2 hover:bg-gray-200">
            Inboxに戻る
          </Link>
        </nav>
      </aside>

      {/* メインエリア */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

### 2. ユーザー管理API

#### `src/app/api/admin/users/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createUser } from '@/lib/auth'
import { Role } from '@prisma/client'

// ユーザー一覧取得
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json({ users })
}

// ユーザー作成
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { email, password, name, role } = await req.json()

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: 'Email, password, and name are required' },
      { status: 400 }
    )
  }

  // 重複チェック
  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'User already exists' },
      { status: 409 }
    )
  }

  // ユーザー作成
  const user = await createUser(email, password, name, role || Role.AGENT)

  return NextResponse.json({ user })
}
```

#### `src/app/api/admin/users/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

// ユーザー更新（役割変更）
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { role, name } = await req.json()

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      role: role || undefined,
      name: name || undefined,
    },
  })

  return NextResponse.json({ user: updated })
}

// ユーザー削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  // 自分自身は削除できない
  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: 'Cannot delete yourself' },
      { status: 400 }
    )
  }

  await prisma.user.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
```

### 3. ユーザー管理画面

#### `src/app/admin/users/page.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Role } from '@prisma/client'

export default function UsersManagementPage() {
  const [users, setUsers] = useState([])
  const [showCreate, setShowCreate] = useState(false)

  // 新規ユーザーフォーム
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: Role.AGENT,
  })

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(data.users)
  }

  async function createUser() {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error)
        return
      }

      setShowCreate(false)
      setNewUser({ email: '', password: '', name: '', role: Role.AGENT })
      loadUsers()
    } catch (error) {
      console.error('Failed to create user:', error)
      alert('ユーザー作成に失敗しました')
    }
  }

  async function updateUserRole(userId: string, role: Role) {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    loadUsers()
  }

  async function deleteUser(userId: string) {
    if (!confirm('このユーザーを削除しますか？')) return

    await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    })
    loadUsers()
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ユーザー管理</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          新規ユーザー作成
        </button>
      </div>

      {/* 新規作成フォーム */}
      {showCreate && (
        <div className="mb-6 rounded border bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">新規ユーザー</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">メールアドレス</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">パスワード</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">名前</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                className="mt-1 w-full rounded border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">役割</label>
              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value as Role })
                }
                className="mt-1 w-full rounded border p-2"
              >
                <option value={Role.ADMIN}>Admin</option>
                <option value={Role.AGENT}>Agent</option>
                <option value={Role.VIEWER}>Viewer</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createUser}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                作成
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded border px-4 py-2 hover:bg-gray-100"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ユーザー一覧 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">名前</th>
              <th className="border p-2 text-left">メールアドレス</th>
              <th className="border p-2 text-left">役割</th>
              <th className="border p-2 text-left">作成日</th>
              <th className="border p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="border p-2">{user.name}</td>
                <td className="border p-2">{user.email}</td>
                <td className="border p-2">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      updateUserRole(user.id, e.target.value as Role)
                    }
                    className="rounded border p-1"
                  >
                    <option value={Role.ADMIN}>Admin</option>
                    <option value={Role.AGENT}>Agent</option>
                    <option value={Role.VIEWER}>Viewer</option>
                  </select>
                </td>
                <td className="border p-2 text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                </td>
                <td className="border p-2">
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="text-red-600 hover:underline"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

## テスト項目
- [ ] Admin画面にアクセスできる（Admin）
- [ ] Agent/ViewerはAdmin画面にアクセスできない
- [ ] ユーザー一覧が表示される
- [ ] ユーザーを作成できる
- [ ] ユーザーの役割を変更できる
- [ ] ユーザーを削除できる
- [ ] 自分自身は削除できない

## 備考
- Phase 2 でユーザー招待機能（メール送信）
- Phase 2 でパスワードリセット機能
- Phase 2 でチーム/グループ管理
