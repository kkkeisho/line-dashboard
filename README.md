# LINE対応ダッシュボード 開発チケット一覧

## プロジェクト概要
LINE公式アカウント（Messaging API）を用いた顧客対応を、社内ダッシュボードで可視化・割当・返信・トリアージする CRM システム

**作成日**: 2026-01-06
**対象フェーズ**: MVP
**技術スタック**: Next.js (想定), PostgreSQL, LINE Messaging API

## チケット一覧

### Phase 1: 基盤構築
- [#001 プロジェクトセットアップ・技術スタック構築](./tickets/001-project-setup.md) - **優先度: 最高**
- [#002 データベース設計・マイグレーション](./tickets/002-database-design.md) - **優先度: 最高**

### Phase 2: 認証・権限
- [#003 ユーザー認証・セッション管理](./tickets/003-user-authentication.md) - **優先度: 高**
- [#004 権限管理（Admin/Agent/Viewer）](./tickets/004-role-management.md) - **優先度: 高**

### Phase 3: LINE連携
- [#005 LINE Messaging API Webhook受信](./tickets/005-line-webhook.md) - **優先度: 最高**
- [#006 メッセージ受信・保存処理](./tickets/006-message-receive.md) - **優先度: 最高**
- [#007 メッセージ送信機能](./tickets/007-message-send.md) - **優先度: 最高**

### Phase 4: コア機能
- [#008 Conversation管理ロジック](./tickets/008-conversation-management.md) - **優先度: 最高**
- [#009 ステータス管理機能](./tickets/009-status-management.md) - **優先度: 高**
- [#010 担当者アサイン機能](./tickets/010-assignment.md) - **優先度: 高**

### Phase 5: UI実装
- [#011 Inbox一覧画面（リスト・フィルタ・検索）](./tickets/011-inbox-ui.md) - **優先度: 最高**
- [#012 Conversation詳細画面](./tickets/012-conversation-detail-ui.md) - **優先度: 最高**
- [#013 返信UI・送信フォーム](./tickets/013-reply-ui.md) - **優先度: 高**

### Phase 6: 付加機能
- [#014 トリアージ（ルールベース）](./tickets/014-triage-rules.md) - **優先度: 中**
- [#015 タグ管理機能](./tickets/015-tag-management.md) - **優先度: 中**
- [#016 内部メモ機能](./tickets/016-memo.md) - **優先度: 中**

### Phase 7: 管理・監査
- [#017 監査ログ機能](./tickets/017-audit-log.md) - **優先度: 中**
- [#018 Admin設定画面（ユーザー・タグ管理）](./tickets/018-admin-settings.md) - **優先度: 中**

### Phase 8: テスト・リリース
- [#019 統合テスト・E2Eテスト](./tickets/019-integration-tests.md) - **優先度: 高**
- [#020 受け入れテスト・リリース準備](./tickets/020-acceptance-release.md) - **優先度: 高**

## 開発順序（推奨）
1. **Week 1**: #001, #002, #003, #004 (基盤・認証)
2. **Week 2**: #005, #006, #007, #008 (LINE連携・Conversation管理)
3. **Week 3**: #009, #010, #011, #012 (ステータス・UI)
4. **Week 4**: #013, #014, #015, #016 (返信・トリアージ・タグ)
5. **Week 5**: #017, #018, #019, #020 (管理・テスト・リリース)

## MVP受け入れ基準（全体）
- [ ] LINEからテキスト送信→Inboxに1分以内に反映される
- [ ] Conversation単位でメッセージ履歴が確認できる
- [ ] ステータスを変更でき、一覧に反映される
- [ ] 担当者を割り当てられる
- [ ] ダッシュボードから返信送信でき、LINEに届く
- [ ] 送信内容がmessagesに記録される
- [ ] 重要度・緊急度・クレームを手動設定できる
- [ ] Admin/Agent/Viewerの権限が機能する
- [ ] 監査ログが記録される

## 注意事項
- 各チケットの詳細は `tickets/` ディレクトリを参照
- 依存関係を確認してから着手すること
- MVP範囲外の機能（SLA、テンプレート等）はPhase 2で実装
