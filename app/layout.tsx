import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { quinAvatar } from '@/lib/quin-utils'
import { Suspense } from 'react'
import { NavProgress } from '@/components/quin/nav-progress'
import './globals.css'

// Display face for the wordmark and headings only (self-hosted, ~44KB total).
// Body text uses the system UI stack, so there is nothing to download for it.
const barlow = localFont({
  src: [
    { path: './fonts/barlow-condensed-latin-600-normal.woff2', weight: '600' },
    { path: './fonts/barlow-condensed-latin-700-normal.woff2', weight: '700' },
  ],
  variable: '--font-barlow',
  display: 'swap',
  fallback: ['Arial Narrow', 'sans-serif'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://quin69.gg'),
  title: {
    default: 'Quin69',
    template: '%s · Quin69',
  },
  description: "Watch all of Quin69's games with chat replay.",
  icons: {
    icon: quinAvatar(70),
    apple: quinAvatar(300),
  },
  openGraph: {
    title: 'Quin69',
    description: "Watch all of Quin69's games with chat replay.",
    url: 'https://quin69.gg',
    siteName: 'Quin69',
    type: 'website',
    images: [{ url: quinAvatar(600), width: 600, height: 600 }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0f0f10',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} dark`}
      // Paint dark from the very first frame (no white flash before CSS loads)
      style={{ backgroundColor: '#0f0f10', colorScheme: 'dark' }}
    >
      <head>
        <link rel="preconnect" href="https://static-cdn.jtvnw.net" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://cdn.7tv.app" />
        <link rel="dns-prefetch" href="https://cdn.betterttv.net" />
        <link rel="dns-prefetch" href="https://cdn.frankerfacez.com" />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
