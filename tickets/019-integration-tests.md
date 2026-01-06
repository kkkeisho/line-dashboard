# #019 統合テスト・E2Eテスト

**優先度**: 高
**Phase**: 8 - テスト・リリース
**依存**: #001-#018
**担当**: QA/Backend/Frontend

## 目的
主要な機能について統合テスト・E2Eテストを実装し、品質を保証する。

## 受け入れ基準
- [ ] APIテスト（Jest/Supertest）が実装されている
- [ ] E2Eテスト（Playwright/Cypress）が実装されている
- [ ] 主要なユーザーフローがテストされている
- [ ] テストが CI/CD パイプラインに組み込まれている
- [ ] テストカバレッジが50%以上

## 実装詳細

### 1. テスト環境セットアップ

#### `package.json`
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

#### `jest.config.js`
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
}
```

### 2. APIテスト

#### `__tests__/api/conversations.test.ts`
```typescript
import { prisma } from '@/lib/prisma'
import { createUser } from '@/lib/auth'
import { Role } from '@prisma/client'

describe('Conversations API', () => {
  let adminUser: any
  let agentUser: any
  let viewerUser: any

  beforeAll(async () => {
    // テストユーザー作成
    adminUser = await createUser(
      'admin@test.com',
      'password',
      'Admin User',
      Role.ADMIN
    )
    agentUser = await createUser(
      'agent@test.com',
      'password',
      'Agent User',
      Role.AGENT
    )
    viewerUser = await createUser(
      'viewer@test.com',
      'password',
      'Viewer User',
      Role.VIEWER
    )
  })

  afterAll(async () => {
    // クリーンアップ
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin@test.com', 'agent@test.com', 'viewer@test.com'],
        },
      },
    })
    await prisma.$disconnect()
  })

  describe('GET /api/conversations', () => {
    it('should return conversations list', async () => {
      // テスト実装
    })

    it('should filter by status', async () => {
      // テスト実装
    })

    it('should require authentication', async () => {
      // テスト実装
    })
  })

  describe('POST /api/conversations/:id/reply', () => {
    it('should allow agent to reply', async () => {
      // テスト実装
    })

    it('should deny viewer to reply', async () => {
      // テスト実装
    })

    it('should validate message text', async () => {
      // テスト実装
    })
  })

  describe('PATCH /api/conversations/:id/status', () => {
    it('should update status', async () => {
      // テスト実装
    })

    it('should enforce optimistic lock', async () => {
      // テスト実装
    })
  })
})
```

#### `__tests__/api/line-webhook.test.ts`
```typescript
describe('LINE Webhook', () => {
  it('should validate signature', async () => {
    // テスト実装
  })

  it('should create contact on follow event', async () => {
    // テスト実装
  })

  it('should save inbound message', async () => {
    // テスト実装
  })

  it('should run triage on message', async () => {
    // テスト実装
  })
})
```

### 3. E2Eテスト

#### `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### `e2e/login.spec.ts`
```typescript
import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/inbox')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=正しくありません')).toBeVisible()
  })
})
```

#### `e2e/inbox.spec.ts`
```typescript
import { test, expect } from '@playwright/test'

test.describe('Inbox', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('/login')
    await page.fill('input[type="email"]', 'agent@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/inbox')
  })

  test('should display conversations', async ({ page }) => {
    await expect(page.locator('text=Inbox')).toBeVisible()
    // 会話リストが表示されることを確認
  })

  test('should filter by status', async ({ page }) => {
    await page.selectOption('select[name="status"]', 'NEW')
    // フィルタが適用されることを確認
  })

  test('should search conversations', async ({ page }) => {
    await page.fill('input[placeholder*="検索"]', 'テスト')
    // 検索結果が表示されることを確認
  })
})
```

#### `e2e/conversation-detail.spec.ts`
```typescript
import { test, expect } from '@playwright/test'

test.describe('Conversation Detail', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('/login')
    await page.fill('input[type="email"]', 'agent@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
  })

  test('should display message timeline', async ({ page }) => {
    // 会話詳細に移動
    await page.goto('/conversations/test-conversation-id')
    await expect(page.locator('text=メッセージ')).toBeVisible()
  })

  test('should send reply', async ({ page }) => {
    await page.goto('/conversations/test-conversation-id')

    await page.fill('textarea', 'テスト返信')
    await page.click('button:has-text("送信")')

    await expect(page.locator('text=テスト返信')).toBeVisible()
  })

  test('should update status', async ({ page }) => {
    await page.goto('/conversations/test-conversation-id')

    await page.selectOption('select[name="status"]', 'WORKING')
    // ステータスが更新されることを確認
  })
})
```

### 4. テストデータセットアップ

#### `__tests__/helpers/seed.ts`
```typescript
import { prisma } from '@/lib/prisma'
import { Role, Status } from '@prisma/client'

export async function seedTestData() {
  // テストユーザー作成
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Admin User',
      role: Role.ADMIN,
      passwordHash: 'hashed',
    },
  })

  // テストContact作成
  const contact = await prisma.contact.create({
    data: {
      lineUserId: 'test-line-user',
      displayName: 'Test User',
      followedAt: new Date(),
    },
  })

  // テストConversation作成
  const conversation = await prisma.conversation.create({
    data: {
      contactId: contact.id,
      status: Status.NEW,
    },
  })

  return { admin, contact, conversation }
}

export async function cleanupTestData() {
  await prisma.message.deleteMany()
  await prisma.conversationTag.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tag.deleteMany()
}
```

## テスト項目
- [ ] ログインフロー
- [ ] Inbox一覧表示・フィルタ・検索
- [ ] Conversation詳細表示
- [ ] メッセージ送信
- [ ] ステータス変更
- [ ] 担当者アサイン
- [ ] タグ管理
- [ ] 権限チェック（Admin/Agent/Viewer）
- [ ] LINE Webhook受信
- [ ] トリアージ実行

## 備考
- CI/CD パイプラインに組み込む（GitHub Actions等）
- テストDBは別途用意（Docker等）
- 重要なエッジケース・エラーハンドリングもテスト
