import Link from 'next/link'
import { QUIN_SOCIALS } from '@/lib/quin-utils'
import { Radio, Zap, ShieldCheck, ExternalLink } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/80 bg-card/60">
      <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-3.5">
            <img
              src="/quin69-logo.jpg"
              alt="Quin69"
              className="size-10 rounded-lg border border-primary/40 object-cover"
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-foreground">
                  QUIN69.GG
                </span>
                <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  BROADCAST ARCHIVE v2.0
                </span>
              </div>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                High-concurrency VOD &amp; Episode Theater powered by the
                Overpowered Archive API with frame-accurate Twitch Chat Replay,
                7TV, BTTV &amp; FFZ emote rendering.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {QUIN_SOCIALS.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-foreground"
              >
                <span>{social.name}</span>
                <ExternalLink className="size-3 opacity-60" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-[11px]">
              Quin69 &copy; {new Date().getFullYear()}
            </span>
            <Link href="/" className="hover:text-foreground transition-colors">
              Broadcast Hub
            </Link>
            <Link
              href="/games"
              className="hover:text-foreground transition-colors"
            >
              All Episodes
            </Link>
            <Link
              href="/library"
              className="hover:text-foreground transition-colors"
            >
              Game Library
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <Zap className="size-3" />
              Edge SWR Cache Active
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <ShieldCheck className="size-3 text-primary" />
              7TV + BTTV + FFZ Synced
            </span>
            <span className="text-border">|</span>
            <a
              href="https://twitter.com/overpowered"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Archive API by OP
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
