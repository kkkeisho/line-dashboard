'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Message {
  id: string
  direction: 'INBOUND' | 'OUTBOUND'
  text: string | null
  timestamp: Date | string
}

interface MessageTimelineProps {
  messages: Message[]
}

export function MessageTimeline({ messages }: MessageTimelineProps) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        メッセージはありません
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.direction === 'OUTBOUND'
              ? 'justify-end'
              : 'justify-start'
          }`}
        >
          <div
            className={`max-w-md rounded-lg p-3 ${
              message.direction === 'OUTBOUND'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-900'
            }`}
          >
            <div className="whitespace-pre-wrap break-words">
              {message.text || '(メッセージなし)'}
            </div>
            <div
              className={`mt-1 text-xs ${
                message.direction === 'OUTBOUND'
                  ? 'text-blue-100'
                  : 'text-gray-600'
              }`}
            >
              {format(new Date(message.timestamp), 'MM/dd HH:mm', {
                locale: ja,
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
