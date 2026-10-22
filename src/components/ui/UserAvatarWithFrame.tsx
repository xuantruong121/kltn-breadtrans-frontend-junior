import React from "react";
import { useGamificationStore } from "@/stores/gamificationStore";
import {
  resolveAvatarFrame,
  resolveUserBadge,
} from "@/lib/avatar/avatarCustomizationLogic";

export interface UserAvatarWithFrameProps {
  avatarUrl?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  overrideFrame?: string | number | null;
  overrideBadge?: string | number | null;
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

  const activeFrameKey = overrideFrame !== undefined ? overrideFrame : storeFrame;
  const activeBadgeKey = overrideBadge !== undefined ? overrideBadge : storeBadge;

  const frame = resolveAvatarFrame(activeFrameKey);
  const badge = resolveUserBadge(activeBadgeKey);

  const sizeDimensions = {
    sm: { container: "w-8 h-8", text: "text-xs" },
    md: { container: "w-10 h-10", text: "text-sm" },
    lg: { container: "w-16 h-16", text: "text-xl" },
    xl: { container: "w-28 h-28 sm:w-32 sm:h-32", text: "text-3xl" },
  };

  const badgeSizeClasses = {
    sm: "w-4 h-4 text-[9px] -bottom-0.5 -right-0.5",
    md: "w-5 h-5 text-[10px] -bottom-0.5 -right-0.5",
    lg: "w-6 h-6 text-xs -bottom-1 -right-1",
    xl: "w-8 h-8 text-base -bottom-1 -right-1",
  };

  const currentSize = sizeDimensions[size];
  const initial = name ? name.trim()[0].toUpperCase() : "U";

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* 1. AUTHENTIC SVG FRAME OVERLAY */}
      {frame && (
        <img
          src={frame.svgUrl}
          alt={frame.name}
          aria-hidden="true"
          className="absolute pointer-events-none select-none z-20 w-[165%] h-[165%] max-w-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-sm"
        />
      )}

      {/* 2. INNER CIRCULAR AVATAR CONTAINER */}
      <div
        className={`relative z-10 ${currentSize.container} rounded-full overflow-hidden flex items-center justify-center font-black transition-all ${
          frame
            ? frame.containerRingClass
            : "border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        }`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name || "User"}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center font-black ${currentSize.text} ${
              frame
                ? frame.fallbackBgClass
                : "bg-gradient-to-tr from-amber-500 to-orange-500 text-white"
            }`}
          >
            {initial}
          </div>
        )}
      </div>

      {/* 3. BADGE INDICATOR (SVG OR EMOJI) */}
      {showBadge && badge && (
        <div
          className={`absolute ${badgeSizeClasses[size]} bg-white dark:bg-slate-900 rounded-full shadow-md border border-slate-200 dark:border-slate-700 z-30 flex items-center justify-center leading-none select-none overflow-hidden`}
          title={badge.name}
        >
          {badge.type === "svg" ? (
            <img
              src={badge.content}
              alt={badge.name}
              className="w-full h-full object-contain p-[1px]"
            />
          ) : (
            <span className="leading-none">{badge.content}</span>
          )}
        </div>
      )}
    </div>
  );
};
