'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { FeedMessage, FeedLevel } from '@/types'

interface LiveFeedProps {
  jobId: string
  initialMessages?: FeedMessage[]
}

const LEVEL_ICON: Record<FeedLevel, string> = {
  success: '✓',
  error: '✕',
  info: '⏳',
}

const LEVEL_COLOR: Record<FeedLevel, string> = {
  success: 'var(--color-accent)',
  error: 'var(--color-danger)',
  info: 'var(--color-text-primary)',
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

  // 새 메시지 추가 시 하단으로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div
      style={{
        overflowY: 'auto',
        maxHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: 'var(--space-3)',
        background: 'var(--color-white)',
        borderRadius: 8,
      }}
    >
      {messages.length === 0 ? (
        <p
          style={{
            fontSize: 'var(--font-sm)',
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            padding: 'var(--space-4) 0',
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
              gap: 6,
              color: LEVEL_COLOR[msg.level],
              fontSize: 'var(--font-sm)',
              padding: '2px 0',
            }}
          >
            <span style={{ flexShrink: 0, width: 14 }}>{LEVEL_ICON[msg.level]}</span>
            <span style={{ wordBreak: 'break-word' }}>{msg.message}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
