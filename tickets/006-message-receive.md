# #006 メッセージ受信・保存処理

**優先度**: 最高
**Phase**: 3 - LINE連携
**依存**: #002, #005
**担当**: Backend Developer

## 目的
LINEから受信したメッセージをデータベースに保存し、Contact/Conversationを自動的に作成・更新する。

## 受け入れ基準
- [ ] 受信メッセージがmessagesテーブルに保存される
- [ ] 新規ユーザーの場合、自動的にContactが作成される
- [ ] 既存ユーザーのプロフィールが更新される
- [ ] Conversationが自動的に作成される（初回メッセージ時）
- [ ] Conversationのlast_inbound_atが更新される
- [ ] メッセージ受信後1分以内にInboxに反映される

## 実装詳細

### 1. Contact管理

#### `src/lib/contact-service.ts`
```typescript
import { prisma } from './prisma'
import { lineClient } from './line'

export async function getOrCreateContact(lineUserId: string) {
  // 既存のContact取得
  let contact = await prisma.contact.findUnique({
    where: { lineUserId },
  })

  if (contact) {
    return contact
  }

  // 新規の場合、LINEからプロフィール取得
  try {
    const profile = await lineClient.getProfile(lineUserId)

    contact = await prisma.contact.create({
      data: {
        lineUserId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        followedAt: new Date(),
      },
    })

    return contact
  } catch (error) {
    console.error('Failed to create contact:', error)
    throw error
  }
}

export async function updateContactProfile(lineUserId: string) {
  try {
    const profile = await lineClient.getProfile(lineUserId)

    await prisma.contact.update({
      where: { lineUserId },
      data: {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
      },
    })
  } catch (error) {
    console.error('Failed to update contact profile:', error)
  }
}

export async function markContactAsBlocked(lineUserId: string) {
  await prisma.contact.update({
    where: { lineUserId },
    data: { isBlocked: true },
  })
}
```

### 2. Message保存

#### `src/lib/message-service.ts`
```typescript
import { prisma } from './prisma'
import { Direction } from '@prisma/client'

export async function saveInboundMessage(
  conversationId: string,
  text: string,
  lineMessageId: string,
  timestamp: Date,
  rawPayload: any
) {
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

  // Conversation更新
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastInboundAt: timestamp,
      lastMessagePreview: text.substring(0, 100),
      updatedAt: new Date(),
    },
  })

  return message
}

export async function saveOutboundMessage(
  conversationId: string,
  text: string,
  lineMessageId?: string
) {
  const message = await prisma.message.create({
    data: {
      conversationId,
      direction: Direction.OUTBOUND,
      text,
      lineMessageId,
      timestamp: new Date(),
    },
  })

  // Conversation更新
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastOutboundAt: new Date(),
      lastMessagePreview: text.substring(0, 100),
      updatedAt: new Date(),
    },
  })

  return message
}
```

### 3. Webhook ハンドラ更新（#005の続き）

#### `src/lib/line-handler.ts`（更新）
```typescript
import { WebhookEvent, MessageEvent, TextMessage } from '@line/bot-sdk'
import { getOrCreateContact, updateContactProfile, markContactAsBlocked } from './contact-service'
import { getOrCreateConversation } from './conversation-service' // #008で実装
import { saveInboundMessage } from './message-service'

async function handleMessageEvent(event: MessageEvent) {
  const { message, source, timestamp } = event

  if (message.type !== 'text') {
    return
  }

  const lineUserId = source.userId
  if (!lineUserId) {
    return
  }

  try {
    // 1. Contact取得または作成
    const contact = await getOrCreateContact(lineUserId)

    // 2. Conversation取得または作成
    const conversation = await getOrCreateConversation(contact.id)

    // 3. Message保存
    await saveInboundMessage(
      conversation.id,
      (message as TextMessage).text,
      message.id,
      new Date(timestamp),
      event
    )

    console.log('Message saved successfully:', {
      contactId: contact.id,
      conversationId: conversation.id,
    })
  } catch (error) {
    console.error('Failed to handle message event:', error)
    throw error
  }
}

async function handleFollowEvent(event: any) {
  const lineUserId = event.source.userId

  try {
    const contact = await getOrCreateContact(lineUserId)
    console.log('New follower:', contact.displayName)
  } catch (error) {
    console.error('Failed to handle follow event:', error)
  }
}

async function handleUnfollowEvent(event: any) {
  const lineUserId = event.source.userId

  try {
    await markContactAsBlocked(lineUserId)
    console.log('User unfollowed:', lineUserId)
  } catch (error) {
    console.error('Failed to handle unfollow event:', error)
  }
}
```

### 4. 冪等性保証（重複メッセージ防止）

#### `src/lib/message-service.ts`（更新）
```typescript
export async function saveInboundMessage(
  conversationId: string,
  text: string,
  lineMessageId: string,
  timestamp: Date,
  rawPayload: any
) {
  // 既に同じlineMessageIdのメッセージが存在する場合はスキップ
  const existing = await prisma.message.findUnique({
    where: { lineMessageId },
  })

  if (existing) {
    console.log('Duplicate message ignored:', lineMessageId)
    return existing
  }

  // 新規メッセージ保存
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

  // Conversation更新
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastInboundAt: timestamp,
      lastMessagePreview: text.substring(0, 100),
      updatedAt: new Date(),
    },
  })

  return message
}
```

## テスト項目
- [ ] LINE公式アカウントに初めてメッセージを送る
- [ ] Contactが作成される
- [ ] Conversationが作成される
- [ ] Messageが保存される
- [ ] 同じユーザーから2通目のメッセージを送る
- [ ] 新しいConversationは作成されず、既存のConversationに追加される
- [ ] lastInboundAtが更新される
- [ ] 同じメッセージIDで再送されても重複保存されない

## 備考
- フォロー解除（unfollow）時はConversationは削除せず、isBlockedフラグで管理
- Phase 2 で画像・スタンプ等の非テキストメッセージ対応
- Phase 2 でメッセージ検索インデックス最適化
