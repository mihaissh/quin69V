import { QUIN_SOCIALS } from '@/lib/quin-utils'
import { Discord, Reddit, Twitch, XSocial, YouTube } from './icons'

const ICONS: Record<string, typeof Twitch> = {
  Twitch,
  YouTube,
  Discord,
  Reddit,
  'X / Twitter': XSocial,
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-3 py-6 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <nav aria-label="Quin69 elsewhere" className="flex flex-wrap gap-x-5 gap-y-1">
          {QUIN_SOCIALS.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              {(() => {
                const Icon = ICONS[s.name]
                return Icon ? <Icon className="size-[18px]" /> : null
              })()}
              {s.name}
            </a>
          ))}
        </nav>
        <p className="text-faint">
          Quin69 © {new Date().getFullYear()} · Archive by{' '}
          <a
            href="https://archive.overpowered.tv"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-border underline-offset-2 hover:text-foreground"
          >
            OP
          </a>
        </p>
      </div>
    </footer>
  )
}
