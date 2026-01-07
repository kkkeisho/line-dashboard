'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Role } from '@prisma/client'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== Role.ADMIN) {
      router.push('/inbox')
    }
  }, [status, session, router])

  if (status === 'loading' || !session || session?.user?.role !== Role.ADMIN) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* サイドバー */}
      <aside className="w-64 border-r bg-white shadow-sm">
        <div className="p-6">
          <h2 className="mb-6 text-xl font-bold text-gray-800">管理画面</h2>
          <nav className="space-y-1">
            <Link
              href="/admin/users"
              className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === '/admin/users'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              ユーザー管理
            </Link>
            <Link
              href="/admin/tags"
              className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === '/admin/tags'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              タグ管理
            </Link>
            <div className="my-4 border-t" />
            <Link
              href="/inbox"
              className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Inboxに戻る
            </Link>
          </nav>
        </div>
      </aside>

      {/* メインエリア */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
