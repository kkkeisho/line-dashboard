import {
  WebhookEvent,
  MessageEvent,
  FollowEvent,
  UnfollowEvent,
  TextMessage,
} from '@line/bot-sdk'
import { getOrCreateContact, markContactAsBlocked, unblockContact } from './contact-service'
import { getOrCreateConversation } from './conversation-service'
import { saveInboundMessage } from './message-service'
import { runTriage } from './triage-service'

/**
 * Main webhook event handler
 * Routes events to specific handlers based on event type
 */
export async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  try {
    console.log('Processing webhook event:', {
      type: event.type,
      timestamp: event.timestamp,
    })

    switch (event.type) {
      case 'message':
        await handleMessageEvent(event as MessageEvent)
        break
      case 'follow':
        await handleFollowEvent(event as FollowEvent)
        break
      case 'unfollow':
        await handleUnfollowEvent(event as UnfollowEvent)
        break
      default:
        console.log('Unhandled event type:', event.type)
    }
  } catch (error) {
    console.error('Event handling error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    throw error
  }
}

/**
 * Handle incoming message events
 * Currently supports text messages only (MVP)
 */
async function handleMessageEvent(event: MessageEvent): Promise<void> {
  const { message, source, timestamp, replyToken } = event

  // Only process text messages in MVP
  if (message.type !== 'text') {
    console.log('Non-text message ignored:', message.type)
    return
  }

  const lineUserId = source.userId
  if (!lineUserId) {
    console.log('No userId in message source')
    return
  }

  const textMessage = message as TextMessage
  console.log('Message received:', {
    userId: lineUserId,
    text: textMessage.text,
    messageId: message.id,
    timestamp,
  })

  try {
    // 1. Find or create Contact
    const contact = await getOrCreateContact(lineUserId)

    // 2. Find or create Conversation
    const conversation = await getOrCreateConversation(contact.id)

    // 3. Save Message to database
    // Serialize event object to ensure it's JSON-safe
    const rawPayload = event ? JSON.parse(JSON.stringify(event)) : null
    console.log('rawPayload prepared:', {
      isNull: rawPayload === null,
      type: typeof rawPayload,
      hasKeys: rawPayload ? Object.keys(rawPayload).length : 0
    })

    await saveInboundMessage(
      conversation.id,
      textMessage.text,
      message.id,
      new Date(timestamp),
      rawPayload // Store serialized event as rawPayload
    )

    // Run triage analysis on the inbound message
    await runTriage(conversation.id, textMessage.text)

    console.log('Message saved successfully:', {
      contactId: contact.id,
      conversationId: conversation.id,
      messageId: message.id,
    })
  } catch (error) {
    console.error('Failed to save message:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    throw error
  }
}

/**
 * Handle follow events (user adds bot as friend)
 * Creates a new Contact in the database
 */
async function handleFollowEvent(event: FollowEvent): Promise<void> {
  const lineUserId = event.source.userId
  if (!lineUserId) {
    console.log('No userId in follow event')
    return
  }

  try {
    // Create or update Contact (unblock if previously blocked)
    const contact = await getOrCreateContact(lineUserId)
    await unblockContact(lineUserId)

    console.log('New follower:', {
      userId: lineUserId,
      displayName: contact.displayName,
      contactId: contact.id,
    })
  } catch (error) {
    console.error('Failed to handle follow event:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    throw error
  }
}

/**
 * Handle unfollow events (user blocks bot)
 * Marks the Contact as blocked
 */
async function handleUnfollowEvent(event: UnfollowEvent): Promise<void> {
  const lineUserId = event.source.userId
  if (!lineUserId) {
    console.log('No userId in unfollow event')
    return
  }

  console.log('User unfollowed:', lineUserId)

  try {
    // Mark contact as blocked
    await markContactAsBlocked(lineUserId)

    console.log('Contact marked as blocked:', lineUserId)
  } catch (error) {
    console.error('Failed to handle unfollow event:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    throw error
  }
}
