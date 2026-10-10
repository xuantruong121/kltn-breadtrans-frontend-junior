export interface MarketVisual {
  src: string;
  fallbackSrc: string;
  alt: string;
}

const LOCAL_VISUALS: Record<string, string> = {
  "badge-star": "/images/market/badge-star.svg",
  "frame-orange": "/images/market/frame-orange.svg",
  "streak-freeze": "/images/market/streak-freeze.svg",
  "pet-bun": "/images/market/pet-bun.svg",
  "double-bread": "/images/market/double-bread.svg",
  "badge-master": "/images/market/badge-master.svg",
  "frame-crown": "/images/market/frame-crown.svg",
  "frame-cyber": "/images/market/frame-cyber.svg",
  "gift-notebook": "/images/market/gift-notebook.svg",
  "gift-voucher": "/images/market/gift-voucher.svg",
  "gift-bottle": "/images/market/gift-bottle.svg",
  "gift-plush": "/images/market/gift-plush.svg",
};

const CATEGORY_FALLBACKS: Record<string, string> = {
  BADGE: LOCAL_VISUALS["badge-star"],
  AVATAR_FRAME: LOCAL_VISUALS["frame-orange"],
  BOOST: LOCAL_VISUALS["streak-freeze"],
  PHYSICAL: LOCAL_VISUALS["gift-notebook"],
};

const VISUAL_ALT: Record<string, string> = {
  "badge-star": "huy hiệu ngôi sao thành tích",
  "frame-orange": "khung avatar cam",
  "streak-freeze": "vé khiên băng bảo vệ chuỗi học",
  "pet-bun": "thú cưng Bun đồng hành",
  "double-bread": "thẻ nhân đôi Bánh Mì trong 24 giờ",
  "badge-master": "huy hiệu bậc thầy từ vựng",
  "frame-crown": "khung avatar vương miện quán quân",
  "frame-cyber": "khung avatar Cyber Tech",
  "gift-notebook": "sổ tay từ vựng BreadTrans",
  "gift-voucher": "voucher đồ uống",
  "gift-bottle": "bình giữ nhiệt BreadTrans",
  "gift-plush": "gấu bông Bánh Mì linh vật",
};

export function getMarketItemVisual(slug: string, category?: string): MarketVisual {
  const key = slug.trim().toLowerCase();
  const src = LOCAL_VISUALS[key] || CATEGORY_FALLBACKS[category?.toUpperCase() || ""] || LOCAL_VISUALS["badge-star"];

  return {
    src,
    fallbackSrc: CATEGORY_FALLBACKS[category?.toUpperCase() || ""] || LOCAL_VISUALS["badge-star"],
    alt: VISUAL_ALT[key] || "hình minh họa vật phẩm cửa hàng BreadTrans",
  };
}

export function getKnownMarketVisualSlugs(): string[] {
  return Object.keys(LOCAL_VISUALS);
}
