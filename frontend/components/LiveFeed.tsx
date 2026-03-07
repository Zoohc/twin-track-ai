'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { FeedMessage, FeedLevel } from '@/types'

interface LiveFeedProps {
  jobId: string
  initialMessages?: FeedMessage[]
}

const LEVEL_COLOR: Record<FeedLevel, string> = {
  success: 'var(--color-accent)',
  error: 'var(--color-danger)',
  info: 'var(--color-text-secondary)',
}

const DOT_BG: Record<FeedLevel, string> = {
  success: 'var(--color-accent)',
  error: 'var(--color-danger)',
  info: 'var(--color-text-tertiary)',
}

export default function LiveFeed({ jobId, initialMessages = [] }: LiveFeedProps) {
  const [messages, setMessages] = useState<FeedMessage[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`feed:${jobId}`)
      .on<FeedMessage>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_messages',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [jobId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div
      style={{
        overflowY: 'auto',
        maxHeight: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {messages.length === 0 ? (
        <p
          style={{
            fontSize: 'var(--font-sm)',
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            padding: 'var(--space-6) 0',
          }}
        >
          테스트 시작을 기다리는 중...
        </p>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              transition: 'opacity var(--transition-fast)',
            }}
          >
            {/* 상태 도트 */}
            <span
              style={{
                flexShrink: 0,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: DOT_BG[msg.level],
                marginTop: 6,
              }}
            />
            {/* 메시지 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 'var(--font-sm)',
                  color: LEVEL_COLOR[msg.level],
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                }}
              >
                {msg.message}
              </span>
              {msg.created_at && (
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    marginTop: 2,
                  }}
                >
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
