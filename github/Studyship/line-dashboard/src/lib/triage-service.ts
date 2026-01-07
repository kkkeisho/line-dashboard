import { prisma } from './prisma'
import { analyzeMessage, TriageResult } from './triage-rules'
import { Priority, Urgency } from '@prisma/client'

/**
 * メッセージを分析してConversationのトリアージを実行
 *
 * @param conversationId - Conversation ID
 * @param messageText - 分析対象のメッセージテキスト
 * @returns トリアージ結果
 */
export async function runTriage(
  conversationId: string,
  messageText: string
): Promise<TriageResult> {
  // メッセージを分析
  const result = analyzeMessage(messageText)

  console.log('Triage analysis:', {
    conversationId,
    result: {
      priority: result.priority,
      urgency: result.urgency,
      isComplaint: result.isComplaint,
      confidence: result.confidence,
      matchedKeywords: result.matchedKeywords,
    },
  })

  // 現在のConversation状態を取得
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })

  if (!conversation) {
    console.warn('Conversation not found for triage:', conversationId)
    return result
  }

  // 更新するフィールドを決定
  const updates: any = {}

  // 優先度の自動更新ロジック
  // - 現在がMEDIUM以下で、判定結果がHIGHの場合は上書き
  // - 現在がLOWで、判定結果がMEDIUM以上の場合は上書き
  if (
    (conversation.priority === Priority.MEDIUM &&
      result.priority === Priority.HIGH) ||
    (conversation.priority === Priority.LOW &&
      result.priority !== Priority.LOW)
  ) {
    updates.priority = result.priority
  }

  // 緊急度の自動更新ロジック
  // - 現在がANYTIMEで、判定結果がそれ以上の緊急度の場合は上書き
  // - 現在がTHIS_WEEKで、判定結果がTODAY/NOWの場合は上書き
  // - 現在がTODAYで、判定結果がNOWの場合は上書き
  const urgencyPriority = {
    [Urgency.ANYTIME]: 0,
    [Urgency.THIS_WEEK]: 1,
    [Urgency.TODAY]: 2,
    [Urgency.NOW]: 3,
  }

  if (
    urgencyPriority[result.urgency] > urgencyPriority[conversation.urgency]
  ) {
    updates.urgency = result.urgency
  }

  // クレームフラグの自動更新
  // - 一度trueになったら手動でしか解除できない
  if (result.isComplaint && !conversation.isComplaint) {
    updates.isComplaint = true
    if (result.complaintType) {
      updates.complaintType = result.complaintType
    }
  }

  // 更新がある場合のみConversationを更新
  if (Object.keys(updates).length > 0) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    })

    console.log('Triage applied:', {
      conversationId,
      updates,
      confidence: result.confidence,
    })
  } else {
    console.log('No triage updates needed:', conversationId)
  }

  return result
}

/**
 * 複数のメッセージを分析してトリアージ
 * （会話全体の文脈を考慮する場合に使用）
 *
 * @param conversationId - Conversation ID
 * @param messageTexts - 分析対象のメッセージテキスト配列
 * @returns トリアージ結果
 */
export async function runTriageMultiple(
  conversationId: string,
  messageTexts: string[]
): Promise<TriageResult> {
  // すべてのメッセージを結合して分析
  const combinedText = messageTexts.join(' ')
  return await runTriage(conversationId, combinedText)
}

/**
 * 既存のConversationを再トリアージ
 * （ルール変更後に既存データを再分析する場合に使用）
 *
 * @param conversationId - Conversation ID
 */
export async function retriageConversation(conversationId: string) {
  // Conversationの全メッセージを取得
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      direction: 'INBOUND', // 受信メッセージのみ
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: 10, // 最新10件のみ
  })

  if (messages.length === 0) {
    console.log('No messages found for re-triage:', conversationId)
    return
  }

  // メッセージテキストを抽出
  const messageTexts = messages
    .map((m) => m.text)
    .filter((t): t is string => t !== null)

  if (messageTexts.length === 0) {
    console.log('No text messages found for re-triage:', conversationId)
    return
  }

  // 再トリアージ実行
  return await runTriageMultiple(conversationId, messageTexts)
}
