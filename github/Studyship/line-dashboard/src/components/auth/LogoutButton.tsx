'use client'

import { signOut } from 'next-auth/react'

export function LogoutButton() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      ログアウト
    </button>
  )
}
