/**
 * The "khiên giữ chuỗi" (glossary: streak shield) drawn as a steel-blue heater
 * shield: an arched top edge, straight sides that curve to a point, a dark rim
 * and a field split light/dark down the middle, so it reads as a shield and
 * not a badge (owner 2026-11-17: blue, like a shield). Flat fills only. With
 * `count` the number sits on the field; without it the shield is a plain
 * icon. Decorative: the caller names the count in words (title, sr text).
 */
type Props = {
  count?: number;
  className?: string;
};

export function StreakShieldIcon({ count, className = "h-5 w-[18px]" }: Props) {
  const twoDigits = count !== undefined && count >= 10;
  return (
    <svg viewBox="0 0 32 36" className={className} aria-hidden="true" focusable="false">
      {/* rim */}
      <path
        d="M3 3.5 Q16 0.5 29 3.5 V15.5 C29 24.5 23 30.8 16 34.5 C9 30.8 3 24.5 3 15.5 Z"
        className="fill-blue-800 dark:fill-blue-400"
      />
      {/* field, light half */}
      <path
        d="M5.5 5.6 Q16 3.1 26.5 5.6 V15.6 C26.5 23 21.6 28.3 16 31.6 C10.4 28.3 5.5 23 5.5 15.6 Z"
        className="fill-blue-500"
      />
      {/* field, dark half */}
      <path
        d="M16 4.35 Q21.25 4.35 26.5 5.6 V15.6 C26.5 23 21.6 28.3 16 31.6 Z"
        className="fill-blue-600"
      />
      {count !== undefined && (
        <text
          x="16"
          y="18.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={twoDigits ? 12 : 15}
          fontWeight={900}
          className="fill-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {count}
        </text>
      )}
    </svg>
  );
}

export default StreakShieldIcon;
