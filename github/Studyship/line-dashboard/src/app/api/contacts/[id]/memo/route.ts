import { NextRequest, NextResponse } from 'next/server'
import { requireAgentOrAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit-service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAgentOrAdmin(req)
  if (session instanceof NextResponse) {
    return session
  }

  const { id: contactId } = await params
  const { memo } = await req.json()

  // 現在の値取得
  const current = await prisma.contact.findUnique({
    where: { id: contactId },
  })

  if (!current) {
    return NextResponse.json(
      { error: 'Contact not found' },
      { status: 404 }
    )
  }

  // メモ更新
  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: { memo },
  })

  // 監査ログ記録
  await createAuditLog({
    userId: session.user.id,
    action: 'MEMO_UPDATED',
    changes: {
      contactId,
      from: current.memo,
      to: memo,
    },
  })

  return NextResponse.json({ contact: updated })
}
