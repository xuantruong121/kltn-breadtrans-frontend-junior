import React from "react";

/**
 * The arena's mascot: a slice of bread in flat colours with a team headband.
 * Drawn here rather than reusing the market's bun, which relies on gradients
 * and glows. Decorative: hidden from assistive technology.
 */
export type MascotTeam = "me" | "rival" | "neutral";
export type MascotMood = "ready" | "happy" | "sad";

const BAND: Record<MascotTeam, { band: string; knot: string }> = {
  me: { band: "#0284c7", knot: "#0369a1" }, // sky-600 / sky-700
  rival: { band: "#e11d48", knot: "#be123c" }, // rose-600 / rose-700
  neutral: { band: "#d97706", knot: "#b45309" }, // amber-600 / amber-700
};

export function BreadMascot({
  team = "neutral",
  mood = "ready",
  facing = "right",
  size = 120,
  className = "",
}: {
  team?: MascotTeam;
  mood?: MascotMood;
  facing?: "left" | "right";
  size?: number;
  className?: string;
}) {
  const { band, knot } = BAND[team];
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={facing === "left" ? { transform: "scaleX(-1)" } : undefined}
    >
      {/* shadow on the floor */}
      <ellipse cx="60" cy="111" rx="34" ry="5" fill="#000" opacity="0.08" />
      {/* crust */}
      <path
        d="M22 58c-9-4-12-15-7-24 6-11 20-14 30-9 4-9 14-13 24-10 13 4 21 17 16 29 7 3 11 11 9 19L91 102c-1 4-4 6-8 6H37c-4 0-7-2-8-6z"
        fill="#c2410c"
      />
      {/* crumb */}
      <path
        d="M27 57c-6-3-8-10-5-17 4-8 14-10 21-6l4 2 1-4c3-7 11-10 18-8 10 3 15 12 12 21l-1 4 4 1c5 2 8 7 7 12L86 99c0 2-2 3-4 3H38c-2 0-4-1-4-3z"
        fill="#fcd34d"
      />
      {/* headband */}
      <path d="M24 48c22-9 50-9 72 1l-2 9c-21-9-46-9-68-1z" fill={band} />
      <path d="M93 50l11-6 1 11-10-1z" fill={knot} />
      <path d="M93 52l9 9-9 3z" fill={band} />
      {/* face */}
      {mood === "sad" ? (
        <>
          <path d="M42 70l9-3M78 70l-9-3" stroke="#431407" strokeWidth="3" strokeLinecap="round" />
          <circle cx="47" cy="75" r="3.5" fill="#431407" />
          <circle cx="73" cy="75" r="3.5" fill="#431407" />
          <path d="M51 92c5-5 13-5 18 0" stroke="#431407" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : mood === "happy" ? (
        <>
          <path d="M42 74c3-5 8-5 11 0M67 74c3-5 8-5 11 0" stroke="#431407" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M48 85c4 9 20 9 24 0z" fill="#431407" />
          <path d="M53 89c3 3 11 3 14 0" fill="#fb7185" />
        </>
      ) : (
        <>
          <path d="M41 66l11 3M79 66l-11 3" stroke="#431407" strokeWidth="3" strokeLinecap="round" />
          <circle cx="47" cy="75" r="4" fill="#431407" />
          <circle cx="73" cy="75" r="4" fill="#431407" />
          <circle cx="48.5" cy="73.5" r="1.3" fill="#fff" />
          <circle cx="74.5" cy="73.5" r="1.3" fill="#fff" />
          <path d="M52 88c5 3 11 3 16 0" stroke="#431407" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      <circle cx="38" cy="83" r="4.5" fill="#fb923c" opacity="0.55" />
      <circle cx="82" cy="83" r="4.5" fill="#fb923c" opacity="0.55" />
    </svg>
  );
}
