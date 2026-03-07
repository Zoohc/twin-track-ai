'use client'

import { useEffect, useRef, useState } from 'react'

interface PreviewCanvasProps {
  jobId: string
  backendUrl?: string
}

export default function PreviewCanvas({ jobId, backendUrl }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const esRef = useRef<EventSource | null>(null)
  const [status, setStatus] = useState<'loading' | 'streaming' | 'done'>('loading')

  useEffect(() => {
    const base = backendUrl ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'
    const url = `${base}/api/preview-stream?job_id=${encodeURIComponent(jobId)}`
    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (e: MessageEvent<string>) => {
      if (e.data === 'done') {
        setStatus('done')
        es.close()
        return
      }

      if (e.data === 'loading') {
        setStatus('loading')
        return
      }

      // 실제 base64 스크린샷
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      setStatus('streaming')

      const img = new Image()
      img.onload = () => {
        canvas.width = img.naturalWidth || 1280
        canvas.height = img.naturalHeight || 800
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = `data:image/jpeg;base64,${e.data}`
    }

    es.onerror = () => {
      es.close()
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [jobId, backendUrl])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        background: 'var(--color-primary)',
        borderRadius: 12,
        overflow: 'hidden',
        aspectRatio: '16/10',
      }}
    >
      {/* 캔버스 (스크린샷 표시) */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={800}
        style={{
          width: '100%',
          height: '100%',
          display: status === 'streaming' ? 'block' : 'none',
        }}
      />

      {/* 로딩 상태 */}
      {status === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid rgba(255, 255, 255, 0.15)',
              borderTopColor: 'var(--color-accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span
            style={{
              fontSize: 'var(--font-sm)',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            테스트 진행 중
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* LIVE 배지 */}
      {status !== 'done' && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'rgba(11, 45, 114, 0.8)',
            color: 'var(--color-accent)',
            fontSize: 'var(--font-xs)',
            fontWeight: 'var(--weight-medium)',
            padding: '2px 8px',
            borderRadius: 99,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          LIVE
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
      )}
    </div>
  )
}
