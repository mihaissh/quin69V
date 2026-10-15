/*
  Route transitions are done with plain CSS (see .page-in in globals.css).

  We tried React's <ViewTransition> (browser View Transitions API): it looked
  nice, but the browser freezes the old page while it snapshots the new one,
  which added ~1s before each page appeared. Instant beats fancy here, so these
  wrappers are pass-throughs. Swap them back to ViewTransition later if wanted.
*/

export function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Morph({ children }: { name: string; children: React.ReactNode }) {
  return <>{children}</>
}

export const episodeMorphName = (episodeId: number) => `ep-${episodeId}`
