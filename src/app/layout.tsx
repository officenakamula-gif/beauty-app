import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Salon de Beauty',
  description: '美容サロン予約サイト',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}