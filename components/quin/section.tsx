import Link from 'next/link'
import { ArrowRight } from './icons'

export function Section({
  title,
  href,
  linkLabel = 'See all',
  children,
  className,
}: {
  title: string
  href?: string
  linkLabel?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-[22px] font-semibold leading-none tracking-wide">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="group/link flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-primary"
          >
            {linkLabel}
            <ArrowRight className="size-3.5 transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
