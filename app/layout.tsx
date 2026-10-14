import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'QUIN69.GG — High-Performance VOD Archive, Live Stream & Chat Replay',
  description:
    'Watch all of Quin69’s episodes, hardcore runs, boss fights, and full streams with synchronized 60fps 7TV/BTTV/FFZ Twitch Chat Replay.',
  icons: {
    icon: '/quin69-favicon.png',
    apple: '/quin69-logo.jpg',
  },
  openGraph: {
    title: 'QUIN69.GG — Broadcast Hub & Synchronized Chat Replay',
    description:
      'Watch all 920+ Quin69 episodes and full streams with frame-accurate Twitch Chat Replay, 7TV/BTTV/FFZ emotes, and chapter timelines.',
    url: 'https://quin69.gg',
    siteName: 'Quin69.gg',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0b0f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${jetbrains.variable} dark bg-background`}
    >
      <head>
        <link rel="preconnect" href="https://static-cdn.jtvnw.net" />
        <link rel="preconnect" href="https://cdn.7tv.app" />
        <link rel="preconnect" href="https://cdn.betterttv.net" />
        <link rel="preconnect" href="https://cdn.frankerfacez.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased flex flex-col">
        <TooltipProvider delay={150}>
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
