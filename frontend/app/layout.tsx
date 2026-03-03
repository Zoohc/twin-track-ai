import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Twin Track AI — AI가 당신의 서비스를 테스트합니다',
  description: '배포 전에 AI가 먼저 써봅니다. URL 1개로 버그·UX 문제·성능 이슈를 자동 리포트.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
