import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ATC Training Dashboard',
  description: 'Real-time visualization and monitoring for AI ATC Controller Training',
  keywords: ['ATC', 'AI', 'training', 'visualization', 'air traffic control'],
  authors: [{ name: 'ATC Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1a1a2e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-slate-950">
          {children}
        </main>
      </body>
    </html>
  )
}
