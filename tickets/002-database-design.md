# #002 データベース設計・マイグレーション

**優先度**: 最高
**Phase**: 1 - 基盤構築
**依存**: #001
**担当**: Backend Lead

## 目的
アプリケーションの基盤となるデータベーススキーマを設計し、Prisma マイグレーションとして実装する。

## 受け入れ基準
- [ ] Prisma スキーマファイル (`schema.prisma`) が完成している
- [ ] 全テーブルのマイグレーションが実行され、データベースに反映されている
- [ ] シードデータ（初期ユーザー・タグ）が投入できる
- [ ] ER図または設計ドキュメントが作成されている
- [ ] インデックスが適切に設定されている

## 実装詳細

### 1. Prisma スキーマ設計

#### users（社内ユーザー）
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  role          Role     @default(AGENT)
  passwordHash  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  assignedConversations Conversation[]
  auditLogs             AuditLog[]

  @@index([email])
  @@index([role])
}

enum Role {
  ADMIN
  AGENT
  VIEWER
}
```

#### contacts（LINEユーザー）
```prisma
model Contact {
  id          String    @id @default(cuid())
  lineUserId  String    @unique
  displayName String
  pictureUrl  String?
  followedAt  DateTime
  isBlocked   Boolean   @default(false)
  memo        String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  conversations     Conversation[]
  conversationTags  ConversationTag[]

  @@index([lineUserId])
  @@index([displayName])
}
```

#### conversations（会話スレッド）
```prisma
model Conversation {
  id                   String       @id @default(cuid())
  contactId            String
  status               Status       @default(NEW)
  assignedUserId       String?
  priority             Priority     @default(MEDIUM)
  urgency              Urgency      @default(ANYTIME)
  isComplaint          Boolean      @default(false)
  complaintType        ComplaintType?
  lastInboundAt        DateTime?
  lastOutboundAt       DateTime?
  lastMessagePreview   String?
  slaDeadline          DateTime?
  version              Int          @default(0)
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  contact       Contact            @relation(fields: [contactId], references: [id])
  assignedUser  User?              @relation(fields: [assignedUserId], references: [id])
  messages      Message[]
  tags          ConversationTag[]
  auditLogs     AuditLog[]

  @@index([contactId])
  @@index([status])
  @@index([assignedUserId])
  @@index([lastInboundAt])
  @@index([priority, urgency])
}

enum Status {
  NEW
  WORKING
  PENDING
  RESOLVED
  CLOSED
  NO_ACTION_NEEDED
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum Urgency {
  NOW
  TODAY
  THIS_WEEK
  ANYTIME
}

enum ComplaintType {
  BILLING
  QUALITY
  DELAY
  ATTITUDE
  OTHER
}
```

#### messages（メッセージ）
```prisma
model Message {
  id              String    @id @default(cuid())
  conversationId  String
  direction       Direction
  text            String?
  lineMessageId   String?   @unique
  timestamp       DateTime
  rawPayload      Json?
  createdAt       DateTime  @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id])

  @@index([conversationId])
  @@index([timestamp])
  @@index([direction])
}

enum Direction {
  INBOUND
  OUTBOUND
}
```

#### tags（タグマスタ）
```prisma
model Tag {
  id          String   @id @default(cuid())
  name        String   @unique
  color       String?
  createdAt   DateTime @default(now())

  conversationTags ConversationTag[]
}
```

#### conversation_tags（会話×タグの中間テーブル）
```prisma
model ConversationTag {
  id             String   @id @default(cuid())
  conversationId String
  contactId      String
  tagId          String
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id])
  contact      Contact      @relation(fields: [contactId], references: [id])
  tag          Tag          @relation(fields: [tagId], references: [id])

  @@unique([conversationId, tagId])
  @@index([conversationId])
  @@index([tagId])
}
```

#### audit_logs（監査ログ）
```prisma
model AuditLog {
  id             String   @id @default(cuid())
  conversationId String?
  userId         String
  action         String
  changes        Json?
  ipAddress      String?
  userAgent      String?
  createdAt      DateTime @default(now())

  conversation Conversation? @relation(fields: [conversationId], references: [id])
  user         User          @relation(fields: [userId], references: [id])

  @@index([conversationId])
  @@index([userId])
  @@index([createdAt])
}
```

### 2. マイグレーション実行
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 3. シードデータ作成（prisma/seed.ts）
```typescript
import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Admin ユーザー作成
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: Role.ADMIN,
      passwordHash: 'hashed_password_here', // 実際にはbcryptでハッシュ化
    },
  })

  // デフォルトタグ作成
  await prisma.tag.createMany({
    data: [
      { name: 'VIP', color: '#FFD700' },
      { name: '要注意', color: '#FF0000' },
      { name: '継続中', color: '#00FF00' },
      { name: '解約候補', color: '#FFA500' },
    ],
  })

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### 4. ER図作成
- Prisma Studio または Prisma ERD Generator を使用
- または mermaid.js で図を作成し、ドキュメント化

## テスト項目
- [ ] `npx prisma migrate dev` が成功する
- [ ] Prisma Studio でテーブルが確認できる
- [ ] シードデータが投入される
- [ ] インデックスが設定されている（EXPLAIN ANALYZE で確認）

## 備考
- 楽観的ロック用の `version` カラムは競合検知に使用
- `rawPayload` は LINE からの生JSONを保存（デバッグ用）
- Phase 2 で `templates`, `sla_rules` テーブルを追加予定
