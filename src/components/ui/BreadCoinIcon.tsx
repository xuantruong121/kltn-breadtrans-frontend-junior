import { createLucideIcon, type LucideProps } from "lucide-react";

/**
 * A baguette, the shape of a Vietnamese bánh mì (owner 2026-11-19: the
 * currency is "Bánh Mì", the old wheat ear read as grain). Lucide has no
 * bread loaf, so the paths are Tabler Icons "baguette" (MIT License,
 * Copyright (c) 2020-2024 Paweł Kuna), drawn through createLucideIcon so it
 * takes the same size, strokeWidth and className as every other icon.
 */
export const Baguette = createLucideIcon("Baguette", [
  [
    "path",
    {
      d: "M5.628 11.283l5.644 -5.637c2.665 -2.663 5.924 -3.747 8.663 -1.205l.188 .181a2.987 2.987 0 0 1 0 4.228l-11.287 11.274a3 3 0 0 1 -4.089 .135l-.143 -.135c-2.728 -2.724 -1.704 -6.117 1.024 -8.841z",
      key: "loaf",
    },
  ],
  ["path", { d: "M6.5 10.5l1.5 3.5", key: "cut-1" }],
  ["path", { d: "M9.5 7.5l1.5 3.5", key: "cut-2" }],
  ["path", { d: "M12.5 4.5l1.5 3.5", key: "cut-3" }],
]);

/**
 * The one icon of the Bánh Mì currency (glossary.ts). Every place that shows
 * an amount of Bánh Mì draws it with this, so the currency looks the same on
 * every page. Decorative by default: the number and the word carry the meaning.
 */
export function BreadCoinIcon({ className = "text-amber-600 dark:text-amber-400", ...props }: LucideProps) {
  return <Baguette aria-hidden="true" className={className} {...props} />;
}

export default BreadCoinIcon;
