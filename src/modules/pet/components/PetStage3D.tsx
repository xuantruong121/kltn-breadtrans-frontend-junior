"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  Smile, 
  Sparkles, 
  Zap, 
  RotateCcw, 
  Award, 
  Shield, 
  ChevronRight,
  Flame
} from "lucide-react";
import { Pet } from "@/lib/api/services/gamification.service";
import { PET_SPECIES_LIST, PetSpecies, getSpeciesIdFromPetName } from "../types";
import { PetSelectorModal } from "./PetSelectorModal";
import { Button3D } from "@/components/ui";
import toast from "react-hot-toast";

interface PetStage3DProps {
  pet: Pet | null | undefined;
  banhRan: number;
  onFeed: () => void;
  onChangeSpecies: (petName: string) => void;
  isFeeding?: boolean;
  isChangingSpecies?: boolean;
}

// ── LOGICAL COMPOSITE PET AVATAR RENDERER ──
const PetVisualCharacter: React.FC<{
  speciesId: string;
  level: number;
  health: number;
  happiness: number;
  isEating: boolean;
}> = ({ speciesId, level, health, happiness, isEating }) => {
  if (isEating) {
    return <div className="text-7xl sm:text-8xl filter drop-shadow-md">😋</div>;
  }
  if (health < 30) {
    return <div className="text-7xl sm:text-8xl filter drop-shadow-md">🥺</div>;
  }
  if (happiness < 30) {
    return <div className="text-7xl sm:text-8xl filter drop-shadow-md">😢</div>;
  }

  const stage = level >= 10 ? 4 : level >= 7 ? 3 : level >= 4 ? 2 : 1;

  // 1. CÚ MÈO THÔNG THÁI (OWLY - Always an Owl with evolving accessories)
  if (speciesId === "owly") {
    if (stage === 1) {
      return (
        <div className="relative flex items-center justify-center">
          <span className="text-7xl sm:text-8xl filter drop-shadow-md">🐣</span>
          <span className="absolute -bottom-1 -right-2 text-2xl drop-shadow">📖</span>
        </div>
      );
    }
    if (stage === 2) {
      return (
        <div className="relative flex items-center justify-center">
          <span className="text-7xl sm:text-8xl filter drop-shadow-md">🦉</span>
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-3xl drop-shadow pointer-events-none">👓</span>
        </div>
      );
    }
    if (stage === 3) {
      return (
        <div className="relative flex items-center justify-center">
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl drop-shadow animate-bounce pointer-events-none">
            🎓
          </span>
          <span className="text-7xl sm:text-8xl filter drop-shadow-md">🦉</span>
          <span className="absolute -bottom-1 -right-3 text-2xl drop-shadow">
            📖
          </span>
        </div>
      );
    }
    return (
      <div className="relative flex items-center justify-center">
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-4xl drop-shadow animate-pulse pointer-events-none">
          👑
        </span>
        <span className="text-7xl sm:text-8xl filter drop-shadow-md">🦉</span>
        <span className="absolute -bottom-1 -left-3 text-2xl drop-shadow animate-spin">
          ✨
        </span>
        <span className="absolute -bottom-1 -right-3 text-2xl drop-shadow">
          🌟
        </span>
      </div>
    );
  }

  // 2. MÈO BÁNH CÁ TAIYAKI (MIMI - Always a Cat with evolving accessories)
  if (speciesId === "mimi") {
    if (stage === 1) {
      return (
        <div className="relative flex items-center justify-center">
          <span className="text-7xl sm:text-8xl filter drop-shadow-md">🐱</span>
          <span className="absolute -bottom-1 -right-2 text-2xl drop-shadow">🐟</span>
        </div>
      );
    }
    if (stage === 2) {
      return (
        <div className="relative flex items-center justify-center">
          <span className="absolute -top-4 -right-1 text-3xl drop-shadow animate-bounce pointer-events-none">
            🎀
          </span>
          <span className="text-7xl sm:text-8xl filter drop-shadow-md">😻</span>
        </div>
      );
    }
    if (stage === 3) {
      return (
        <div className="relative flex items-center justify-center">
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl drop-shadow animate-pulse pointer-events-none">
            ✨
          </span>
          <span className="text-7xl sm:text-8xl filter drop-shadow-md">😽</span>
          <span className="absolute -bottom-1 -left-3 text-3xl drop-shadow pointer-events-none">
            🪽
          </span>
        </div>
      );
    }
    return (
      <div className="relative flex items-center justify-center">
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-4xl drop-shadow animate-bounce pointer-events-none">
          👑
        </span>
        <span className="text-7xl sm:text-8xl filter drop-shadow-md">😸</span>
        <span className="absolute -bottom-1 -right-3 text-2xl drop-shadow animate-pulse">
          💖
        </span>
      </div>
    );
  }

  // 3. CÁO PHIM ẢNH (FOXY - Always a Fox with evolving accessories)
  if (speciesId === "foxy") {
    if (stage === 1) {
      return (
        <div className="relative flex items-center justify-center">
          <span className="text-7xl sm:text-8xl filter drop-shadow-md">🦊</span>
        </div>
      );
    }
    if (stage === 2) {
      return (
        <div className="relative flex items-center justify-center">
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl drop-shadow pointer-events-none">
            🎧
          </span>
          <span className="text-7xl sm:text-8xl filter drop-shadow-md">🦊</span>
        </div>
      );
    }
    if (stage === 3) {
      return (
        <div className="relative flex items-center justify-center">
          <span className="absolute -top-3 -left-3 text-2xl drop-shadow animate-bounce pointer-events-none">
            🎵
          </span>
          <span className="text-7xl sm:text-8xl filter drop-shadow-md">🦊</span>
          <span className="absolute -bottom-2 -right-3 text-3xl drop-shadow animate-pulse pointer-events-none">
            🎤
          </span>
        </div>
      );
    }
    return (
      <div className="relative flex items-center justify-center">
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-4xl drop-shadow animate-pulse pointer-events-none">
          🌟
        </span>
        <span className="text-7xl sm:text-8xl filter drop-shadow-md">🦊</span>
        <span className="absolute -bottom-2 -right-3 text-2xl drop-shadow animate-bounce">
          🎶
        </span>
      </div>
    );
  }

  // 4. BÁNH MÌ DŨNG CẢM (BREADY - Always Bread with evolving battle gear)
  if (stage === 1) {
    return (
      <div className="relative flex items-center justify-center">
        <span className="text-7xl sm:text-8xl filter drop-shadow-md">🍞</span>
      </div>
    );
  }
  if (stage === 2) {
    return (
      <div className="relative flex items-center justify-center">
        <span className="text-7xl sm:text-8xl filter drop-shadow-md">🥐</span>
        <span className="absolute -bottom-1 -right-3 text-2xl drop-shadow">🛡️</span>
      </div>
    );
  }
  if (stage === 3) {
    return (
      <div className="relative flex items-center justify-center">
        <span className="text-7xl sm:text-8xl filter drop-shadow-md">🥖</span>
        <span className="absolute -bottom-1 -right-3 text-3xl drop-shadow animate-pulse">⚔️</span>
      </div>
    );
  }
  return (
    <div className="relative flex items-center justify-center">
      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl drop-shadow animate-bounce pointer-events-none">
        👑
      </span>
      <span className="text-7xl sm:text-8xl filter drop-shadow-md">🍞</span>
      <span className="absolute -bottom-1 -right-2 text-2xl drop-shadow">✨</span>
    </div>
  );
};

export const PetStage3D: React.FC<PetStage3DProps> = ({
  pet,
  banhRan,
  onFeed,
  onChangeSpecies,
  isFeeding = false,
  isChangingSpecies = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [heartParticles, setHeartParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [speechText, setSpeechText] = useState("");
  const [isEating, setIsEating] = useState(false);

  // Identify active pet species from pet.name
  const speciesId = getSpeciesIdFromPetName(pet?.name);
  const activeSpecies: PetSpecies =
    PET_SPECIES_LIST.find((s) => s.id === speciesId) || PET_SPECIES_LIST[0];

  const petLevel = pet?.level || 1;
  const petExp = pet?.exp || 0;
  const currentLevelExp = petExp % 1000;
  const progressPercent = Math.min((currentLevelExp / 1000) * 100, 100);
  const health = pet?.health ?? 100;
  const happiness = pet?.happiness ?? 100;
  const canFeed = banhRan >= 10;

  // Evolution Stage based on level
  const currentStage =
    petLevel >= 10
      ? activeSpecies.stages.stage4
      : petLevel >= 7
      ? activeSpecies.stages.stage3
      : petLevel >= 4
      ? activeSpecies.stages.stage2
      : activeSpecies.stages.stage1;

  // Dynamic Speech Bubble based on health and happiness
  useEffect(() => {
    if (health < 40) {
      setSpeechText("Mình đang đói quá, cho mình xin 1 mẩu bánh mì đi bạn ơi! 🥺");
    } else if (happiness < 40) {
      setSpeechText("Hôm nay bạn chưa vào học với mình... Hãy làm 1 bài tập nhé! 😢");
    } else {
      const quotes = [
        activeSpecies.quote,
        `Chào bạn! Hôm nay cùng ${activeSpecies.name} chinh phục bài học mới nhé! ✨`,
        `Thú cưng ${activeSpecies.name} cấp ${petLevel} luôn đồng hành cùng bạn! 💖`,
      ];
      setSpeechText(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }, [pet?.name, health, happiness, petLevel, activeSpecies]);

  // Click on Pet to Pet / Pat (Xoa đầu thả tim)
  const handlePetClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newId = Date.now() + Math.random();
    setHeartParticles((prev) => [...prev.slice(-6), { id: newId, x, y }]);

    setTimeout(() => {
      setHeartParticles((prev) => prev.filter((p) => p.id !== newId));
    }, 1200);

    const happySayings = [
      "Thích quá đi! Cảm ơn bạn đã xoa đầu mình! ❤️",
      "Meow! Cùng cố gắng học tập nhé! ✨",
      "Bạn là người bạn tuyệt vời nhất! 🥰",
    ];
    setSpeechText(happySayings[Math.floor(Math.random() * happySayings.length)]);
  };

  const handleFeedClick = () => {
    if (!canFeed) {
      toast.error(`Bạn cần ít nhất 10 Bánh Mì để cho ăn (hiện có: ${banhRan})`);
      return;
    }

    setIsEating(true);
    setSpeechText("Măm măm... Ngon tuyệt cú mèo! Cảm ơn bạn nhiều! 🍞💖");
    onFeed();

    setTimeout(() => {
      setIsEating(false);
    }, 1500);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_10px_0_0_#e2e8f0] p-6 sm:p-8 relative overflow-hidden"
      >
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-200/30 via-orange-200/20 to-transparent rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
          {/* ── 3D PET AVATAR STAGE (Left 45%) ── */}
          <div className="flex flex-col items-center shrink-0 w-full sm:w-auto">
            {/* Speech Bubble */}
            <motion.div
              key={speechText}
              initial={{ opacity: 0, scale: 0.8, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm max-w-xs text-center mb-4 text-xs sm:text-sm font-bold text-slate-700 select-none"
            >
              <span>{speechText}</span>
              {/* Bubble Arrow */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-slate-200 rotate-45" />
            </motion.div>

            {/* 3D Interactive Stage Orb */}
            <div className="relative">
              <motion.div
                onClick={handlePetClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9, y: 8 }}
                className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full border-8 border-white bg-gradient-to-br ${activeSpecies.themeColor.bg} shadow-[0_12px_24px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center cursor-pointer select-none relative overflow-hidden group`}
              >
                {/* Stage Lighting */}
                <div className="absolute top-2 inset-x-0 h-16 bg-white/25 rounded-full blur-md" />

                {/* Floating Heart Particles */}
                {heartParticles.map((particle) => (
                  <motion.span
                    key={particle.id}
                    initial={{ opacity: 1, scale: 0.5, y: 0 }}
                    animate={{ opacity: 0, scale: 1.8, y: -80 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute text-2xl pointer-events-none z-20"
                    style={{ left: particle.x, top: particle.y }}
                  >
                    ❤️
                  </motion.span>
                ))}

                {/* Eating Animation Bread */}
                {isEating && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.2, y: -40 }}
                    animate={{ opacity: 1, scale: 1.2, y: 0 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute top-4 text-4xl z-20 animate-bounce"
                  >
                    🍞
                  </motion.div>
                )}

                {/* Pet Main Avatar Representation with Layered Accessories */}
                <div className="z-10 transition-transform duration-300 group-hover:scale-110">
                  <PetVisualCharacter
                    speciesId={speciesId}
                    level={petLevel}
                    health={health}
                    happiness={happiness}
                    isEating={isEating}
                  />
                </div>

                {/* Sparkling Halo on High Happiness */}
                {happiness >= 80 && (
                  <div className="absolute top-2 right-4 text-3xl animate-bounce z-10 pointer-events-none">
                    ✨
                  </div>
                )}
              </motion.div>

              {/* Stage Title & Pet Interaction Hint */}
              <div className="text-center mt-3 flex flex-col items-center gap-1.5">
                <span className="bg-gradient-to-r from-slate-800 to-slate-900 text-white text-xs font-black px-3.5 py-1 rounded-full shadow-md border border-slate-700/60">
                  ✨ {currentStage.name}
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  👉 Nhấp để vuốt ve & xoa đầu thú cưng!
                </span>
              </div>
            </div>
          </div>

          {/* ── PET STATS & ACTIONS (Right 55%) ── */}
          <div className="flex-1 w-full space-y-4">
            {/* Header: Name, Species Tag, Stage Badge & Change Species Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${activeSpecies.elementColor}`}
                  >
                    {activeSpecies.element}
                  </span>
                  <span className="text-xs font-black text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                    Cấp độ {petLevel}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
                  {activeSpecies.speciesName}
                </h3>
              </div>

              {/* Change Companion Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors flex items-center gap-1.5 self-start sm:self-center cursor-pointer border border-slate-200"
              >
                <RotateCcw size={14} /> Đổi Thú Cưng
              </button>
            </div>

            {/* EXP Progress Bar */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Tiến trình cấp {petLevel}</span>
                <span className="font-extrabold text-purple-600">
                  {currentLevelExp} / 1000 XP ({Math.round(progressPercent)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-200 p-0.5">
                <motion.div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Health & Happiness 2-Column Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Health */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex justify-between text-xs font-extrabold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Heart size={15} className="text-rose-500 fill-rose-500" /> Sức khỏe
                  </span>
                  <span>{health}/100</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      health < 40 ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${health}%` }}
                  />
                </div>
              </div>

              {/* Happiness */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex justify-between text-xs font-extrabold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Smile size={15} className="text-amber-500 fill-amber-500" /> Vui vẻ
                  </span>
                  <span>{happiness}/100</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      happiness < 40 ? "bg-rose-500" : "bg-amber-400"
                    }`}
                    style={{ width: `${happiness}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Passive Skill Buff Card */}
            <div className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                <Zap size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-amber-900 leading-tight">
                  Kỹ Năng Nội Tại: {activeSpecies.buff}
                </h4>
                <p className="text-[11px] font-medium text-amber-800/80 mt-0.5 leading-snug">
                  {activeSpecies.buffDetail}
                </p>
              </div>
            </div>

            {/* Action Button: Feed Bread */}
            <div className="pt-2">
              <Button3D
                variant={canFeed ? "green" : "white"}
                size="md"
                onClick={handleFeedClick}
                disabled={isFeeding || !canFeed}
                className="w-full font-black text-sm sm:text-base py-3 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>🍞 Cho thú cưng ăn (10 Bánh Mì)</span>
              </Button3D>
              {!canFeed && (
                <p className="text-center text-xs font-bold text-rose-500 mt-1.5">
                  ⚠️ Bạn cần ít nhất 10 Bánh Mì để cho ăn (Hiện có: {banhRan})
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Companion Selector Modal */}
      <PetSelectorModal
        isOpen={isModalOpen}
        currentPetName={pet?.name || "Bánh Mì"}
        petLevel={petLevel}
        roster={pet?.roster}
        onClose={() => setIsModalOpen(false)}
        onSelectPet={(species) => {
          onChangeSpecies(species.speciesName);
          setIsModalOpen(false);
        }}
        isUpdating={isChangingSpecies}
      />
    </>
  );
};
