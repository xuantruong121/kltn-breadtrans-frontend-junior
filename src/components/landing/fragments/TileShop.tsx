import { CircleUser, Shield, Star, type LucideIcon } from "lucide-react";
import { BreadCoinIcon } from "@/components/ui/BreadCoinIcon";
import { SHOP_ITEMS, SHOP_TYPE_LABELS, type ShopItemType } from "@/lib/landing/fragments";
import { TERMS } from "@/lib/ui/terms";
import { FragmentCard } from "./FragmentCard";

/** One plain lucide drawing per item type: no tile behind it. */
const ICONS: Record<ShopItemType, { icon: LucideIcon; className: string }> = {
  BADGE: { icon: Star, className: "fill-amber-200 text-amber-600 dark:fill-amber-900/60 dark:text-amber-400" },
  AVATAR_FRAME: { icon: CircleUser, className: "text-orange-600 dark:text-orange-400" },
  BOOST: { icon: Shield, className: "fill-blue-100 text-blue-600 dark:fill-blue-950/60 dark:text-blue-400" },
};

/** Three items of the real shop catalogue, with their type and price in Bánh Mì. */
export function TileShop() {
  return (
    <FragmentCard ui="shop-grid" className="gap-3.5 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[18px] font-bold">{TERMS.shop}</span>
        <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">Giá tính bằng {TERMS.currency}</span>
      </div>

      <ul className="flex flex-wrap gap-2.5">
        {SHOP_ITEMS.map((item) => {
          const { icon: Icon, className } = ICONS[item.type];
          return (
            <li
              key={item.name}
              className="flex flex-[1_1_180px] flex-col gap-2.5 rounded-[18px] border-[1.5px] border-slate-200 p-4 dark:border-slate-700"
            >
              <Icon size={44} strokeWidth={1.6} aria-hidden="true" className={className} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold">{item.name}</span>
                <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">{SHOP_TYPE_LABELS[item.type]}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[17px] font-bold text-amber-800 dark:text-amber-300">
                <BreadCoinIcon size={18} />
                {item.price}
                <span className="sr-only"> {TERMS.currency}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </FragmentCard>
  );
}
