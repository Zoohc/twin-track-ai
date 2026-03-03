'use client'

import { useEffect, useRef } from 'react'

interface PreviewCanvasProps {
  jobId: string
  backendUrl?: string
}

export default function PreviewCanvas({ jobId, backendUrl }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const base = backendUrl ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'
    const url = `${base}/api/preview-stream?job_id=${encodeURIComponent(jobId)}`
    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (e: MessageEvent<string>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = new Image()
      img.onload = () => {
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
      <canvas
        ref={canvasRef}
        width={1280}
        height={800}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
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
        }}
      >
        LIVE
      </div>
    </div>
  )
}
