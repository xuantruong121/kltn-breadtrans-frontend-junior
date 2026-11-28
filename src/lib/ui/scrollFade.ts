/**
 * A scroll area shows where more content waits by fading that edge (owner
 * 2026-11-27: the Pháo Bánh Mì panel scrolled inside on a short screen and
 * nothing said so). Pure: the hook useScrollFade feeds it the sizes.
 */

/** A scroller this close to an edge counts as at it (zoom and subpixel rounding). */
export const EDGE_SLACK = 4;
/** How tall the faded band is. */
export const FADE_SIZE = "2.5rem";

export interface ScrollEdges {
  /** Content is hidden above: the learner has scrolled down. */
  above: boolean;
  /** Content is hidden below. */
  below: boolean;
}

export function scrollEdges(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  slack: number = EDGE_SLACK,
): ScrollEdges {
  if (!(scrollHeight > clientHeight + slack)) return { above: false, below: false };
  return {
    above: scrollTop > slack,
    below: scrollTop + clientHeight < scrollHeight - slack,
  };
}

/**
 * The CSS mask that fades the edges with hidden content; undefined when nothing
 * is hidden. A mask fades the content itself, so it works on any background.
 */
export function fadeMask(edges: ScrollEdges, size: string = FADE_SIZE): string | undefined {
  if (!edges.above && !edges.below) return undefined;
  const top = edges.above ? `transparent 0, black ${size}` : "black 0";
  const bottom = edges.below ? `black calc(100% - ${size}), transparent 100%` : "black 100%";
  return `linear-gradient(to bottom, ${top}, ${bottom})`;
}
