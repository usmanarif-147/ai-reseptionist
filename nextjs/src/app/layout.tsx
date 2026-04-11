import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Receptionist',
  description: 'Smart AI chatbot widget for local service businesses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}
