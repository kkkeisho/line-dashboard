import { Client, ClientConfig } from '@line/bot-sdk'
import crypto from 'crypto'

// LINE Bot SDK Configuration
const config: ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
}

// LINE Bot Client instance
export const lineClient = new Client(config)

/**
 * Validate LINE webhook signature
 * @param body - Raw request body as string
 * @param signature - x-line-signature header value
 * @returns true if signature is valid
 */
export function validateSignature(body: string, signature: string): boolean {
  if (!config.channelSecret) {
    console.error('LINE_CHANNEL_SECRET is not configured')
    return false
  }

  const hash = crypto
    .createHmac('SHA256', config.channelSecret)
    .update(body)
    .digest('base64')

  return hash === signature
}

/**
 * Get LINE user profile
 * @param userId - LINE user ID
 * @returns User profile with displayName and pictureUrl
 */
export async function getLineProfile(userId: string) {
  try {
    const profile = await lineClient.getProfile(userId)
    return {
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    }
  } catch (error) {
    console.error('Failed to get LINE profile:', error)
    throw error
  }
}

/**
 * Send text message to LINE user
 * @param userId - LINE user ID
 * @param text - Message text
 */
export async function sendTextMessage(userId: string, text: string) {
  try {
    await lineClient.pushMessage(userId, {
      type: 'text',
      text,
    })
  } catch (error) {
    console.error('Failed to send LINE message:', error)
    throw error
  }
}

/**
 * Verify LINE configuration
 * @returns true if configuration is valid
 */
export function verifyLineConfig(): boolean {
  if (!config.channelAccessToken || !config.channelSecret) {
    console.error('LINE configuration is incomplete')
    return false
  }
  return true
}
