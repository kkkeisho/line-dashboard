# LINE Dashboard

LINEメッセージを管理するためのダッシュボードアプリケーション

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL
- **ORM**: Prisma
- **認証**: NextAuth.js
- **LINE API**: @line/bot-sdk

## プロジェクト構成

```
line-dashboard/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # Reactコンポーネント
│   ├── lib/              # ユーティリティ・DB接続
│   ├── types/            # TypeScript型定義
│   └── hooks/            # カスタムフック
├── prisma/
│   ├── schema.prisma     # データベーススキーマ
│   └── migrations/       # マイグレーションファイル
├── public/               # 静的ファイル
├── .env                  # 環境変数（gitignore）
├── .env.example          # 環境変数テンプレート
└── README.md
```

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd line-dashboard
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成：

```bash
cp .env.example .env
```

`.env` ファイルを編集して、必要な環境変数を設定：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/line_dashboard"
LINE_CHANNEL_ACCESS_TOKEN="your_line_channel_access_token"
LINE_CHANNEL_SECRET="your_line_channel_secret"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. データベースのセットアップ

PostgreSQLデータベースを作成：

```bash
createdb line_dashboard
```

または、Docker Composeを使用する場合：

```bash
docker-compose up -d
```

Prismaマイグレーションを実行：

```bash
npm run db:migrate
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 利用可能なスクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - 本番用ビルドを作成
- `npm run start` - 本番サーバーを起動
- `npm run lint` - ESLintを実行
- `npm run db:migrate` - Prismaマイグレーションを実行
- `npm run db:studio` - Prisma Studioを起動（データベースGUI）
- `npm run db:seed` - データベースにシードデータを投入

## LINE API設定

### 1. LINE Developersコンソールでチャネルを作成

1. [LINE Developers Console](https://developers.line.biz/console/)にログイン
2. 新しいプロバイダーとチャネルを作成（Messaging API）
3. チャネルアクセストークンとチャネルシークレットを取得

### 2. Webhook URLの設定

開発環境では、ngrokなどのトンネリングツールを使用：

```bash
ngrok http 3000
```

Webhook URLを `https://your-ngrok-url.ngrok.io/api/webhook` に設定

## データベーススキーマ

主要なテーブル：

- **User**: 管理者・担当者
- **LineUser**: LINEユーザー
- **Conversation**: 会話
- **Message**: メッセージ
- **Tag**: タグ
- **Memo**: メモ
- **AuditLog**: 監査ログ

詳細は `prisma/schema.prisma` を参照してください。

## 開発ガイドライン

### コーディング規約

- TypeScriptの型を適切に使用
- ESLintとPrettierの設定に従う
- コンポーネントは小さく、再利用可能に保つ
- API Routesは `/src/app/api/` 以下に配置

### ブランチ戦略

- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `bugfix/*`: バグ修正

## トラブルシューティング

### データベース接続エラー

```bash
# PostgreSQLが起動しているか確認
psql -U postgres -l

# DATABASE_URLが正しいか確認
echo $DATABASE_URL
```

### マイグレーションエラー

```bash
# Prismaクライアントを再生成
npx prisma generate

# マイグレーションをリセット（開発環境のみ）
npx prisma migrate reset
```

## ライセンス

Private Project

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
