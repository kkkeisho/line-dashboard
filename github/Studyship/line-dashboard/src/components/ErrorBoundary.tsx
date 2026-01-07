'use client'

export function PermissionDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">アクセス拒否</h1>
        <p className="mt-2 text-gray-600">
          この操作を行う権限がありません
        </p>
      </div>
    </div>
  )
}
