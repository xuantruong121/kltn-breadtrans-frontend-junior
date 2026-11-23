export type LoafProps = {
  /** Number of diagonal cuts along the crust. 0 for a plain loaf. */
  cuts?: number;
  /** Cuts 0..litCount-1 show --lit instead of --crust. */
  litCount?: number;
  /** Size and place the loaf here: width, aspect-ratio, position. */
  className?: string;
};

/**
 * The landing's one motif (spec 6.1): a flat stadium turned -8deg, with
 * diagonal cuts that light from the left. No shadow, no gradient, no content:
 * the hero and the skills stage set their text and cards beside or over it.
 * The styles are in landing.css (`.landing-loaf*`), so it only looks right
 * inside `.landing`.
 */
export function Loaf({ cuts = 6, litCount = 0, className }: LoafProps) {
  const count = Math.max(0, Math.floor(cuts));
  return (
    <div className={className ? `landing-loaf ${className}` : "landing-loaf"}>
      {count > 0 ? (
        <div className="landing-loaf__cuts">
          {Array.from({ length: count }, (_, index) => (
            <div key={index} className="landing-loaf__cut" data-lit={index < litCount} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
