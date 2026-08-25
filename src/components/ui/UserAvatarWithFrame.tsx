import React from "react";
import { useGamificationStore } from "@/stores/gamificationStore";

interface UserAvatarWithFrameProps {
  avatarUrl?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  overrideFrame?: string | null;
  overrideBadge?: string | null;
  showBadge?: boolean;
}

export const UserAvatarWithFrame: React.FC<UserAvatarWithFrameProps> = ({
  avatarUrl,
  name,
  size = "md",
  className = "",
  overrideFrame,
  overrideBadge,
  showBadge = false,
}) => {
  const storeFrame = useGamificationStore((s) => s.equippedAvatarFrame);
  const storeBadge = useGamificationStore((s) => s.equippedBadge);

  const activeFrame = overrideFrame !== undefined ? overrideFrame : storeFrame;
  const activeBadge = overrideBadge !== undefined ? overrideBadge : storeBadge;

  const sizeDimensions = {
    sm: { container: "w-8 h-8", text: "text-xs", crownScale: "scale-[0.55] -top-3.5", cyberHUD: "scale-[0.5] -top-2.5", bracket: "w-1.5 h-1.5", ringPadding: "p-[2px]" },
    md: { container: "w-10 h-10", text: "text-sm", crownScale: "scale-[0.7] -top-4", cyberHUD: "scale-[0.65] -top-3", bracket: "w-2 h-2", ringPadding: "p-[2.5px]" },
    lg: { container: "w-16 h-16", text: "text-xl", crownScale: "scale-100 -top-5", cyberHUD: "scale-90 -top-3.5", bracket: "w-2.5 h-2.5", ringPadding: "p-[3px]" },
    xl: { container: "w-28 h-28 sm:w-32 sm:h-32", text: "text-3xl", crownScale: "scale-125 -top-7", cyberHUD: "scale-110 -top-4", bracket: "w-4 h-4", ringPadding: "p-[4px]" },
  };

  const badgeSizeClasses = {
    sm: "w-4 h-4 text-[9px] -bottom-0.5 -right-0.5",
    md: "w-5 h-5 text-[10px] -bottom-0.5 -right-0.5",
    lg: "w-6 h-6 text-xs -bottom-1 -right-1",
    xl: "w-8 h-8 text-base -bottom-1 -right-1",
  };

  const currentSize = sizeDimensions[size];
  const isCrown = activeFrame === "item_avatar_crown";
  const isCyber = activeFrame === "item_avatar_cyber";

  const initial = name ? name[0].toUpperCase() : "U";

  const getBadgeIcon = (badgeKey: string) => {
    switch (badgeKey) {
      case "badge_1":
      case "Tân Binh":
        return "🛡️";
      case "badge_2":
      case "Chăm Chỉ":
        return "🔥";
      case "badge_3":
      case "Siêu Sao":
        return "👑";
      case "badge_4":
      case "Thợ Săn":
        return "⚡";
      case "badge_5":
      case "Học Bá":
        return "⭐";
      case "badge_6":
      case "Đấu Sĩ Bất Bại":
      case "item_badge_champion":
        return "⚔️";
      case "badge_7":
      case "Giọng Đọc Vàng":
        return "🎙️";
      case "badge_8":
      case "Chuyên Gia Nuôi Thú":
        return "💖";
      case "item_badge_master":
        return "🏅";
      default:
        return "🎖️";
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* ========================================================
          1. CYBERPUNK NEON FRAME (AAA Futuristic Hologram Reticles)
          ======================================================== */}
      {isCyber && (
        <>
          <div className="absolute -inset-1.5 pointer-events-none z-20 flex flex-col justify-between">
            <div className="flex justify-between w-full">
              <span className={`${currentSize.bracket} border-t-2 border-l-2 border-cyan-400 drop-shadow-[0_0_6px_#00f0ff]`} />
              <span className={`${currentSize.bracket} border-t-2 border-r-2 border-fuchsia-400 drop-shadow-[0_0_6px_#ff007f]`} />
            </div>
            <div className="flex justify-between w-full">
              <span className={`${currentSize.bracket} border-b-2 border-l-2 border-cyan-400 drop-shadow-[0_0_6px_#00f0ff]`} />
              <span className={`${currentSize.bracket} border-b-2 border-r-2 border-fuchsia-400 drop-shadow-[0_0_6px_#ff007f]`} />
            </div>
          </div>

          <div
            className={`absolute ${currentSize.cyberHUD} left-1/2 -translate-x-1/2 z-30 pointer-events-none origin-bottom`}
          >
            <div className="flex items-center gap-1 bg-slate-950/90 border border-cyan-400/90 px-1.5 py-0.5 rounded-sm shadow-[0_0_10px_rgba(6,182,212,0.8)]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[9px] font-mono font-black tracking-widest text-cyan-300 select-none">
                NEON
              </span>
            </div>
          </div>

          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-indigo-500 animate-[spin_4s_linear_infinite] opacity-90 blur-[2px]" />
        </>
      )}

      {/* ========================================================
          2. ROYAL GOLDEN CROWN FRAME (Ornate Gemstone Crown)
          ======================================================== */}
      {isCrown && (
        <>
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-200 via-amber-400 to-yellow-500 animate-[spin_6s_linear_infinite] opacity-90 blur-[1.5px]" />

          <div
            className={`absolute ${currentSize.crownScale} left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)] origin-bottom`}
          >
            <svg
              width="36"
              height="28"
              viewBox="0 0 36 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 3L23 14L32 6L28 22H8L4 6L13 14L18 3Z"
                fill="url(#gold_body)"
                stroke="#78350F"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M7 21H29V25H7V21Z"
                fill="url(#gold_base)"
                stroke="#78350F"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="18" cy="18" r="2.5" fill="#EF4444" stroke="#7F1D1D" strokeWidth="0.8" />
              <circle cx="11" cy="19" r="1.8" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="0.8" />
              <circle cx="25" cy="19" r="1.8" fill="#10B981" stroke="#064E3B" strokeWidth="0.8" />
              <circle cx="18" cy="5" r="1.5" fill="#FBBF24" />
              <circle cx="4" cy="7.5" r="1.2" fill="#FBBF24" />
              <circle cx="32" cy="7.5" r="1.2" fill="#FBBF24" />

              <defs>
                <linearGradient id="gold_base" x1="3" y1="21" x2="33" y2="27" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F59E0B" />
                  <stop offset="0.5" stopColor="#FEF08A" />
                  <stop offset="1" stopColor="#D97706" />
                </linearGradient>
                <linearGradient id="gold_body" x1="4" y1="4" x2="32" y2="21" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FBBF24" />
                  <stop offset="0.3" stopColor="#FEF08A" />
                  <stop offset="0.7" stopColor="#F59E0B" />
                  <stop offset="1" stopColor="#B45309" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </>
      )}

      <div
        className={`relative z-10 ${currentSize.container} rounded-full overflow-hidden flex items-center justify-center font-black transition-all ${
          isCyber
            ? "border-[2.5px] border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.8),inset_0_0_10px_rgba(217,70,239,0.5)] ring-2 ring-fuchsia-500"
            : isCrown
            ? "border-[2.5px] border-yellow-300 shadow-[0_0_16px_rgba(251,191,36,0.8)] ring-2 ring-amber-500"
            : "border-2 border-slate-200 bg-slate-100 text-slate-600"
        }`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name || "User"} className="w-full h-full object-cover" />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-white ${
              isCyber
                ? "bg-gradient-to-tr from-cyan-900 via-indigo-900 to-fuchsia-950 text-cyan-200"
                : isCrown
                ? "bg-gradient-to-tr from-amber-600 to-yellow-500"
                : "bg-gradient-to-tr from-amber-500 to-orange-500"
            }`}
          >
            {initial}
          </div>
        )}
      </div>

      {/* ========================================================
          4. BADGE INDICATOR (Shows equipped badge icon)
          ======================================================== */}
      {showBadge && activeBadge && (
        <div
          className={`absolute ${badgeSizeClasses[size]} bg-white rounded-full shadow-md border border-slate-200 z-20 flex items-center justify-center leading-none select-none`}
        >
          <span title={activeBadge}>{getBadgeIcon(activeBadge)}</span>
        </div>
      )}
    </div>
  );
};
