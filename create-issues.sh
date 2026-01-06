#!/bin/bash
set -e

REPO="kkkeisho/line-dashboard"
TICKETS_DIR="$(dirname "$0")/tickets"

echo "🚀 Creating GitHub Issues for LINE Dashboard"
echo "Repository: $REPO"
echo ""

# GitHub認証確認
if ! gh auth status > /dev/null 2>&1; then
    echo "❌ GitHub CLIにログインしていません"
    echo "以下のコマンドでログインしてください："
    echo "  gh auth login"
    exit 1
fi

# ラベル作成（既に存在する場合はスキップ）
echo "📝 Creating labels..."
gh label create "priority:high" --color "d73a4a" --description "高優先度" --repo $REPO 2>/dev/null || true
gh label create "priority:medium" --color "fbca04" --description "中優先度" --repo $REPO 2>/dev/null || true
gh label create "priority:low" --color "0e8a16" --description "低優先度" --repo $REPO 2>/dev/null || true

gh label create "phase-1-foundation" --color "1d76db" --description "Phase 1: 基盤構築" --repo $REPO 2>/dev/null || true
gh label create "phase-2-auth" --color "1d76db" --description "Phase 2: 認証・権限" --repo $REPO 2>/dev/null || true
gh label create "phase-3-line" --color "1d76db" --description "Phase 3: LINE連携" --repo $REPO 2>/dev/null || true
gh label create "phase-4-core" --color "1d76db" --description "Phase 4: コア機能" --repo $REPO 2>/dev/null || true
gh label create "phase-5-ui" --color "1d76db" --description "Phase 5: UI実装" --repo $REPO 2>/dev/null || true
gh label create "phase-6-features" --color "1d76db" --description "Phase 6: 付加機能" --repo $REPO 2>/dev/null || true
gh label create "phase-7-admin" --color "1d76db" --description "Phase 7: 管理・監査" --repo $REPO 2>/dev/null || true
gh label create "phase-8-release" --color "1d76db" --description "Phase 8: テスト・リリース" --repo $REPO 2>/dev/null || true

gh label create "backend" --color "5319e7" --description "Backend開発" --repo $REPO 2>/dev/null || true
gh label create "frontend" --color "d4c5f9" --description "Frontend開発" --repo $REPO 2>/dev/null || true
gh label create "fullstack" --color "7057ff" --description "Full-stack開発" --repo $REPO 2>/dev/null || true
gh label create "test" --color "bfdadc" --description "テスト" --repo $REPO 2>/dev/null || true

echo "✅ Labels created"
echo ""

# マイルストーン作成
echo "📍 Creating milestone..."
gh api repos/$REPO/milestones -f title="MVP Release" -f description="LINE対応ダッシュボード MVP" -f due_on="2026-02-28T00:00:00Z" 2>/dev/null || true
MILESTONE_TITLE="MVP Release"
echo "✅ Milestone created: $MILESTONE_TITLE"
echo ""

# 各チケットをIssueとして作成
echo "🎫 Creating issues..."
echo ""

# #001
echo "Creating #001..."
gh issue create --repo $REPO \
  --title "#001 プロジェクトセットアップ・技術スタック構築" \
  --body-file "$TICKETS_DIR/001-project-setup.md" \
  --label "priority:high,phase-1-foundation,backend,frontend" \
  --milestone "$MILESTONE_TITLE"

# #002
echo "Creating #002..."
gh issue create --repo $REPO \
  --title "#002 データベース設計・マイグレーション" \
  --body-file "$TICKETS_DIR/002-database-design.md" \
  --label "priority:high,phase-1-foundation,backend" \
  --milestone "$MILESTONE_TITLE"

# #003
echo "Creating #003..."
gh issue create --repo $REPO \
  --title "#003 ユーザー認証・セッション管理" \
  --body-file "$TICKETS_DIR/003-user-authentication.md" \
  --label "priority:high,phase-2-auth,backend" \
  --milestone "$MILESTONE_TITLE"

# #004
echo "Creating #004..."
gh issue create --repo $REPO \
  --title "#004 権限管理（Admin/Agent/Viewer）" \
  --body-file "$TICKETS_DIR/004-role-management.md" \
  --label "priority:high,phase-2-auth,backend" \
  --milestone "$MILESTONE_TITLE"

# #005
echo "Creating #005..."
gh issue create --repo $REPO \
  --title "#005 LINE Messaging API Webhook受信" \
  --body-file "$TICKETS_DIR/005-line-webhook.md" \
  --label "priority:high,phase-3-line,backend" \
  --milestone "$MILESTONE_TITLE"

# #006
echo "Creating #006..."
gh issue create --repo $REPO \
  --title "#006 メッセージ受信・保存処理" \
  --body-file "$TICKETS_DIR/006-message-receive.md" \
  --label "priority:high,phase-3-line,backend" \
  --milestone "$MILESTONE_TITLE"

# #007
echo "Creating #007..."
gh issue create --repo $REPO \
  --title "#007 メッセージ送信機能" \
  --body-file "$TICKETS_DIR/007-message-send.md" \
  --label "priority:high,phase-3-line,backend" \
  --milestone "$MILESTONE_TITLE"

# #008
echo "Creating #008..."
gh issue create --repo $REPO \
  --title "#008 Conversation管理ロジック" \
  --body-file "$TICKETS_DIR/008-conversation-management.md" \
  --label "priority:high,phase-4-core,backend" \
  --milestone "$MILESTONE_TITLE"

# #009
echo "Creating #009..."
gh issue create --repo $REPO \
  --title "#009 ステータス管理機能" \
  --body-file "$TICKETS_DIR/009-status-management.md" \
  --label "priority:high,phase-4-core,backend" \
  --milestone "$MILESTONE_TITLE"

# #010
echo "Creating #010..."
gh issue create --repo $REPO \
  --title "#010 担当者アサイン機能" \
  --body-file "$TICKETS_DIR/010-assignment.md" \
  --label "priority:high,phase-4-core,backend" \
  --milestone "$MILESTONE_TITLE"

# #011
echo "Creating #011..."
gh issue create --repo $REPO \
  --title "#011 Inbox一覧画面（リスト・フィルタ・検索）" \
  --body-file "$TICKETS_DIR/011-inbox-ui.md" \
  --label "priority:high,phase-5-ui,frontend" \
  --milestone "$MILESTONE_TITLE"

# #012
echo "Creating #012..."
gh issue create --repo $REPO \
  --title "#012 Conversation詳細画面" \
  --body-file "$TICKETS_DIR/012-conversation-detail-ui.md" \
  --label "priority:high,phase-5-ui,frontend" \
  --milestone "$MILESTONE_TITLE"

# #013
echo "Creating #013..."
gh issue create --repo $REPO \
  --title "#013 返信UI・送信フォーム" \
  --body-file "$TICKETS_DIR/013-reply-ui.md" \
  --label "priority:high,phase-5-ui,frontend" \
  --milestone "$MILESTONE_TITLE"

# #014
echo "Creating #014..."
gh issue create --repo $REPO \
  --title "#014 トリアージ（ルールベース）" \
  --body-file "$TICKETS_DIR/014-triage-rules.md" \
  --label "priority:medium,phase-6-features,backend" \
  --milestone "$MILESTONE_TITLE"

# #015
echo "Creating #015..."
gh issue create --repo $REPO \
  --title "#015 タグ管理機能" \
  --body-file "$TICKETS_DIR/015-tag-management.md" \
  --label "priority:medium,phase-6-features,fullstack" \
  --milestone "$MILESTONE_TITLE"

# #016
echo "Creating #016..."
gh issue create --repo $REPO \
  --title "#016 内部メモ機能" \
  --body-file "$TICKETS_DIR/016-memo.md" \
  --label "priority:medium,phase-6-features,fullstack" \
  --milestone "$MILESTONE_TITLE"

# #017
echo "Creating #017..."
gh issue create --repo $REPO \
  --title "#017 監査ログ機能" \
  --body-file "$TICKETS_DIR/017-audit-log.md" \
  --label "priority:medium,phase-7-admin,backend" \
  --milestone "$MILESTONE_TITLE"

# #018
echo "Creating #018..."
gh issue create --repo $REPO \
  --title "#018 Admin設定画面（ユーザー・タグ管理）" \
  --body-file "$TICKETS_DIR/018-admin-settings.md" \
  --label "priority:medium,phase-7-admin,fullstack" \
  --milestone "$MILESTONE_TITLE"

# #019
echo "Creating #019..."
gh issue create --repo $REPO \
  --title "#019 統合テスト・E2Eテスト" \
  --body-file "$TICKETS_DIR/019-integration-tests.md" \
  --label "priority:high,phase-8-release,test" \
  --milestone "$MILESTONE_TITLE"

# #020
echo "Creating #020..."
gh issue create --repo $REPO \
  --title "#020 受け入れテスト・リリース準備" \
  --body-file "$TICKETS_DIR/020-acceptance-release.md" \
  --label "priority:high,phase-8-release,test" \
  --milestone "$MILESTONE_TITLE"

echo ""
echo "✨ All issues created successfully!"
echo ""
echo "🔗 View issues: https://github.com/$REPO/issues"
