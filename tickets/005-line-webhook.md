# #005 LINE Messaging API Webhook受信

**優先度**: 最高
**Phase**: 3 - LINE連携
**依存**: #001, #002
**担当**: Backend Developer

## 目的
LINE公式アカウントからのWebhookを受信し、メッセージイベントを処理できるようにする。

## 受け入れ基準
- [ ] LINE Webhook エンドポイントが実装されている
- [ ] LINE署名検証が正しく動作する
- [ ] メッセージイベントを受信できる
- [ ] Webhook URLをLINE Developersコンソールに設定できる
- [ ] エラーハンドリングが適切に実装されている

## 実装詳細

### 1. LINE SDK セットアップ

#### `src/lib/line.ts`
```typescript
import { Client, WebhookEvent, TextMessage } from '@line/bot-sdk'

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
}

export const lineClient = new Client(config)

export function validateSignature(body: string, signature: string): boolean {
  const crypto = require('crypto')
  const hash = crypto
    .createHmac('SHA256', config.channelSecret)
    .update(body)
    .digest('base64')

  return hash === signature
}
```

### 2. Webhook エンドポイント

#### `src/app/api/webhooks/line/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { WebhookEvent } from '@line/bot-sdk'
import { validateSignature } from '@/lib/line'
import { handleWebhookEvent } from '@/lib/line-handler'

export async function POST(req: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await req.text()
    const signature = req.headers.get('x-line-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // 署名検証
    if (!validateSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // イベント処理
    const data = JSON.parse(body)
    const events: WebhookEvent[] = data.events || []

    // イベントを非同期で処理（Webhookはすぐに200を返す必要がある）
    Promise.all(events.map(handleWebhookEvent)).catch((error) => {
      console.error('Webhook event processing error:', error)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 3. イベントハンドラ

#### `src/lib/line-handler.ts`
```typescript
import { WebhookEvent, MessageEvent, TextMessage } from '@line/bot-sdk'
import { prisma } from './prisma'
import { lineClient } from './line'

export async function handleWebhookEvent(event: WebhookEvent) {
  try {
    console.log('Processing event:', event.type)

    switch (event.type) {
      case 'message':
        await handleMessageEvent(event)
        break
      case 'follow':
        await handleFollowEvent(event)
        break
      case 'unfollow':
        await handleUnfollowEvent(event)
        break
      default:
        console.log('Unhandled event type:', event.type)
    }
  } catch (error) {
    console.error('Event handling error:', error)
    throw error
  }
}

async function handleMessageEvent(event: MessageEvent) {
  const { message, source, timestamp } = event

  // テキストメッセージのみ処理（MVP）
  if (message.type !== 'text') {
    console.log('Non-text message ignored:', message.type)
    return
  }

  const lineUserId = source.userId
  if (!lineUserId) {
    console.log('No userId in source')
    return
  }

  // Contact取得または作成（#006で実装）
  // Conversation取得または作成（#008で実装）
  // Message保存（#006で実装）

  console.log('Message received:', {
    userId: lineUserId,
    text: (message as TextMessage).text,
  })
}

async function handleFollowEvent(event: any) {
  const lineUserId = event.source.userId

  // プロフィール取得
  const profile = await lineClient.getProfile(lineUserId)

  // Contact作成（#006で実装）
  console.log('New follower:', profile.displayName)
}

async function handleUnfollowEvent(event: any) {
  const lineUserId = event.source.userId

  // Contact を isBlocked = true に更新（#006で実装）
  console.log('User unfollowed:', lineUserId)
}
```

### 4. 環境変数設定（.env）
```bash
LINE_CHANNEL_ACCESS_TOKEN="your_channel_access_token"
LINE_CHANNEL_SECRET="your_channel_secret"
```

### 5. LINE Developersコンソール設定

1. LINE Developersコンソールにログイン
2. チャネル基本設定 > Webhook設定
3. Webhook URL: `https://your-domain.com/api/webhooks/line`
4. Webhookの利用: オン
5. 検証ボタンで接続確認

### 6. ローカル開発用（ngrok）

```bash
# ngrokでローカルサーバーを公開
npx ngrok http 3000

# 表示されたURL（例: https://xxxx.ngrok.io）を
# LINE DevelopersのWebhook URLに設定
# https://xxxx.ngrok.io/api/webhooks/line
```

## テスト項目
- [ ] LINE公式アカウントにメッセージを送信する
- [ ] Webhookエンドポイントがリクエストを受信する
- [ ] 署名検証が成功する
- [ ] イベントタイプが正しく判定される
- [ ] エラー時に500が返され、ログが記録される

## 備考
- Webhookは200を即座に返す必要があるため、重い処理は非同期化
- Phase 2 で画像・スタンプ等の非テキストメッセージ対応
- Phase 2 でWebhook再送処理・冪等性保証を実装
