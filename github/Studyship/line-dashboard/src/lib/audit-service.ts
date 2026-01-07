import { prisma } from './prisma'

interface CreateAuditLogParams {
  conversationId?: string
  userId: string
  action: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * 監査ログを作成する
 * システムで行われたすべての重要な操作を記録
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  const { conversationId, userId, action, changes, ipAddress, userAgent } = params

  return await prisma.auditLog.create({
    data: {
      conversationId,
      userId,
      action,
      changes: changes || {},
      ipAddress,
      userAgent,
    },
  })
}

/**
 * 特定の会話に関連する監査ログを取得
 */
export async function getConversationAuditLogs(conversationId: string) {
  return await prisma.auditLog.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })
}

/**
 * 特定ユーザーの監査ログを取得
 */
export async function getUserAuditLogs(userId: string, limit = 100) {
  return await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      conversation: {
        select: {
          id: true,
          status: true,
          contact: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  })
}

/**
 * すべての監査ログを取得（管理者用）
 */
export async function getAllAuditLogs(limit = 100, offset = 0) {
  return await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      conversation: {
        select: {
          id: true,
          status: true,
          contact: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  })
}
