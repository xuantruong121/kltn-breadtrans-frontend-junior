import React from "react";
import { Sparkles } from "lucide-react";
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

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
    xl: "w-32 h-32 text-3xl",
  };

  const crownSize = {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 32,
  };

  // Frame Styles
  let frameBorderClasses = "border-2 border-slate-200";
  let hasCrown = false;
  let hasCyber = false;

  if (activeFrame === "item_avatar_crown") {
    hasCrown = true;
    frameBorderClasses = "border-4 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)] ring-2 ring-amber-300 ring-offset-2 ring-offset-white animate-pulse";
  } else if (activeFrame === "item_avatar_cyber") {
    hasCyber = true;
    frameBorderClasses = "border-4 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.7)] ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900";
  }

  const initial = name ? name[0].toUpperCase() : "U";

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Crown Topper */}
      {hasCrown && (
        <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] animate-bounce">
          <span className="text-sm sm:text-base md:text-xl">👑</span>
        </div>
      )}

      {/* Cyber Sparkle */}
      {hasCyber && (
        <div className="absolute -top-2.5 -right-1 z-20 text-cyan-400 drop-shadow-[0_0_6px_#22d3ee]">
          <Sparkles size={crownSize[size]} />
        </div>
      )}

      {/* Avatar Container */}
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center bg-slate-100 font-black text-slate-600 transition-all ${frameBorderClasses}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name || "User"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center">
            {initial}
          </div>
        )}
      </div>

      {/* Badge Indicator */}
      {showBadge && activeBadge && (
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-md border border-slate-200 z-10">
          {activeBadge === "item_badge_champion" && (
            <span className="text-xs" title="Huy Hiệu Chiến Thần Đấu Trường">⚔️</span>
          )}
          {activeBadge === "item_badge_master" && (
            <span className="text-xs" title="Huy Hiệu Bậc Thầy Từ Vựng">🏅</span>
          )}
        </div>
      )}
    </div>
  );
};
