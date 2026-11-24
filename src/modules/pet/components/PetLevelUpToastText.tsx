import { formatXp } from "@/lib/gamification/xpLevel";

/** The words of the toast shown when the thú ảo goes up a level (LevelUpWatcher). */
export function PetLevelUpToastText({ level, expToNext }: { level: number; expToNext: number }) {
  return (
    <span className="text-sm">
      <strong className="font-extrabold">Thú ảo đã lên Cấp {level}</strong>
      {expToNext > 0 && (
        <span className="block text-slate-600 dark:text-slate-300">
          Còn {formatXp(expToNext)} EXP để lên Cấp {level + 1}.
        </span>
      )}
    </span>
  );
}

export default PetLevelUpToastText;
