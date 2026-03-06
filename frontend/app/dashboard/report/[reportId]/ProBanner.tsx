'use client'

export function ProBanner() {
  return (
    <div
      className="card"
      style={{
        marginTop: 'var(--space-6)',
        textAlign: 'center',
        background: 'var(--color-surface-raised)',
      }}
    >
      <p
        style={{
          fontSize: 'var(--font-md)',
          fontWeight: 'var(--weight-bold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        AI 수정 프롬프트로 즉시 수정하세요
      </p>
      <p
        style={{
          fontSize: 'var(--font-sm)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-4)',
        }}
      >
        Pro 플랜에서는 각 버그마다 Cursor/Claude에 붙여넣을 수 있는
        <br />
        AI 수정 프롬프트를 제공합니다.
      </p>
      <button
        onClick={() => alert('결제 기능은 준비 중입니다.')}
        className="btn-primary"
        style={{ maxWidth: 240 }}
      >
        Pro 업그레이드 ($19/월)
      </button>
    </div>
  )
}
