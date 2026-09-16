"use client";

import React from "react";
import { PetVisualState } from "../petLogic";

export interface CompanionPet2DProps {
  speciesId?: string;
  state?: PetVisualState;
  level?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showStateBadge?: boolean;
}

const STATE_LABELS: Record<PetVisualState, { text: string; badgeClass: string }> = {
  idle: { text: "Sẵn sàng", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  learning: { text: "Đang học cùng bạn", badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-bold" },
  hungry: { text: "Cần nạp năng lượng", badgeClass: "bg-orange-100 text-orange-900 border-orange-300 font-bold" },
  fed: { text: "Đã no nê", badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold" },
  cooldown: { text: "Nghỉ ngơi tiêu hóa", badgeClass: "bg-sky-100 text-sky-900 border-sky-300 font-bold" },
  levelup: { text: "Thăng cấp rực rỡ!", badgeClass: "bg-amber-100 text-amber-900 border-amber-400 font-black animate-bounce" },
};

/**
 * 2D Vector SVG Pet Companions for BreadTrans.
 * Clean, lightweight, responsive illustrations without 3D canvas or emoji reliance.
 */
export const CompanionPet2D: React.FC<CompanionPet2DProps> = ({
  speciesId = "bready",
  state = "idle",
  level = 1,
  size = "md",
  className = "",
  showStateBadge = false,
}) => {
  const sizeClasses = {
    sm: "w-16 h-16 sm:w-20 sm:h-20",
    md: "w-28 h-28 sm:w-36 sm:h-36",
    lg: "w-48 h-48 sm:w-56 sm:h-56",
    xl: "w-60 h-60 sm:w-72 sm:h-72",
  }[size];

  const stateInfo = STATE_LABELS[state] || STATE_LABELS.idle;

  // Render character SVG depending on species
  const renderSvg = () => {
    switch (speciesId) {
      case "owly":
        return <OwlySvg state={state} level={level} />;
      case "mimi":
        return <MimiSvg state={state} level={level} />;
      case "foxy":
        return <FoxySvg state={state} level={level} />;
      case "bready":
      default:
        return <BreadySvg state={state} level={level} />;
    }
  };

  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${className}`}>
      <div
        className={`relative flex items-center justify-center transition-transform duration-300 motion-safe:hover:scale-105 ${sizeClasses}`}
        role="img"
        aria-label={`Thú cưng đồng hành ${speciesId}, trạng thái ${stateInfo.text}`}
      >
        {renderSvg()}
      </div>

      {showStateBadge && (
        <span
          className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${stateInfo.badgeClass}`}
        >
          {stateInfo.text}
        </span>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 1. BREADY - Bánh Mì Dũng Cảm (Toast / Baguette Companion)                   */
/* -------------------------------------------------------------------------- */
function BreadySvg({ state, level }: { state: PetVisualState; level: number }) {
  const isHungry = state === "hungry";
  const isFed = state === "fed";
  const isCooldown = state === "cooldown";
  const isLearning = state === "learning";
  const isLevelUp = state === "levelup";

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Subtle background ground glow */}
      <ellipse cx="100" cy="180" rx="60" ry="12" fill="#000000" fillOpacity="0.06" />

      {/* Main Bread Body (Golden baked crust) */}
      <rect x="42" y="55" width="116" height="110" rx="36" fill="#F59E0B" stroke="#B45309" strokeWidth="4" />
      {/* Inner Soft Bread Crumb */}
      <rect x="52" y="65" width="96" height="90" rx="26" fill="#FEF3C7" />

      {/* Bread Crust Top Bumps */}
      <circle cx="70" cy="55" r="20" fill="#F59E0B" stroke="#B45309" strokeWidth="4" />
      <circle cx="130" cy="55" r="20" fill="#F59E0B" stroke="#B45309" strokeWidth="4" />
      <circle cx="100" cy="48" r="24" fill="#F59E0B" stroke="#B45309" strokeWidth="4" />
      {/* Inner top fills to blend nicely */}
      <circle cx="70" cy="58" r="16" fill="#FEF3C7" />
      <circle cx="130" cy="58" r="16" fill="#FEF3C7" />
      <circle cx="100" cy="52" r="19" fill="#FEF3C7" />

      {/* Butter / Jam melting patch on top */}
      <path
        d="M85 75C85 70.5817 88.5817 67 93 67H107C111.418 67 115 70.5817 115 75V83C115 87.4183 111.418 91 107 91H93C88.5817 91 85 87.4183 85 83V75Z"
        fill="#FDE047"
        stroke="#EAB308"
        strokeWidth="2"
      />

      {/* Cheek Blush */}
      <ellipse cx="68" cy="120" rx="8" ry="5" fill="#F87171" fillOpacity="0.45" />
      <ellipse cx="132" cy="120" rx="8" ry="5" fill="#F87171" fillOpacity="0.45" />

      {/* Eyes based on state */}
      {isFed ? (
        // Curved happy eyes
        <g stroke="#78350F" strokeWidth="3.5" strokeLinecap="round">
          <path d="M72 108C75 103 83 103 86 108" />
          <path d="M114 108C117 103 125 103 128 108" />
        </g>
      ) : isCooldown ? (
        // Peaceful resting eyes
        <g stroke="#78350F" strokeWidth="3" strokeLinecap="round">
          <path d="M72 110C76 112 82 112 86 110" />
          <path d="M114 110C118 112 124 112 128 110" />
        </g>
      ) : isHungry ? (
        // Droopy worried eyes
        <g>
          <circle cx="78" cy="110" r="5" fill="#78350F" />
          <circle cx="122" cy="110" r="5" fill="#78350F" />
          <circle cx="76" cy="108" r="1.5" fill="#FFFFFF" />
          <circle cx="120" cy="108" r="1.5" fill="#FFFFFF" />
          {/* Sweat drop */}
          <path d="M142 96C142 100 138 104 135 104C132 104 130 100 135 93C140 100 142 96 142 96Z" fill="#38BDF8" />
        </g>
      ) : (
        // Normal cheerful eyes
        <g>
          <circle cx="78" cy="108" r="5.5" fill="#78350F" />
          <circle cx="122" cy="108" r="5.5" fill="#78350F" />
          <circle cx="76" cy="106" r="2" fill="#FFFFFF" />
          <circle cx="120" cy="106" r="2" fill="#FFFFFF" />
        </g>
      )}

      {/* Mouth based on state */}
      {isHungry ? (
        <path d="M94 125C97 122 103 122 106 125" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      ) : isFed ? (
        <path d="M92 120C92 126 100 130 108 126C108 123 104 120 92 120Z" fill="#DC2626" stroke="#78350F" strokeWidth="2" />
      ) : isCooldown ? (
        <path d="M95 122C98 124 102 124 105 122" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M94 120C94 125 106 125 106 120" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      )}

      {/* Tiny Arms / Paws */}
      <ellipse cx="50" cy="126" rx="8" ry="6" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5" />
      <ellipse cx="150" cy="126" rx="8" ry="6" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5" />

      {/* Tiny Feet */}
      <ellipse cx="78" cy="168" rx="10" ry="7" fill="#D97706" stroke="#92400E" strokeWidth="2" />
      <ellipse cx="122" cy="168" rx="10" ry="7" fill="#D97706" stroke="#92400E" strokeWidth="2" />

      {/* Accessories: Learning book in hand */}
      {isLearning && (
        <g transform="translate(130, 115)">
          <rect x="0" y="0" width="24" height="20" rx="3" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2" />
          <line x1="12" y1="2" x2="12" y2="18" stroke="#DBEAFE" strokeWidth="2" />
          <line x1="4" y1="6" x2="9" y2="6" stroke="#EFF6FF" strokeWidth="1.5" />
          <line x1="15" y1="6" x2="20" y2="6" stroke="#EFF6FF" strokeWidth="1.5" />
        </g>
      )}

      {/* Stage / Knight Belt (level >= 4) */}
      {level >= 4 && (
        <path d="M52 142H148" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />
      )}

      {/* Level-up Laurel / Crown */}
      {isLevelUp && (
        <g transform="translate(75, 14)">
          <path d="M25 0L33 16L48 10L42 26H8L2 10L17 16L25 0Z" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
          <circle cx="25" cy="18" r="3" fill="#EF4444" />
        </g>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. OWLY - Cú Mèo Thông Thái (Scholarly Owl Companion)                       */
/* -------------------------------------------------------------------------- */
function OwlySvg({ state, level }: { state: PetVisualState; level: number }) {
  const isHungry = state === "hungry";
  const isFed = state === "fed";
  const isCooldown = state === "cooldown";
  const isLearning = state === "learning";
  const isLevelUp = state === "levelup";

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground Shadow */}
      <ellipse cx="100" cy="180" rx="55" ry="10" fill="#000000" fillOpacity="0.06" />

      {/* Owl Body */}
      <ellipse cx="100" cy="115" rx="54" ry="58" fill="#7C3AED" stroke="#5B21B6" strokeWidth="4" />
      {/* Belly */}
      <ellipse cx="100" cy="128" rx="36" ry="38" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="2" />

      {/* Feather tufts / Ears */}
      <path d="M58 75L44 48L74 62" fill="#6D28D9" stroke="#4C1D95" strokeWidth="3" strokeLinejoin="round" />
      <path d="M142 75L156 48L126 62" fill="#6D28D9" stroke="#4C1D95" strokeWidth="3" strokeLinejoin="round" />

      {/* Wings */}
      <ellipse cx="48" cy="124" rx="14" ry="32" fill="#6D28D9" stroke="#5B21B6" strokeWidth="3" transform="rotate(10 48 124)" />
      <ellipse cx="152" cy="124" rx="14" ry="32" fill="#6D28D9" stroke="#5B21B6" strokeWidth="3" transform="rotate(-10 152 124)" />

      {/* Big Owl Eye Patches */}
      <circle cx="78" cy="98" r="20" fill="#FFFFFF" stroke="#C4B5FD" strokeWidth="3" />
      <circle cx="122" cy="98" r="20" fill="#FFFFFF" stroke="#C4B5FD" strokeWidth="3" />

      {/* Eyes based on state */}
      {isFed ? (
        <g stroke="#4C1D95" strokeWidth="3.5" strokeLinecap="round">
          <path d="M70 98C74 93 82 93 86 98" />
          <path d="M114 98C118 93 126 93 130 98" />
        </g>
      ) : isCooldown ? (
        <g stroke="#4C1D95" strokeWidth="3" strokeLinecap="round">
          <path d="M72 100C76 102 82 102 86 100" />
          <path d="M114 100C118 102 124 102 128 100" />
        </g>
      ) : isHungry ? (
        <g>
          <circle cx="78" cy="100" r="7" fill="#4C1D95" />
          <circle cx="122" cy="100" r="7" fill="#4C1D95" />
          <circle cx="76" cy="98" r="2" fill="#FFFFFF" />
          <circle cx="120" cy="98" r="2" fill="#FFFFFF" />
          <path d="M140 85C140 89 136 93 133 93C130 93 128 89 133 82C138 89 140 85 140 85Z" fill="#38BDF8" />
        </g>
      ) : (
        <g>
          <circle cx="78" cy="98" r="8" fill="#4C1D95" />
          <circle cx="122" cy="98" r="8" fill="#4C1D95" />
          <circle cx="76" cy="95" r="2.5" fill="#FFFFFF" />
          <circle cx="120" cy="95" r="2.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Beak */}
      <polygon points="94,106 106,106 100,118" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />

      {/* Feet / Talons */}
      <ellipse cx="82" cy="172" rx="8" ry="5" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
      <ellipse cx="118" cy="172" rx="8" ry="5" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />

      {/* Glasses (if level >= 4 or learning state) */}
      {(level >= 4 || isLearning) && (
        <g stroke="#D97706" strokeWidth="2.5" fill="none">
          <circle cx="78" cy="98" r="22" />
          <circle cx="122" cy="98" r="22" />
          <line x1="100" y1="98" x2="100" y2="98" />
          <path d="M96 98H104" />
        </g>
      )}

      {/* Graduation Mortarboard cap (level >= 7 or levelup) */}
      {(level >= 7 || isLevelUp) && (
        <g transform="translate(68, 26)">
          <polygon points="32,0 64,12 32,24 0,12" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
          <rect x="18" y="16" width="28" height="12" rx="4" fill="#334155" />
          <path d="M56 16V30" stroke="#F59E0B" strokeWidth="2" />
          <circle cx="56" cy="32" r="2" fill="#F59E0B" />
        </g>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. MIMI - Mèo Bánh Cá Taiyaki (Sweet Cat Companion)                        */
/* -------------------------------------------------------------------------- */
function MimiSvg({ state, level }: { state: PetVisualState; level: number }) {
  const isHungry = state === "hungry";
  const isFed = state === "fed";
  const isCooldown = state === "cooldown";
  const isLearning = state === "learning";
  const isLevelUp = state === "levelup";

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground Shadow */}
      <ellipse cx="100" cy="180" rx="55" ry="10" fill="#000000" fillOpacity="0.06" />

      {/* Tail */}
      <path
        d="M140 148C165 142 176 120 172 100C168 84 156 94 158 106C160 118 150 134 134 140"
        fill="#FB7185"
        stroke="#E11D48"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Cat Ears */}
      <polygon points="56,76 46,38 82,56" fill="#FB7185" stroke="#E11D48" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="60,70 54,48 76,58" fill="#FFE4E6" />
      <polygon points="144,76 154,38 118,56" fill="#FB7185" stroke="#E11D48" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="140,70 146,48 124,58" fill="#FFE4E6" />

      {/* Cat Head & Body */}
      <circle cx="100" cy="110" r="54" fill="#FFF1F2" stroke="#E11D48" strokeWidth="4" />
      {/* Pink inner cheeks */}
      <ellipse cx="68" cy="122" rx="8" ry="5" fill="#FDA4AF" fillOpacity="0.6" />
      <ellipse cx="132" cy="122" rx="8" ry="5" fill="#FDA4AF" fillOpacity="0.6" />

      {/* Whiskers */}
      <line x1="50" y1="112" x2="30" y2="108" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="120" x2="28" y2="122" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />
      <line x1="150" y1="112" x2="170" y2="108" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />
      <line x1="150" y1="120" x2="172" y2="122" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />

      {/* Eyes based on state */}
      {isFed ? (
        <g stroke="#9F1239" strokeWidth="3.5" strokeLinecap="round">
          <path d="M72 102C76 97 84 97 88 102" />
          <path d="M112 102C116 97 124 97 128 102" />
        </g>
      ) : isCooldown ? (
        <g stroke="#9F1239" strokeWidth="3" strokeLinecap="round">
          <path d="M72 104C76 106 82 106 86 104" />
          <path d="M114 104C118 106 124 106 128 104" />
        </g>
      ) : isHungry ? (
        <g>
          <circle cx="80" cy="104" r="6.5" fill="#9F1239" />
          <circle cx="120" cy="104" r="6.5" fill="#9F1239" />
          <circle cx="78" cy="102" r="2" fill="#FFFFFF" />
          <circle cx="118" cy="102" r="2" fill="#FFFFFF" />
          <path d="M140 88C140 92 136 96 133 96C130 96 128 92 133 85C138 92 140 88 140 88Z" fill="#38BDF8" />
        </g>
      ) : (
        <g>
          <circle cx="80" cy="102" r="7" fill="#9F1239" />
          <circle cx="120" cy="102" r="7" fill="#9F1239" />
          <circle cx="78" cy="99" r="2.5" fill="#FFFFFF" />
          <circle cx="118" cy="99" r="2.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Nose & Cat Mouth */}
      <polygon points="98,112 102,112 100,115" fill="#E11D48" />
      {isHungry ? (
        <path d="M96 122C98 120 102 120 104 122" stroke="#9F1239" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M92 118C96 122 100 119 100 119C100 119 104 122 108 118" stroke="#9F1239" strokeWidth="2.5" strokeLinecap="round" />
      )}

      {/* Paws */}
      <ellipse cx="75" cy="156" rx="9" ry="7" fill="#FFF1F2" stroke="#E11D48" strokeWidth="2.5" />
      <ellipse cx="125" cy="156" rx="9" ry="7" fill="#FFF1F2" stroke="#E11D48" strokeWidth="2.5" />

      {/* Taiyaki fish charm on collar */}
      <g transform="translate(88, 142)">
        <ellipse cx="12" cy="7" rx="10" ry="6" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        <polygon points="20,7 26,2 26,12" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        <circle cx="6" cy="6" r="1" fill="#78350F" />
      </g>

      {/* Learning notes or level ribbon */}
      {(isLearning || level >= 4) && (
        <g transform="translate(132, 120)">
          <rect x="0" y="0" width="18" height="15" rx="3" fill="#FDA4AF" stroke="#E11D48" strokeWidth="1.5" />
          <line x1="4" y1="5" x2="14" y2="5" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="4" y1="9" x2="11" y2="9" stroke="#FFFFFF" strokeWidth="1.5" />
        </g>
      )}

      {/* Level-up crown / flower */}
      {isLevelUp && (
        <g transform="translate(86, 32)">
          <path d="M14 0L19 10L29 6L25 18H3L0 6L9 10L14 0Z" fill="#F43F5E" stroke="#BE123C" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. FOXY - Cáo Phim Ảnh (Entertainment Fox Companion)                       */
/* -------------------------------------------------------------------------- */
function FoxySvg({ state, level }: { state: PetVisualState; level: number }) {
  const isHungry = state === "hungry";
  const isFed = state === "fed";
  const isCooldown = state === "cooldown";
  const isLearning = state === "learning";
  const isLevelUp = state === "levelup";

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground Shadow */}
      <ellipse cx="100" cy="180" rx="55" ry="10" fill="#000000" fillOpacity="0.06" />

      {/* Big Fluffy Tail */}
      <path
        d="M136 150C165 152 186 130 182 104C180 88 166 84 154 96C146 104 140 125 132 142"
        fill="#EA580C"
        stroke="#C2410C"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* White Tail Tip */}
      <path d="M182 104C180 88 166 84 154 96C162 100 174 102 182 104Z" fill="#FFFFFF" />

      {/* Fox Ears */}
      <polygon points="56,76 40,32 84,54" fill="#EA580C" stroke="#C2410C" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="58,68 48,44 76,56" fill="#1E293B" />
      <polygon points="144,76 160,32 116,54" fill="#EA580C" stroke="#C2410C" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="142,68 152,44 124,56" fill="#1E293B" />

      {/* Fox Head & Body */}
      <circle cx="100" cy="112" r="54" fill="#F97316" stroke="#C2410C" strokeWidth="4" />
      {/* White Muzzle Mask */}
      <path
        d="M58 115C58 138 80 156 100 156C120 156 142 138 142 115C130 128 116 132 100 132C84 132 70 128 58 115Z"
        fill="#FFF7ED"
        stroke="#EA580C"
        strokeWidth="2"
      />

      {/* Eyes based on state */}
      {isFed ? (
        <g stroke="#7C2D12" strokeWidth="3.5" strokeLinecap="round">
          <path d="M72 104C76 99 84 99 88 104" />
          <path d="M112 104C116 99 124 99 128 104" />
        </g>
      ) : isCooldown ? (
        <g stroke="#7C2D12" strokeWidth="3" strokeLinecap="round">
          <path d="M72 106C76 108 82 108 86 106" />
          <path d="M114 106C118 108 124 108 128 106" />
        </g>
      ) : isHungry ? (
        <g>
          <circle cx="80" cy="106" r="6.5" fill="#7C2D12" />
          <circle cx="120" cy="106" r="6.5" fill="#7C2D12" />
          <circle cx="78" cy="104" r="2" fill="#FFFFFF" />
          <circle cx="118" cy="104" r="2" fill="#FFFFFF" />
          <path d="M142 90C142 94 138 98 135 98C132 98 130 94 135 87C140 94 142 90 142 90Z" fill="#38BDF8" />
        </g>
      ) : (
        <g>
          <circle cx="80" cy="104" r="7" fill="#7C2D12" />
          <circle cx="120" cy="104" r="7" fill="#7C2D12" />
          <circle cx="78" cy="101" r="2.5" fill="#FFFFFF" />
          <circle cx="118" cy="101" r="2.5" fill="#FFFFFF" />
        </g>
      )}

      {/* Nose */}
      <circle cx="100" cy="128" r="4.5" fill="#1E293B" />

      {/* Mouth */}
      {isHungry ? (
        <path d="M95 138C98 135 102 135 105 138" stroke="#7C2D12" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M94 134C94 138 106 138 106 134" stroke="#7C2D12" strokeWidth="2.5" strokeLinecap="round" />
      )}

      {/* Paws */}
      <ellipse cx="76" cy="164" rx="9" ry="7" fill="#FFF7ED" stroke="#EA580C" strokeWidth="2" />
      <ellipse cx="124" cy="164" rx="9" ry="7" fill="#FFF7ED" stroke="#EA580C" strokeWidth="2" />

      {/* Headphones (Entertainment Theme) */}
      <g stroke="#0284C7" strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M54 106C50 80 68 56 100 56C132 56 150 80 146 106" />
        <rect x="42" y="98" width="12" height="24" rx="4" fill="#0284C7" stroke="#0369A1" strokeWidth="2" />
        <rect x="146" y="98" width="12" height="24" rx="4" fill="#0284C7" stroke="#0369A1" strokeWidth="2" />
      </g>

      {/* Learning or Level audio note */}
      {(isLearning || level >= 4) && (
        <g transform="translate(136, 120)">
          <rect x="0" y="0" width="18" height="16" rx="3" fill="#BAE6FD" stroke="#0284C7" strokeWidth="1.5" />
          <path d="M5 11V6L13 4V9" stroke="#0369A1" strokeWidth="1.5" />
          <circle cx="5" cy="11" r="2" fill="#0369A1" />
          <circle cx="13" cy="9" r="2" fill="#0369A1" />
        </g>
      )}

      {/* Level-up golden star badge */}
      {isLevelUp && (
        <g transform="translate(85, 26)">
          <polygon points="15,0 19,10 30,11 22,18 25,29 15,23 5,29 8,18 0,11 11,10" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}
