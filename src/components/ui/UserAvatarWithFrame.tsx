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

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* ========================================================
          1. CYBERPUNK NEON FRAME (AAA Futuristic Hologram Reticles)
          ======================================================== */}
      {isCyber && (
        <>
          {/* Cyber HUD 4-Corner Brackets (Góc ngắm cơ khí Sci-Fi) */}
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

          {/* Cyber Neon HUD Top Tag */}
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

          {/* Rotating Laser Gradient Glow Halo */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-indigo-500 animate-[spin_4s_linear_infinite] opacity-90 blur-[2px]" />
        </>
      )}

      {/* ========================================================
          2. ROYAL GOLDEN CROWN FRAME (Ornate Gemstone Crown)
          ======================================================== */}
      {isCrown && (
        <>
          {/* Royal Gold Shimmer Ring */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-200 via-amber-400 to-yellow-500 animate-[spin_6s_linear_infinite] opacity-90 blur-[1.5px]" />

          {/* 3D Royal Crown SVG Topper */}
          <div
            className={`absolute ${currentSize.crownScale} left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)] origin-bottom`}
          >
            <svg
              width="36"
              height="28"
              viewBox="0 0 36 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            >
              {/* Crown Base */}
              <path
                d="M3 23C3 21.8954 3.89543 21 5 21H31C32.1046 21 33 21.8954 33 23V25C33 26.1046 32.1046 27 31 27H5C3.89543 27 3 26.1046 3 25V23Z"
                fill="url(#gold_base)"
                stroke="#B45309"
                strokeWidth="0.8"
              />
              {/* Crown Peaks */}
              <path
                d="M4 21L7 8L14 16L18 4L22 16L29 8L32 21H4Z"
                fill="url(#gold_body)"
                stroke="#B45309"
                strokeWidth="1"
              />
              {/* Center Jewel (Ruby) */}
              <circle cx="18" cy="4" r="2.5" fill="#EF4444" stroke="#FDE047" strokeWidth="0.8" />
              {/* Side Jewels (Sapphire) */}
              <circle cx="7" cy="8" r="2" fill="#3B82F6" stroke="#FDE047" strokeWidth="0.8" />
              <circle cx="29" cy="8" r="2" fill="#3B82F6" stroke="#FDE047" strokeWidth="0.8" />
              {/* Base Gems */}
              <circle cx="11" cy="24" r="1.2" fill="#10B981" />
              <circle cx="18" cy="24" r="1.5" fill="#EF4444" />
              <circle cx="25" cy="24" r="1.2" fill="#10B981" />

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

      {/* ========================================================
          3. AVATAR BODY CONTAINER
          ======================================================== */}
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
          4. BADGE INDICATOR
          ======================================================== */}
      {showBadge && activeBadge && (
        <div
          className={`absolute ${badgeSizeClasses[size]} bg-white rounded-full shadow-md border border-slate-200 z-20 flex items-center justify-center leading-none select-none`}
        >
          {activeBadge === "item_badge_champion" && (
            <span title="Huy Hiệu Chiến Thần Đấu Trường">⚔️</span>
          )}
          {activeBadge === "item_badge_master" && (
            <span title="Huy Hiệu Bậc Thầy Từ Vựng">🏅</span>
          )}
        </div>
      )}
    </div>
  );
};
