import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Modern 3D Claymorphic / Isometric SVG Illustrations
 * Crafted specifically for BreadTrans Gamified Practice Hub
 * Eliminates generic flat AI-slop icons with tactile multi-depth layers
 */

export function ExamStopwatch3d({ className = "", size = 96 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="stopwatch-glow" cx="0.5" cy="0.5" r="0.5" fx="0.3" fy="0.3">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="60%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </radialGradient>
        <linearGradient id="metal-casing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="clock-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <filter id="clay-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#9a3412" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Behind Document Sheet */}
      <rect
        x="18"
        y="14"
        width="64"
        height="84"
        rx="10"
        transform="rotate(-8 18 14)"
        fill="#f8fafc"
        stroke="#e2e8f0"
        strokeWidth="2.5"
      />
      <rect
        x="24"
        y="22"
        width="38"
        height="5"
        rx="2.5"
        transform="rotate(-8 24 22)"
        fill="#cbd5e1"
      />
      <rect
        x="23"
        y="32"
        width="46"
        height="4"
        rx="2"
        transform="rotate(-8 23 32)"
        fill="#e2e8f0"
      />
      <rect
        x="22"
        y="41"
        width="42"
        height="4"
        rx="2"
        transform="rotate(-8 22 41)"
        fill="#e2e8f0"
      />

      {/* Main 3D Stopwatch */}
      <g filter="url(#clay-shadow)">
        {/* Top Button / Crown */}
        <rect x="68" y="16" width="14" height="10" rx="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="71" y="11" width="8" height="6" rx="2" fill="#ea580c" />

        {/* Stopwatch Outer Ring */}
        <circle cx="75" cy="65" r="42" fill="url(#metal-casing)" stroke="#e2e8f0" strokeWidth="2" />
        <circle cx="75" cy="65" r="37" fill="url(#stopwatch-glow)" opacity="0.9" />
        <circle cx="75" cy="65" r="32" fill="url(#clock-face)" />

        {/* Dial ticks */}
        <circle cx="75" cy="38" r="2" fill="#ea580c" />
        <circle cx="102" cy="65" r="2" fill="#94a3b8" />
        <circle cx="75" cy="92" r="2" fill="#94a3b8" />
        <circle cx="48" cy="65" r="2" fill="#94a3b8" />

        {/* Hand / Needle pointing to 10 o'clock */}
        <line x1="75" y1="65" x2="60" y2="46" stroke="#ea580c" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="75" y1="65" x2="88" y2="72" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="75" cy="65" r="5" fill="#0f172a" />
        <circle cx="75" cy="65" r="2" fill="#ffffff" />

        {/* Digital Pill Gauge */}
        <rect x="62" y="74" width="26" height="11" rx="4" fill="#0f172a" />
        <text x="75" y="82.5" fill="#38bdf8" fontSize="6.5" fontWeight="900" textAnchor="middle" fontFamily="monospace">
          120:00
        </text>
      </g>
    </svg>
  );
}

export function ListeningHeadphones3d({ className = "", size = 64 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="headband-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="cup-grad" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="60%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <filter id="blue-drop" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1d4ed8" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Acoustic wave ripples */}
      <circle cx="16" cy="48" r="14" stroke="#93c5fd" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
      <circle cx="64" cy="48" r="14" stroke="#93c5fd" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />

      <g filter="url(#blue-drop)">
        {/* Headband Arch */}
        <path
          d="M18 46 C 18 20, 62 20, 62 46"
          stroke="url(#headband-grad)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M26 30 C 33 24, 47 24, 54 30"
          stroke="#93c5fd"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Left Ear Cushion & Cup */}
        <rect x="10" y="38" width="14" height="24" rx="7" fill="url(#cup-grad)" stroke="#1e40af" strokeWidth="1.5" />
        <rect x="20" y="42" width="5" height="16" rx="2.5" fill="#0f172a" />

        {/* Right Ear Cushion & Cup */}
        <rect x="56" y="38" width="14" height="24" rx="7" fill="url(#cup-grad)" stroke="#1e40af" strokeWidth="1.5" />
        <rect x="55" y="42" width="5" height="16" rx="2.5" fill="#0f172a" />

        {/* Waveform Bar Mini-Indicator */}
        <rect x="34" y="58" width="3" height="8" rx="1.5" fill="#2563eb" />
        <rect x="39" y="54" width="3" height="14" rx="1.5" fill="#3b82f6" />
        <rect x="44" y="56" width="3" height="10" rx="1.5" fill="#60a5fa" />
      </g>
    </svg>
  );
}

export function ReadingBooklet3d({ className = "", size = 64 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="emerald-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <filter id="emerald-drop" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#047857" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#emerald-drop)">
        {/* Book Cover Base */}
        <path
          d="M12 24 C24 20, 38 24, 40 26 C42 24, 56 20, 68 24 L68 62 C56 58, 42 61, 40 63 C38 61, 24 58, 12 62 Z"
          fill="url(#emerald-cover)"
        />

        {/* Left Page (Soft Cream) */}
        <path
          d="M14 25 C25 21, 38 25, 39 27 L39 61 C38 59, 25 56, 14 60 Z"
          fill="#fffbeb"
          stroke="#fde68a"
          strokeWidth="0.8"
        />

        {/* Right Page (Soft Cream) */}
        <path
          d="M41 27 C42 25, 55 21, 66 25 L66 60 C55 56, 42 59, 41 61 Z"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="0.8"
        />

        {/* Text Lines Left Page */}
        <line x1="18" y1="33" x2="34" y2="35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="41" x2="34" y2="43" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="18" y1="49" x2="30" y2="51" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />

        {/* Text Lines Right Page */}
        <line x1="46" y1="35" x2="62" y2="33" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        <line x1="46" y1="43" x2="62" y2="41" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="46" y1="51" x2="58" y2="49" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />

        {/* Golden Bookmark Ribbon */}
        <path d="M39 26 L39 46 L43 42 L47 46 L47 26 Z" fill="#f59e0b" />
      </g>
    </svg>
  );
}

export function SpeakingMic3d({ className = "", size = 64 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="violet-mic" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <filter id="violet-drop" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#7c3aed" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Acoustic concentric voice rings */}
      <circle cx="40" cy="30" r="22" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
      <circle cx="40" cy="30" r="28" stroke="#e9d5ff" strokeWidth="1.2" opacity="0.3" />

      <g filter="url(#violet-drop)">
        {/* Mic Capsule */}
        <rect x="30" y="16" width="20" height="32" rx="10" fill="url(#violet-mic)" stroke="#581c87" strokeWidth="1.5" />

        {/* Mic Metal Mesh Grid Lines */}
        <line x1="33" y1="24" x2="47" y2="24" stroke="#e9d5ff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="33" y1="30" x2="47" y2="30" stroke="#e9d5ff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <line x1="33" y1="36" x2="47" y2="36" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />

        {/* U-Shape Stand Arch */}
        <path d="M24 34 C 24 52, 56 52, 56 34" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />

        {/* Vertical Stand stem */}
        <line x1="40" y1="48" x2="40" y2="64" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />

        {/* Heavy Circular Base */}
        <ellipse cx="40" cy="65" rx="16" ry="5" fill="#334155" />
        <ellipse cx="40" cy="63" rx="14" ry="4" fill="#0f172a" />
      </g>
    </svg>
  );
}

export function WritingQuill3d({ className = "", size = 64 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rose-quill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="50%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>
        <filter id="rose-drop" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#e11d48" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#rose-drop)">
        {/* Background Paper Sheet */}
        <rect x="16" y="20" width="40" height="50" rx="6" fill="#ffffff" stroke="#fecdd3" strokeWidth="1.5" />
        <line x1="22" y1="28" x2="42" y2="28" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="36" x2="46" y2="36" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="22" y1="44" x2="44" y2="44" stroke="#fda4af" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="22" y1="52" x2="38" y2="52" stroke="#fda4af" strokeWidth="1.5" strokeLinecap="round" />

        {/* Checkmark badge */}
        <circle cx="48" cy="56" r="7" fill="#10b981" />
        <path d="M45 56 L47 58 L52 53" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* Sleek Ergonomic Digital Pen / Stylus */}
        <g transform="rotate(35 52 28)">
          <rect x="49" y="10" width="8" height="42" rx="4" fill="url(#rose-quill)" />
          <polygon points="49,52 57,52 53,60" fill="#0f172a" />
          <circle cx="53" cy="20" r="2" fill="#ffe4e6" />
          <rect x="49" y="32" width="8" height="4" fill="#fb7185" />
        </g>
      </g>
    </svg>
  );
}

export function FlashSprint3d({ className = "", size = 64 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bolt-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <filter id="bolt-drop" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#ea580c" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Speed Trails */}
      <line x1="14" y1="30" x2="26" y2="30" stroke="#fed7aa" strokeWidth="3" strokeLinecap="round" />
      <line x1="10" y1="42" x2="22" y2="42" stroke="#fdba74" strokeWidth="3" strokeLinecap="round" />
      <line x1="16" y1="54" x2="24" y2="54" stroke="#fed7aa" strokeWidth="2.5" strokeLinecap="round" />

      {/* Glowing Lightning Bolt */}
      <g filter="url(#bolt-drop)">
        <path
          d="M44 12 L24 40 L40 40 L34 68 L60 34 L42 34 Z"
          fill="url(#bolt-grad)"
          stroke="#c2410c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Inner Highlight */}
        <path
          d="M42 16 L28 38 L40 38 L36 58 L54 36 L40 36 Z"
          fill="#ffffff"
          opacity="0.3"
        />
      </g>
    </svg>
  );
}

export function ArenaSwords3d({ className = "", size = 64 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="shield-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="60%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>
        <filter id="arena-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#9a3412" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#arena-shadow)">
        {/* Crossed Sword 1 */}
        <g transform="rotate(45 40 40)">
          <rect x="38" y="14" width="4" height="42" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
          <rect x="32" y="52" width="16" height="4" rx="2" fill="#0f172a" />
          <rect x="38" y="56" width="4" height="10" rx="2" fill="#78350f" />
          <circle cx="40" cy="67" r="3" fill="#f59e0b" />
        </g>

        {/* Crossed Sword 2 */}
        <g transform="rotate(-45 40 40)">
          <rect x="38" y="14" width="4" height="42" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
          <rect x="32" y="52" width="16" height="4" rx="2" fill="#0f172a" />
          <rect x="38" y="56" width="4" height="10" rx="2" fill="#78350f" />
          <circle cx="40" cy="67" r="3" fill="#f59e0b" />
        </g>

        {/* Centered Crest Shield */}
        <path
          d="M40 25 C48 25, 52 28, 52 35 C52 48, 40 56, 40 56 C40 56, 28 48, 28 35 C28 28, 32 25, 40 25 Z"
          fill="url(#shield-grad)"
          stroke="#ffffff"
          strokeWidth="2"
        />

        {/* Golden Star In Shield */}
        <polygon
          points="40,31 42,36 47,37 43,40 44,45 40,42 36,45 37,40 33,37 38,36"
          fill="#ffffff"
        />
      </g>
    </svg>
  );
}

export function BakeryBanhRan3d({ className = "", size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="banhran-grad" cx="0.35" cy="0.35" r="0.6">
          <stop offset="0%" stopColor="#ffedd5" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#9a3412" />
        </radialGradient>
      </defs>
      {/* 3D Round Golden Bánh Rán with sugar glaze */}
      <circle cx="16" cy="16" r="14" fill="url(#banhran-grad)" stroke="#9a3412" strokeWidth="1" />
      {/* Sesame / Sugar Crystals */}
      <ellipse cx="12" cy="11" rx="1.8" ry="1" fill="#ffffff" transform="rotate(-20 12 11)" opacity="0.9" />
      <ellipse cx="20" cy="13" rx="1.8" ry="1" fill="#ffffff" transform="rotate(30 20 13)" opacity="0.9" />
      <ellipse cx="15" cy="19" rx="1.8" ry="1" fill="#ffffff" transform="rotate(10 15 19)" opacity="0.9" />
      <ellipse cx="21" cy="21" rx="1.8" ry="1" fill="#ffffff" transform="rotate(-15 21 21)" opacity="0.85" />
      <ellipse cx="10" cy="19" rx="1.5" ry="0.9" fill="#ffffff" transform="rotate(40 10 19)" opacity="0.85" />
    </svg>
  );
}
