import { SiteHeader } from '@/components/quin/site-header'

// Shown instantly when a stream is clicked, while the server fetches the VOD.
export default function Loading() {
  return (
    <div className="fade-in flex h-dvh flex-col overflow-hidden">
      <SiteHeader />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-w-0 flex-col lg:flex-1">
          <div className="aspect-video w-full bg-black lg:max-h-[calc(100dvh-56px-96px)]" />
          <div className="px-3 pt-3 sm:px-5">
            <div className="skeleton h-7 w-64 max-w-full rounded-sm" />
            <div className="skeleton mt-2 h-4 w-40 rounded-sm" />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col border-t border-border bg-surface lg:w-[340px] lg:flex-none lg:border-l lg:border-t-0">
          <div className="h-11 border-b border-border" />
        </div>
      </div>
    </div>
  )
}
