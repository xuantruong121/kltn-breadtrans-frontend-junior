import { Wheat, type LucideProps } from "lucide-react";

/**
 * The one icon of the Bánh Mì currency (glossary.ts). Every place that shows
 * an amount of Bánh Mì draws it with this, so the currency looks the same on
 * every page. Decorative by default: the number and the word carry the meaning.
 */
export function BreadCoinIcon({ className = "text-amber-600 dark:text-amber-400", ...props }: LucideProps) {
  return <Wheat aria-hidden="true" className={className} {...props} />;
}

export default BreadCoinIcon;
