import { Priority, Urgency, ComplaintType } from '@prisma/client'

export interface TriageResult {
  priority: Priority
  urgency: Urgency
  isComplaint: boolean
  complaintType?: ComplaintType | null
  confidence: number // 0.0 ~ 1.0
  matchedKeywords: string[]
}

// クレーム判定キーワード
export const COMPLAINT_KEYWORDS = [
  '最悪',
  '返金',
  '詐欺',
  '対応が悪い',
  'ひどい',
  '許せない',
  'クレーム',
  '謝罪',
  '責任者',
  '訴える',
  '消費者センター',
  '二度と',
  '不快',
  '失望',
  'がっかり',
]

// 緊急度判定キーワード
export const URGENCY_NOW_KEYWORDS = [
  '今すぐ',
  '至急',
  '緊急',
  '今日中',
  '当日',
  'すぐに',
  '急いで',
  '急ぎ',
]

export const URGENCY_TODAY_KEYWORDS = [
  '今日',
  '本日',
  'できるだけ早く',
  '早めに',
  'なるべく早く',
]

export const URGENCY_THIS_WEEK_KEYWORDS = [
  '今週',
  '今週中',
  '週内',
]

// 重要度判定キーワード
export const PRIORITY_HIGH_KEYWORDS = [
  '解約',
  '退会',
  '返金',
  '個人情報',
  '漏洩',
  '法的',
  '弁護士',
  '警察',
  '重要',
  '至急',
  '緊急',
]

// クレーム種別判定キーワード
export const COMPLAINT_TYPE_KEYWORDS: Record<ComplaintType, string[]> = {
  BILLING: ['料金', '請求', '支払い', '金額', '値段', '高い', '課金'],
  QUALITY: ['品質', '不良', '壊れ', '動かない', '使えない', '機能しない'],
  DELAY: ['遅い', '遅れ', '届かない', '来ない', '待たされ'],
  ATTITUDE: ['対応', '態度', '失礼', '無視', '返信', '連絡'],
  OTHER: [],
}

/**
 * メッセージ内容からトリアージ結果を分析
 * @param text メッセージテキスト
 * @returns トリアージ結果
 */
export function analyzeMessage(text: string): TriageResult {
  const lowerText = text.toLowerCase()
  const matchedKeywords: string[] = []

  // クレーム判定
  const complaintMatches = COMPLAINT_KEYWORDS.filter((keyword) => {
    const matched = lowerText.includes(keyword.toLowerCase())
    if (matched) matchedKeywords.push(keyword)
    return matched
  })
  const isComplaint = complaintMatches.length > 0

  // クレーム種別判定
  let complaintType: ComplaintType | null = null
  if (isComplaint) {
    for (const [type, keywords] of Object.entries(COMPLAINT_TYPE_KEYWORDS)) {
      if (keywords.some((k) => lowerText.includes(k.toLowerCase()))) {
        complaintType = type as ComplaintType
        break
      }
    }
    if (!complaintType) {
      complaintType = ComplaintType.OTHER
    }
  }

  // 緊急度判定
  let urgency: Urgency = Urgency.ANYTIME
  if (URGENCY_NOW_KEYWORDS.some((k) => {
    const matched = lowerText.includes(k.toLowerCase())
    if (matched) matchedKeywords.push(k)
    return matched
  })) {
    urgency = Urgency.NOW
  } else if (URGENCY_TODAY_KEYWORDS.some((k) => {
    const matched = lowerText.includes(k.toLowerCase())
    if (matched) matchedKeywords.push(k)
    return matched
  })) {
    urgency = Urgency.TODAY
  } else if (URGENCY_THIS_WEEK_KEYWORDS.some((k) => {
    const matched = lowerText.includes(k.toLowerCase())
    if (matched) matchedKeywords.push(k)
    return matched
  })) {
    urgency = Urgency.THIS_WEEK
  }

  // 重要度判定
  let priority: Priority = Priority.MEDIUM
  if (PRIORITY_HIGH_KEYWORDS.some((k) => {
    const matched = lowerText.includes(k.toLowerCase())
    if (matched) matchedKeywords.push(k)
    return matched
  })) {
    priority = Priority.HIGH
  } else if (isComplaint) {
    // クレームは自動的にHIGH
    priority = Priority.HIGH
  }

  // 信頼度計算（マッチしたキーワード数に基づく）
  let confidence = 0.5
  if (matchedKeywords.length >= 3) {
    confidence = 0.9
  } else if (matchedKeywords.length >= 2) {
    confidence = 0.8
  } else if (matchedKeywords.length >= 1) {
    confidence = 0.7
  }

  // クレームの場合は信頼度を上げる
  if (isComplaint || priority === Priority.HIGH) {
    confidence = Math.max(confidence, 0.8)
  }

  return {
    priority,
    urgency,
    isComplaint,
    complaintType,
    confidence,
    matchedKeywords,
  }
}

/**
 * トリアージルール設定を取得（Admin API用）
 */
export function getTriageRules() {
  return {
    complaintKeywords: COMPLAINT_KEYWORDS,
    urgencyKeywords: {
      now: URGENCY_NOW_KEYWORDS,
      today: URGENCY_TODAY_KEYWORDS,
      thisWeek: URGENCY_THIS_WEEK_KEYWORDS,
    },
    priorityKeywords: PRIORITY_HIGH_KEYWORDS,
    complaintTypeKeywords: COMPLAINT_TYPE_KEYWORDS,
  }
}
