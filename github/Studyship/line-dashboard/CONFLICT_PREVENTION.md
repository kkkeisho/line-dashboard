# コンフリクト防止ガイド - LINE Dashboard並行開発

最終更新: 2026年1月7日

## 🎯 目的

複数チケットの並行開発において、コードコンフリクトや実装の重複、取りこぼしを防ぐための実践的ガイド。

---

## 🚨 高リスクファイル - 編集前に要調整

以下のファイルは複数のチケットで編集される可能性が高いため、**編集前にチーム内で調整が必要**です。

### 🔴 最高リスク

#### 1. `src/app/conversations/[id]/page.tsx` ⚠️ **未作成**

**関連チケット**: #012, #013
**競合リスク**: #012で作成、#013で統合時に大きな変更の可能性

**並行開発のルール**:
- #012が先に作成し、#013はその後に統合
- #012完了までは#013は別ブランチで開発
- PRマージ順序: #012 → #013

**実装分担案**:
```typescript
// #012担当: ページ構造・レイアウト
export default function ConversationDetailPage() {
  return (
    <div>
      <ConversationSidebar />  // #012
      <MessageTimeline />      // #012
      <ReplyForm />            // #013が統合
    </div>
  )
}
```

#### 2. `src/components/ConversationList.tsx` ⚠️ **既存**

**関連チケット**: #010, #011
**競合リスク**: #010で担当者表示追加、#011でページネーション追加

**現在の実装確認**:
```bash
grep -n "assignedUser" line-dashboard/src/components/ConversationList.tsx
```

**並行開発のルール**:
- 担当者表示が既に実装されているか確認
- #011のページネーション実装は別コンポーネントに分離推奨
- 両チケットがこのファイルを編集する場合は順次実装

#### 3. `src/app/inbox/page.tsx` ⚠️ **既存**

**関連チケット**: #011（ページネーション、検索強化）
**競合リスク**: 低（単一チケット）だが、将来的に#014（トリアージ）でフィルタ追加の可能性

**並行開発のルール**:
- 現在は#011のみで編集
- 新しいフィルタ追加時は`InboxFilters.tsx`で実装
- ページネーションロジックは別関数に分離

### 🟡 中リスク

#### 4. `src/lib/conversation-service.ts` ⚠️ **既存**

**関連チケット**: #010, #014, #015, #016
**競合リスク**: 新機能追加時にメソッド追加

**並行開発のルール**:
- 新しいメソッドは**ファイルの末尾に追加**
- 既存メソッドの変更は慎重に（影響範囲を確認）
- 型定義の変更は他のチケットに影響大

**推奨パターン**:
```typescript
// ✅ Good - 末尾に新規メソッド追加
export async function assignConversation() { ... }  // #010
export async function addTag() { ... }              // #015
export async function addMemo() { ... }             // #016

// ❌ Bad - 既存メソッドの大幅変更
export async function getConversations() {
  // 大幅な変更は他のチケットに影響
}
```

#### 5. `src/lib/audit-service.ts` ⚠️ **既存**

**関連チケット**: #010, #015, #016, #017
**競合リスク**: 新しいアクションタイプ追加

**並行開発のルール**:
- 新しいアクションタイプは`AuditAction` enumに追加（Prismaスキーマ）
- アクションタイプの追加はコンフリクトしにくい
- `createAuditLog`メソッドは変更しない

#### 6. `src/components/InboxFilters.tsx` ⚠️ **既存**

**関連チケット**: #011, #014, #015
**競合リスク**: 新しいフィルタ項目追加

**並行開発のルール**:
- 新しいフィルタは既存の`<div>`ブロックの後に追加
- タグフィルタ（#015）は独立したセクションとして実装
- トリアージフィルタ（#014）も独立セクション

---

## 📋 チケット別コンフリクト分析

### Phase 4 (#010)

**編集予定ファイル**:
- ✅ `src/app/api/conversations/[id]/assign/route.ts` - 実装済み
- ✅ `src/app/api/conversations/[id]/assign-me/route.ts` - 実装済み
- ✅ `src/app/api/users/route.ts` - 実装済み
- ⏳ `src/components/ConversationList.tsx` - 担当者表示（確認必要）
- ⏳ 新規: `src/components/AssignmentDropdown.tsx` - 担当者変更UI（推奨）

**他チケットとの競合**:
- #011と`ConversationList.tsx`で競合の可能性
- #012の詳細画面でも担当者変更UIが必要

**推奨アクション**:
1. `ConversationList.tsx`の担当者表示を確認
2. 担当者変更UIは別コンポーネント（`AssignmentDropdown.tsx`）として実装
3. #012でこのコンポーネントを再利用

### Phase 5 (#011, #012, #013)

#### #011 Inbox一覧

**編集予定ファイル**:
- ✅ `src/app/inbox/page.tsx` - 実装済み
- ✅ `src/components/ConversationList.tsx` - 実装済み
- ✅ `src/components/InboxFilters.tsx` - 実装済み
- ⏳ ページネーション追加

**他チケットとの競合**:
- #010と`ConversationList.tsx`で競合の可能性

**推奨アクション**:
1. ページネーションは`InboxPagination.tsx`として別コンポーネント実装
2. `ConversationList.tsx`の編集は最小限に

#### #012 Conversation詳細UI

**編集予定ファイル**:
- ❌ `src/app/conversations/[id]/page.tsx` - **未作成（最優先）**
- ✅ `src/components/MessageTimeline.tsx` - 実装済み
- ✅ `src/components/ConversationSidebar.tsx` - 実装済み

**他チケットとの競合**:
- #013の`ReplyForm`統合で詳細ページを編集
- #010の担当者変更UIを統合

**推奨アクション**:
1. **先に#012で詳細ページを作成・完成させる**
2. #013と#010は#012完了後に統合
3. 詳細ページは拡張しやすい構造で実装

**実装テンプレート**:
```typescript
// src/app/conversations/[id]/page.tsx
'use client'

import { ConversationSidebar } from '@/components/ConversationSidebar'
import { MessageTimeline } from '@/components/MessageTimeline'
import { ReplyForm } from '@/components/ReplyForm'
import { AssignmentDropdown } from '@/components/AssignmentDropdown'
import { StatusBadge } from '@/components/StatusBadge'

export default function ConversationDetailPage({ params }) {
  const { id } = params
  // データ取得・状態管理

  return (
    <div className="flex h-screen">
      {/* サイドバー - #012 */}
      <ConversationSidebar conversation={conversation} />

      {/* メインエリア */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <div className="border-b p-4 flex justify-between">
          <div>
            <h1>{conversation.contact.displayName}</h1>
            <StatusBadge status={conversation.status} />
          </div>
          {/* 担当者変更 - #010で実装済みコンポーネント使用 */}
          <AssignmentDropdown conversationId={id} />
        </div>

        {/* メッセージタイムライン - #012 */}
        <MessageTimeline messages={messages} />

        {/* 返信フォーム - #013で統合 */}
        <ReplyForm conversationId={id} onSent={handleSent} />
      </div>
    </div>
  )
}
```

#### #013 返信UI

**編集予定ファイル**:
- ✅ `src/components/ReplyForm.tsx` - 実装済み
- ✅ `src/app/api/conversations/[id]/reply/route.ts` - 実装済み
- ⏳ `src/app/conversations/[id]/page.tsx` - #012完了後に統合

**他チケットとの競合**:
- #012と詳細ページで競合

**推奨アクション**:
1. #012の詳細ページ完成を待つ
2. `ReplyForm`コンポーネントは単独で完成させておく
3. 統合時は`page.tsx`に`<ReplyForm />`を追加するのみ

---

## 🔄 推奨実装順序

### 優先順位1: Phase 4-5完成

```
1. #010 担当者アサインUI完成
   ├─ AssignmentDropdown.tsx作成
   └─ ConversationList.tsxで担当者表示確認

2. #012 詳細画面ページ作成（最優先）
   ├─ /app/conversations/[id]/page.tsx作成
   ├─ 既存コンポーネント統合
   └─ AssignmentDropdown統合

3. #013 返信機能統合
   ├─ ReplyForm改善
   └─ #012詳細ページに統合

4. #011 Inbox微調整
   ├─ ページネーション実装
   └─ レスポンシブ最適化
```

### 優先順位2: Phase 6着手

```
5. #015 タグ管理
   ├─ タグCRUD API
   └─ タグ管理UI

6. #016 内部メモ
   ├─ メモ表示・編集UI
   └─ ConversationSidebarに統合

7. #014 トリアージルール
   ├─ ルール管理API
   └─ 自動トリアージ実装
```

---

## 🛡️ コンフリクト防止のベストプラクティス

### 1. ブランチ戦略

```bash
# 機能ブランチは常に最新のmainから作成
git checkout main
git pull origin main
git checkout -b feature/012-conversation-detail-page

# 作業中は定期的にmainをマージして同期
git fetch origin
git merge origin/main

# コンフリクトが発生したら即座に解決
```

### 2. コミット前チェック

```bash
# ビルドエラーがないか確認
npm run build

# TypeScript型エラー確認
npx tsc --noEmit

# 変更ファイル一覧確認（意図しないファイル変更がないか）
git status

# 差分確認
git diff
```

### 3. PR作成前チェックリスト

- [ ] 依存チケットが完了・マージ済みか確認
- [ ] 他のチケットのファイルを変更していないか確認
- [ ] 競合する可能性のあるファイルを編集した場合は、他の担当者に連絡
- [ ] `PROJECT_STATUS.md`を更新（進捗状況）
- [ ] `WORK_LOG.md`に詳細を記録

### 4. 並行開発時のコミュニケーション

#### Slackチャンネル構成（推奨）
```
#line-dashboard-dev        - 全体の開発状況共有
#line-dashboard-conflicts  - コンフリクト報告・調整
#line-dashboard-pr         - PR通知・レビュー依頼
```

#### 編集前の宣言（高リスクファイル）
```
例: ConversationList.tsxを編集する場合
「#010でConversationList.tsxの担当者表示を追加します（行185-190予定）。
 #011でページネーション追加の方は別コンポーネントでお願いします。」
```

### 5. コンポーネント分割の原則

**大きなファイルは分割して並行開発可能に**

#### ❌ Bad - 1つの大きなコンポーネント
```typescript
// ConversationList.tsx (500行)
export function ConversationList() {
  // フィルタ、ページネーション、ソート、表示ロジックが全部入り
  // → 複数人が同時編集でコンフリクト頻発
}
```

#### ✅ Good - 小さなコンポーネントに分割
```typescript
// ConversationList.tsx (100行)
export function ConversationList({ conversations }) {
  return conversations.map(conv => (
    <ConversationItem key={conv.id} conversation={conv} />
  ))
}

// ConversationItem.tsx (80行) - #010で編集
export function ConversationItem({ conversation }) {
  return (...)
}

// InboxPagination.tsx (60行) - #011で編集
export function InboxPagination({ page, total }) {
  return (...)
}
```

---

## 🔍 コンフリクト検知・早期発見

### 1. 毎日のコンフリクトチェック（推奨）

```bash
# 毎朝実行: 自分のブランチとmainの差分確認
git fetch origin
git diff origin/main...HEAD --name-only

# 高リスクファイルが含まれていないか確認
# → 含まれている場合は他の担当者に確認
```

### 2. CI/CDでの自動チェック（推奨）

GitHub Actionsで自動チェック:
```yaml
# .github/workflows/conflict-check.yml
name: Conflict Check

on: [pull_request]

jobs:
  check-high-risk-files:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check high-risk files
        run: |
          # 高リスクファイルが変更されている場合は警告
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD)
          HIGH_RISK_FILES=(
            "src/components/ConversationList.tsx"
            "src/app/inbox/page.tsx"
            "src/lib/conversation-service.ts"
          )

          for file in "${HIGH_RISK_FILES[@]}"; do
            if echo "$CHANGED_FILES" | grep -q "$file"; then
              echo "⚠️ High-risk file changed: $file"
              echo "Please coordinate with other team members."
            fi
          done
```

---

## 📊 進捗確認・同期ミーティング

### 毎日のスタンドアップ（推奨）

**所要時間**: 10分
**参加者**: 全開発者

**アジェンダ**:
1. 昨日完了したチケット・タスク
2. 今日作業するファイル（高リスクファイルは特に共有）
3. ブロッカー・質問
4. コンフリクトの報告

**テンプレート**:
```
担当者: Aさん
- 昨日: #010のAssignmentDropdown.tsx実装完了
- 今日: ConversationList.tsxに担当者表示追加予定（行185-190）
- ブロッカー: なし

担当者: Bさん
- 昨日: #012の調査完了
- 今日: /app/conversations/[id]/page.tsx作成開始
- 質問: ConversationSidebarのprops仕様確認したい
```

### 週次レビュー（推奨）

**所要時間**: 30分
**参加者**: 全開発者

**アジェンダ**:
1. 今週の完了チケット
2. 来週の予定チケット
3. コンフリクト事例・改善策
4. `PROJECT_STATUS.md`の更新

---

## 🚑 コンフリクト発生時の対応

### ステップ1: コンフリクトの特定

```bash
# マージ試行
git merge origin/main

# コンフリクト発生
# Auto-merging src/components/ConversationList.tsx
# CONFLICT (content): Merge conflict in src/components/ConversationList.tsx
```

### ステップ2: コンフリクトの分析

```bash
# コンフリクト箇所確認
git diff --name-only --diff-filter=U

# 詳細確認
git diff src/components/ConversationList.tsx
```

### ステップ3: 手動解決 vs チーム調整

#### 簡単なコンフリクト（自分で解決可能）
- インポート文の順序違い
- コメントの追加
- 無関係な行の変更

#### 複雑なコンフリクト（チーム調整必要）
- 同じ関数の異なる実装
- 大きなリファクタリングの衝突
- 設計方針の違い

**複雑な場合は担当者とペアで解決**:
```
「ConversationList.tsxでコンフリクトが発生しました。
 #010の担当者表示と#011のページネーションが同じ箇所を編集しています。
 30分後にミーティングして一緒に解決しませんか？」
```

### ステップ4: 解決後のテスト

```bash
# コンフリクト解決後
git add src/components/ConversationList.tsx
git commit -m "Resolve conflict in ConversationList.tsx"

# ビルド確認
npm run build

# TypeScript型確認
npx tsc --noEmit

# 動作確認
npm run dev
```

---

## 📚 関連ドキュメント

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - 全体進捗管理
- [WORK_LOG.md](./WORK_LOG.md) - 詳細な開発履歴
- [CLAUDE.md](./CLAUDE.md) - プロジェクト構造・ガイド
- [line-dashboard-tickets/README.md](../line-dashboard-tickets/README.md) - チケット一覧

---

## ✅ クイックチェックリスト

### 新しいタスクを始める前
- [ ] `PROJECT_STATUS.md`で他のチケットの進捗確認
- [ ] 編集予定ファイルが高リスクファイルでないか確認
- [ ] 高リスクファイルの場合はチームに宣言
- [ ] 最新のmainブランチから作業ブランチ作成

### コミット前
- [ ] `npm run build`成功確認
- [ ] 意図しないファイル変更がないか`git status`で確認
- [ ] 高リスクファイルを編集した場合はチームに報告

### PR作成前
- [ ] 依存チケットがマージ済みか確認
- [ ] `PROJECT_STATUS.md`を更新
- [ ] `WORK_LOG.md`に記録
- [ ] 競合可能性のあるファイル編集をPR説明に明記

---

**最終更新**: 2026年1月7日
**管理者**: 開発チーム
**次回レビュー**: Phase 5完了時
