import { prisma } from './prisma'
import { Status, Priority, Urgency } from '@prisma/client'

/**
 * Get existing conversation or create new one for a contact
 * By default, looks for the most recent non-closed conversation
 *
 * @param contactId - Contact ID
 * @returns Conversation record
 */
export async function getOrCreateConversation(contactId: string) {
  // Try to find an active (non-closed) conversation for this contact
  let conversation = await prisma.conversation.findFirst({
    where: {
      contactId,
      status: {
        notIn: [Status.CLOSED, Status.RESOLVED],
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  if (conversation) {
    console.log('Using existing conversation:', conversation.id)
    return conversation
  }

  // Create new conversation if no active conversation exists
  try {
    conversation = await prisma.conversation.create({
      data: {
        contactId,
        status: Status.NEW,
        priority: Priority.MEDIUM,
        urgency: Urgency.ANYTIME,
        isComplaint: false,
      },
    })

    console.log('New conversation created:', {
      id: conversation.id,
      contactId,
      status: conversation.status,
    })

    return conversation
  } catch (error) {
    console.error('Failed to create conversation:', error)
    throw error
  }
}

/**
 * Update conversation status
 *
 * @param conversationId - Conversation ID
 * @param status - New status
 * @param userId - User ID making the change (for audit)
 */
export async function updateConversationStatus(
  conversationId: string,
  status: Status,
  userId?: string
) {
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status,
      updatedAt: new Date(),
    },
  })

  console.log('Conversation status updated:', {
    conversationId,
    newStatus: status,
  })

  return conversation
}

/**
 * Assign conversation to a user
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID to assign
 */
export async function assignConversation(
  conversationId: string,
  userId: string
) {
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      assignedUserId: userId,
      status: Status.WORKING,
      updatedAt: new Date(),
    },
  })

  console.log('Conversation assigned:', {
    conversationId,
    assignedUserId: userId,
  })

  return conversation
}

/**
 * Update conversation priority and urgency
 *
 * @param conversationId - Conversation ID
 * @param priority - Priority level
 * @param urgency - Urgency level
 */
export async function updateConversationPriority(
  conversationId: string,
  priority: Priority,
  urgency: Urgency
) {
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      priority,
      urgency,
      updatedAt: new Date(),
    },
  })

  console.log('Conversation priority updated:', {
    conversationId,
    priority,
    urgency,
  })

  return conversation
}

/**
 * Get all conversations for a contact
 *
 * @param contactId - Contact ID
 * @returns Array of conversations ordered by updatedAt descending
 */
export async function getContactConversations(contactId: string) {
  return await prisma.conversation.findMany({
    where: { contactId },
    orderBy: { updatedAt: 'desc' },
    include: {
      contact: true,
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}

/**
 * Get conversation by ID with full details
 *
 * @param id - Conversation ID
 * @returns Conversation with contact, user, messages, and tags
 */
export async function getConversationById(id: string) {
  return await prisma.conversation.findUnique({
    where: { id },
    include: {
      contact: true,
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        orderBy: {
          timestamp: 'asc',
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })
}

/**
 * Determine if a conversation needs action (response required)
 *
 * @param conversation - Conversation object
 * @returns true if conversation needs action
 */
export function needsAction(conversation: any): boolean {
  // No action needed if status is NO_ACTION_NEEDED or CLOSED
  if (
    conversation.status === Status.NO_ACTION_NEEDED ||
    conversation.status === Status.CLOSED
  ) {
    return false
  }

  // No inbound message means no action needed
  if (!conversation.lastInboundAt) {
    return false
  }

  // No outbound message yet, so action is needed
  if (!conversation.lastOutboundAt) {
    return true
  }

  // Action needed if last inbound is after last outbound
  return conversation.lastInboundAt > conversation.lastOutboundAt
}

/**
 * Get conversations that need action (response required)
 *
 * @param limit - Maximum number of conversations to return
 * @returns Array of conversations needing action
 */
export async function getNeedsActionConversations(limit = 50) {
  const conversations = await prisma.conversation.findMany({
    where: {
      status: {
        in: [Status.NEW, Status.WORKING, Status.PENDING],
      },
    },
    include: {
      contact: true,
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [
      { urgency: 'asc' }, // NOW first, then TODAY, THIS_WEEK, ANYTIME
      { lastInboundAt: 'desc' },
    ],
    take: limit,
  })

  // Filter to only those that actually need action
  return conversations.filter(needsAction)
}
