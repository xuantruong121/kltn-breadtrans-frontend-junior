import type { ReactNode } from "react";

export type LoafProps = {
  /** Number of diagonal cuts along the crust. 0 for a plain loaf (an image frame). */
  cuts?: number;
  /** Cuts 0..litCount-1 show --lit instead of --crust. */
  litCount?: number;
  /** Size and place the loaf here: width, aspect-ratio, position. */
  className?: string;
  /** Content drawn on cut `index` (upright, centred, may overflow the cut). */
  renderCut?: (index: number, lit: boolean) => ReactNode;
  /** Shown upright inside the loaf and clipped to it: the loaf is the mask for product images. */
  children?: ReactNode;
};

/**
 * The landing's one motif (spec 6.1): a flat stadium turned -8deg, with
 * diagonal cuts. No shadow, no gradient. The styles are in landing.css
 * (`.landing-loaf*`), so it only looks right inside `.landing`.
 */
export function Loaf({ cuts = 6, litCount = 0, className, renderCut, children }: LoafProps) {
  const count = Math.max(0, Math.floor(cuts));
  return (
    <div className={className ? `landing-loaf ${className}` : "landing-loaf"}>
      {children ? (
        <div className="landing-loaf__mask">
          <div className="landing-loaf__upright">{children}</div>
        </div>
      ) : null}
      {count > 0 ? (
        <div className="landing-loaf__cuts">
          {Array.from({ length: count }, (_, index) => {
            const lit = index < litCount;
            return (
              <div key={index} className="landing-loaf__cut" data-lit={lit}>
                {renderCut ? <div className="landing-loaf__cut-content">{renderCut(index, lit)}</div> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
