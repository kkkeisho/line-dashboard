import { NextRequest, NextResponse } from 'next/server'
import { WebhookEvent } from '@line/bot-sdk'
import { validateSignature, verifyLineConfig } from '@/lib/line'
import { handleWebhookEvent } from '@/lib/line-handler'

/**
 * LINE Webhook endpoint
 * Receives events from LINE Messaging API
 *
 * @see https://developers.line.biz/en/reference/messaging-api/#webhook-event-objects
 */
export async function POST(req: NextRequest) {
  try {
    // Verify LINE configuration
    if (!verifyLineConfig()) {
      console.error('LINE configuration is missing')
      return NextResponse.json(
        { error: 'LINE configuration error' },
        { status: 500 }
      )
    }

    // Get raw body for signature validation
    const body = await req.text()
    const signature = req.headers.get('x-line-signature')

    // Check if signature header exists
    if (!signature) {
      console.error('Missing x-line-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Validate signature
    if (!validateSignature(body, signature)) {
      console.error('Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse webhook body
    let data: any
    try {
      data = JSON.parse(body)
    } catch (error) {
      console.error('Failed to parse webhook body:', error)
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const events: WebhookEvent[] = data.events || []

    console.log(`Received ${events.length} webhook event(s)`)

    // Process events asynchronously
    // Webhook must return 200 immediately to avoid retries
    Promise.all(
      events.map((event) =>
        handleWebhookEvent(event).catch((error) => {
          console.error('Failed to process event:', {
            type: event.type,
            error: error.message,
          })
        })
      )
    ).catch((error) => {
      console.error('Webhook event processing error:', error)
    })

    // Return success immediately
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle GET requests for webhook verification
 * LINE Developers Console may send GET requests to verify the endpoint
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'LINE Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  })
}
