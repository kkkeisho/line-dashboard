# LINE Webhook セットアップガイド

このドキュメントは、LINE Messaging API Webhookを設定する手順を説明します。

## 前提条件

- LINE Developersアカウント
- LINE Messaging APIチャネルの作成
- ローカル開発環境でngrokなどのトンネリングツール（または本番環境のURL）

## 環境変数の設定

`.env`ファイルに以下の環境変数を設定してください：

```env
LINE_CHANNEL_ACCESS_TOKEN="T/PLQ2d2SQcRMouSCWjSLkDxs14hd6ScCpoRupeyObaNIrKfM3ONen7AUH+Car4HI6UxpjvQIHYNp/Pcnu0nEhoOjYO+zoT7TuGFoUFJlum5NF6VBojktsm2gsOGy4MfWDOypJYwrnOe5t73KWK7agdB04t89/1O/w1cDnyilFU="
LINE_CHANNEL_SECRET="947b24c804e0b66c8d99490a360bc25e"
```

### 取得方法

1. [LINE Developers Console](https://developers.line.biz/console/)にログイン
2. 対象のプロバイダーとチャネルを選択
3. **チャネル基本設定**タブを開く
4. **チャネルシークレット**をコピーして`LINE_CHANNEL_SECRET`に設定
5. **Messaging API設定**タブを開く
6. **チャネルアクセストークン（長期）**を発行してコピー
7. トークンを`LINE_CHANNEL_ACCESS_TOKEN`に設定

## ローカル開発環境での設定

### 1. ngrokのインストールと起動

```bash
# ngrokをインストール（未インストールの場合）
npm install -g ngrok

# Next.js開発サーバーを起動
npm run dev

# 別のターミナルでngrokを起動
ngrok http 3000
```
### 2. Webhook URLの取得

ngrokが起動すると、以下のような情報が表示されます：

```
Forwarding  https://xxxx-xx-xxx-xxx-xxx.ngrok-free.app -> http://localhost:3000
```

この`https://xxxx-xx-xxx-xxx-xxx.ngrok-free.app`がWebhook URLのベースになります。

### 3. LINE Developersコンソールでの設定

1. [LINE Developers Console](https://developers.line.biz/console/)にログイン
2. 対象のチャネルを選択
3. **Messaging API設定**タブを開く
4. **Webhook URL**に以下を入力：
   ```
   https://xxxx-xx-xxx-xxx-xxx.ngrok-free.app/api/webhooks/line
   ```
5. **Webhookの利用**をオンに設定
6. **検証**ボタンをクリックして接続確認
   - 成功すると「成功」と表示されます
   - 失敗する場合は、開発サーバーが起動しているか確認してください

### 4. 応答メッセージの設定

1. **応答メッセージ**をオフに設定（Webhookで処理するため）
2. **あいさつメッセージ**は任意で設定

## 本番環境での設定

本番環境では、ngrokではなく実際のドメインを使用します：

```
https://your-domain.com/api/webhooks/line
```

## 動作確認

### 1. LINE公式アカウントを友だち追加

1. LINE Developersコンソールの**Messaging API設定**タブを開く
2. **Bot basic ID**のQRコードをスキャンして友だち追加

### 2. メッセージを送信

友だち追加したアカウントにテキストメッセージを送信します。

### 3. ログの確認

開発サーバーのログに以下のような出力が表示されれば成功です：

```
Received 1 webhook event(s)
Processing webhook event: { type: 'message', timestamp: ... }
Message received: { userId: 'Uxxxx...', text: 'こんにちは', ... }
```

## トラブルシューティング

### Webhook検証が失敗する

**原因**:
- 開発サーバーが起動していない
- ngrokが起動していない
- Webhook URLが間違っている
- 環境変数が設定されていない

**解決方法**:
1. `npm run dev`で開発サーバーを起動
2. `ngrok http 3000`でngrokを起動
3. Webhook URLを確認（末尾は`/api/webhooks/line`）
4. `.env`ファイルの環境変数を確認

### 署名検証エラー

**原因**:
- `LINE_CHANNEL_SECRET`が間違っている

**解決方法**:
1. LINE Developersコンソールで**チャネルシークレット**を確認
2. `.env`ファイルの`LINE_CHANNEL_SECRET`を更新
3. 開発サーバーを再起動

### メッセージが受信できない

**原因**:
- Webhookの利用がオフになっている
- 応答メッセージがオンになっている
- ログに署名検証エラーが出ている

**解決方法**:
1. LINE Developersコンソールで**Webhookの利用**をオンに設定
2. **応答メッセージ**をオフに設定
3. 開発サーバーのログでエラーを確認

## Webhookエンドポイントの仕様

### POST /api/webhooks/line

LINE Messaging APIからWebhookイベントを受信します。

**リクエストヘッダー**:
- `x-line-signature`: Webhook署名（必須）
- `Content-Type`: `application/json`

**リクエストボディ**:
```json
{
  "destination": "Uxxxx...",
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "id": "xxxxx",
        "text": "こんにちは"
      },
      "timestamp": 1234567890,
      "source": {
        "type": "user",
        "userId": "Uxxxx..."
      },
      "replyToken": "xxxxx"
    }
  ]
}
```

**レスポンス**:
- 成功: `200 OK` `{ "success": true }`
- 署名エラー: `401 Unauthorized`
- その他のエラー: `400 Bad Request` または `500 Internal Server Error`

### GET /api/webhooks/line

Webhookエンドポイントの動作確認用。

**レスポンス**:
```json
{
  "message": "LINE Webhook endpoint is active",
  "timestamp": "2026-01-07T12:34:56.789Z"
}
```

## 対応しているイベント

現在のバージョン（MVP）では以下のイベントに対応しています：

- ✅ **message** (type: text) - テキストメッセージ受信
- ✅ **follow** - ユーザーが友だち追加
- ✅ **unfollow** - ユーザーがブロック

### 今後対応予定（Phase 2）

- 画像メッセージ
- スタンプメッセージ
- 位置情報メッセージ
- Postbackイベント

## 参考リンク

- [LINE Messaging API リファレンス](https://developers.line.biz/ja/reference/messaging-api/)
- [Webhook](https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects)
- [署名検証](https://developers.line.biz/ja/reference/messaging-api/#signature-validation)
