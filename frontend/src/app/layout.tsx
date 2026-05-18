import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export const metadata: Metadata = {
  title: 'AgentScope',
  description: 'AI Agent Observability Dashboard',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className="h-full"
    >
      <body className="h-full" style={{ backgroundColor: 'var(--bg-base)' }}>
        <Providers>
          <Sidebar />
          <Header />
          <main className="ml-60 pt-14 min-h-screen">
            <div className="p-6">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  )
}
