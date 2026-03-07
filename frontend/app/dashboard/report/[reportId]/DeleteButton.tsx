'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteReportAction } from '@/lib/actions'

export function DeleteButton({ reportId }: { reportId: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('이 리포트를 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      await deleteReportAction(reportId)
      router.push('/dashboard')
    } catch {
      alert('삭제에 실패했습니다.')
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={() => void handleDelete()}
      disabled={deleting}
      style={{
        flex: 1,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 8,
        border: '1px solid var(--color-danger)',
        background: 'transparent',
        color: 'var(--color-danger)',
        fontSize: 'var(--font-sm)',
        fontWeight: 'var(--weight-medium)',
        cursor: deleting ? 'wait' : 'pointer',
        fontFamily: 'inherit',
        opacity: deleting ? 0.5 : 1,
        transition: 'all 150ms ease',
      }}
    >
      {deleting ? '삭제 중...' : '리포트 삭제'}
    </button>
  )
}
