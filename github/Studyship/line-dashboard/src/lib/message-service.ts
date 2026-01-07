import { prisma } from './prisma'
import { Direction } from '@prisma/client'

/**
 * Save inbound message (from LINE user)
 * Includes idempotency check to prevent duplicate messages
 *
 * @param conversationId - Conversation ID
 * @param text - Message text
 * @param lineMessageId - LINE's message ID (for deduplication)
 * @param timestamp - Message timestamp
 * @param rawPayload - Raw webhook payload
 * @returns Saved message record
 */
export async function saveInboundMessage(
  conversationId: string,
  text: string,
  lineMessageId: string,
  timestamp: Date,
  rawPayload: any
) {
  // Check for duplicate message (idempotency)
  const existing = await prisma.message.findUnique({
    where: { lineMessageId },
  })

  if (existing) {
    console.log('Duplicate message ignored:', lineMessageId)
    return existing
  }

  // Debug: Check rawPayload before saving
  console.log('About to save message with rawPayload:', {
    conversationId,
    text: text.substring(0, 30),
    lineMessageId,
    rawPayloadType: typeof rawPayload,
    rawPayloadIsNull: rawPayload === null,
    rawPayloadIsUndefined: rawPayload === undefined,
  })

  // Save new message
  const message = await prisma.message.create({
    data: {
      conversationId,
      direction: Direction.INBOUND,
      text,
      lineMessageId,
      timestamp,
      rawPayload,
    },
  })

  // Update conversation metadata
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastInboundAt: timestamp,
      lastMessagePreview: text.substring(0, 100),
      updatedAt: new Date(),
    },
  })

  console.log('Inbound message saved:', {
    messageId: message.id,
    conversationId,
    text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
  })

  return message
}

/**
 * Save outbound message (to LINE user)
 *
 * @param conversationId - Conversation ID
 * @param text - Message text
 * @param lineMessageId - LINE's message ID (optional)
 * @returns Saved message record
 */
export async function saveOutboundMessage(
  conversationId: string,
  text: string,
  lineMessageId?: string
) {
  const now = new Date()

  const message = await prisma.message.create({
    data: {
      conversationId,
      direction: Direction.OUTBOUND,
      text,
      lineMessageId,
      timestamp: now,
    },
  })

  // Update conversation metadata
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastOutboundAt: now,
      lastMessagePreview: text.substring(0, 100),
      updatedAt: now,
    },
  })

  console.log('Outbound message saved:', {
    messageId: message.id,
    conversationId,
    text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
  })

  return message
}

/**
 * Get messages for a conversation
 *
 * @param conversationId - Conversation ID
 * @param limit - Number of messages to retrieve (default: 50)
 * @returns Array of messages ordered by timestamp descending
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50
) {
  return await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
}
