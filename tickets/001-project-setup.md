# #001 プロジェクトセットアップ・技術スタック構築

**優先度**: 最高
**Phase**: 1 - 基盤構築
**依存**: なし
**担当**: Backend/Frontend Lead

## 目的
プロジェクトの基盤となる技術スタック・開発環境を構築し、チーム全体が開発を開始できる状態にする。

## 受け入れ基準
- [ ] Next.js プロジェクトが初期化され、ローカルで起動できる
- [ ] PostgreSQL データベースが接続できる
- [ ] ORM（Prisma推奨）がセットアップされている
- [ ] 環境変数管理（.env）が設定されている
- [ ] TypeScript が設定され、型チェックが動作する
- [ ] ESLint/Prettier が設定され、コードフォーマットが統一される
- [ ] Git リポジトリ・ブランチ戦略が確立されている
- [ ] README.md にセットアップ手順が記載されている

## 実装詳細

### 1. Next.js プロジェクト初期化
```bash
npx create-next-app@latest line-dashboard --typescript --tailwind --app
cd line-dashboard
```

### 2. 必須パッケージのインストール
```bash
# ORM
npm install prisma @prisma/client

# 認証（NextAuth.js 推奨）
npm install next-auth

# LINE SDK
npm install @line/bot-sdk

# API関連
npm install axios zod

# UI（任意）
npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge

# 開発ツール
npm install -D @types/node tsx
```

### 3. データベース接続設定
- PostgreSQL インスタンスの準備（ローカル/Docker/クラウド）
- Prisma 初期化: `npx prisma init`
- `.env` に DATABASE_URL を設定

### 4. 環境変数テンプレート（.env.example）
```
DATABASE_URL="postgresql://user:password@localhost:5432/line_dashboard"
LINE_CHANNEL_ACCESS_TOKEN="your_line_channel_access_token"
LINE_CHANNEL_SECRET="your_line_channel_secret"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 5. プロジェクト構成
```
line-dashboard/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React コンポーネント
│   ├── lib/              # ユーティリティ・DB接続
│   ├── types/            # TypeScript型定義
│   └── hooks/            # カスタムフック
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

### 6. 開発スクリプト（package.json）
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

## テスト項目
- [ ] `npm run dev` でローカルサーバーが起動する
- [ ] `npm run build` がエラーなく完了する
- [ ] `npm run lint` が正常に実行される
- [ ] データベース接続が成功する（Prisma Studio で確認）

## 備考
- Docker Compose でローカルPostgreSQLを立ち上げる場合は `docker-compose.yml` も追加
- チーム内でセットアップ手順を共有し、全員が環境構築できることを確認
- CI/CD設定は後続チケットで実装（任意）
