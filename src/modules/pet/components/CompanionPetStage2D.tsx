"use client";

import React, { useMemo } from "react";
import {
  Heart,
  Smile,
  Utensils,
  RefreshCw,
  Loader2,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { Pet } from "@/lib/api/services/gamification.service";
import { getSpeciesIdFromPetName, PET_SPECIES_LIST } from "../types";
import {
  getPetVisualState,
  getPetStatusCopy,
  canFeedPet,
  PetVisualState,
} from "../petLogic";
import { CompanionPet2D } from "./CompanionPet2D";

interface CompanionPetStage2DProps {
  pet: Pet | null | undefined;
  banhRan: number;
  onFeed: () => void;
  onChangeSpecies: () => void;
  isFeeding?: boolean;
  isChangingSpecies?: boolean;
  isJustFed?: boolean;
  isLevelUp?: boolean;
}

export const CompanionPetStage2D: React.FC<CompanionPetStage2DProps> = ({
  pet,
  banhRan,
  onFeed,
  onChangeSpecies,
  isFeeding = false,
  isChangingSpecies = false,
  isJustFed = false,
  isLevelUp = false,
}) => {
  const speciesId = useMemo(() => {
    return getSpeciesIdFromPetName(pet?.name);
  }, [pet?.name]);

  const currentSpecies = useMemo(() => {
    return PET_SPECIES_LIST.find((s) => s.id === speciesId) || PET_SPECIES_LIST[0];
  }, [speciesId]);

  const level = pet?.level ?? 1;
  const exp = pet?.exp ?? 0;
  // The backend promotes a pet every 1,000 EXP (floor(exp / 1000) + 1).
  const expPerLevel = 1000;
  const expPercentage = Math.min(
    100,
    Math.max(0, Math.round(((exp % expPerLevel) / expPerLevel) * 100)),
  );

  const health = Math.min(100, Math.max(0, pet?.health ?? 100));
  const happiness = Math.min(100, Math.max(0, pet?.happiness ?? 100));
  const satiety = Math.min(100, Math.max(0, pet?.satiety ?? 80));

  const feedCost = pet?.feedCost ?? 10;
  const feedEligibility = useMemo(() => {
    return canFeedPet(pet, banhRan);
  }, [pet, banhRan]);

  const petDisplayName = currentSpecies.speciesName || pet?.name || "Bready";
  const satietyText = useMemo(() => {
    return getPetStatusCopy({
      petName: petDisplayName,
      satietyState: pet?.satietyState,
      satiety,
      health,
      happiness,
    });
  }, [petDisplayName, pet?.satietyState, satiety, health, happiness]);

  const visualState: PetVisualState = useMemo(() => {
    return getPetVisualState({
      health,
      happiness,
      satiety,
      canFeed: pet?.canFeed,
      satietyState: pet?.satietyState,
      isJustFed,
      isLevelUp,
    });
  }, [health, happiness, satiety, pet?.canFeed, pet?.satietyState, isJustFed, isLevelUp]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left / Center: 2D Interactive Companion Stage (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col items-center justify-center bg-gradient-to-b from-amber-50/40 via-white to-orange-50/30 border-b lg:border-b-0 lg:border-r border-slate-100 relative">
          {/* Top Stage Badges */}
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold uppercase px-3 py-1 rounded-full border ${currentSpecies.elementColor}`}
              >
                {currentSpecies.element}
              </span>
              <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 px-3 py-1 rounded-full border border-amber-200">
                Cấp {level}
              </span>
            </div>

            <button
              type="button"
              onClick={onChangeSpecies}
              disabled={isChangingSpecies}
              aria-label="Đổi sang loài thú cưng khác"
              className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <RefreshCw size={14} className={isChangingSpecies ? "animate-spin" : ""} aria-hidden="true" />
              <span>Đổi thú cưng</span>
            </button>
          </div>

          {/* 2D Companion Illustration */}
          <div className="my-4 py-4 flex flex-col items-center">
            <CompanionPet2D
              speciesId={speciesId}
              state={visualState}
              level={level}
              size="xl"
              showStateBadge={true}
            />

            {/* Pet Title & Quote */}
            <div className="mt-4 text-center max-w-sm">
              <h2 className="text-xl font-bold text-slate-900">
                {currentSpecies.speciesName || pet?.name}
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {currentSpecies.title}
              </p>
              {currentSpecies.quote && (
                <p className="text-xs text-amber-900/80 italic mt-2 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200/60">
                  &ldquo;{currentSpecies.quote}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Level & EXP Progress Bar */}
          <div className="w-full max-w-md mt-2 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-700">
                <TrendingUp size={14} className="text-amber-600" aria-hidden="true" />
                <span>Tiến trình cấp độ</span>
              </span>
              <span className="font-bold text-amber-900">
                {expPercentage}% ({exp} EXP)
              </span>
            </div>
            <div
              className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden"
              role="progressbar"
              aria-valuenow={expPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tiến trình kinh nghiệm thú cưng"
            >
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300 motion-reduce:transition-none"
                style={{ width: `${expPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Care & Feeding Dashboard Panel (5 cols) */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-white">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Chỉ Số Nuôi Dưỡng
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Duy trì sức khỏe và độ vui vẻ để giữ trọn hiệu ứng bổ trợ học tập
              </p>
            </div>

            {/* Health & Happiness Meters */}
            <div className="space-y-4">
              {/* Health Meter */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Heart size={15} className="text-rose-500 fill-rose-500" aria-hidden="true" />
                    <span>Sức khỏe (Health)</span>
                  </span>
                  <span className="font-bold text-rose-700">{health}%</span>
                </div>
                <div
                  className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={health}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Sức khỏe thú cưng"
                >
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-300 motion-reduce:transition-none"
                    style={{ width: `${health}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {health >= 70
                    ? "Thú cưng tràn đầy năng lượng sẵn sàng học tập."
                    : "Sức khỏe đang thấp; hãy duy trì việc học và theo dõi trạng thái thú cưng."}
                </p>
              </div>

              {/* Happiness Meter */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Smile size={15} className="text-amber-600" aria-hidden="true" />
                    <span>Vui vẻ (Happiness)</span>
                  </span>
                  <span className="font-bold text-amber-700">{happiness}%</span>
                </div>
                <div
                  className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={happiness}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Độ vui vẻ thú cưng"
                >
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-300 motion-reduce:transition-none"
                    style={{ width: `${happiness}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {happiness >= 70
                    ? "Tâm trạng rất phấn khởi, sẵn sàng đồng hành cùng bạn."
                    : "Tâm trạng đang thấp; hãy quay lại tương tác cùng thú cưng sau."}
                </p>
              </div>
              {/* Satiety Meter */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Utensils size={15} className="text-orange-500" aria-hidden="true" />
                    <span>Độ no (Satiety)</span>
                  </span>
                  <span className="font-bold text-orange-700">{satiety}%</span>
                </div>
                <div
                  className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={satiety}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Độ no của thú cưng"
                >
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-300 motion-reduce:transition-none"
                    style={{ width: `${satiety}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {satiety >= 80
                    ? "Thú cưng đã no căng, chưa cần nạp thêm năng lượng."
                    : satiety >= 50
                      ? "Thú cưng đã ăn vừa đủ, có thể ăn thêm khi đói hơn."
                      : satiety >= 20
                        ? "Thú cưng đang đói bụng, hãy cho ăn để bổ sung năng lượng."
                        : "Thú cưng đang rất đói! Cần cho ăn ngay để tránh giảm sức khỏe."}
                </p>
              </div>
            </div>

            {/* Active Passive Buff Card */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-1">
                <ShieldCheck size={16} className="text-amber-600" aria-hidden="true" />
                <span>Đặc điểm thú cưng: {currentSpecies.buff}</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {currentSpecies.buffDetail}
              </p>
            </div>
          </div>

          {/* Feeding Panel */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Chi phí mỗi bữa ăn:</span>
              <span className="font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                {feedCost} Bánh Mì
              </span>
            </div>

            <button
              type="button"
              onClick={onFeed}
              disabled={isFeeding || !feedEligibility.allowed}
              aria-label={`Cho thú cưng ăn, tiêu hao ${feedCost} Bánh Mì`}
              className={`w-full min-h-[48px] px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                feedEligibility.allowed
                  ? "bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-xs"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {isFeeding ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  <span>Đang cho ăn...</span>
                </>
              ) : (
                <>
                  <Utensils size={17} aria-hidden="true" />
                  <span>Cho Thú Cưng Ăn ({feedCost} Bánh Mì)</span>
                </>
              )}
            </button>

            {/* Satiety or balance status */}
            {!feedEligibility.allowed && (pet?.satietyState === "FULL" || satiety >= 80) ? (
              <p className="text-center text-xs font-medium text-slate-500">{satietyText}</p>
            ) : banhRan < feedCost ? (
              <p className="text-center text-xs font-semibold text-rose-600">
                Bạn cần {feedCost} Bánh Mì (Số dư hiện tại: {banhRan})
              </p>
            ) : (
              <p className="text-center text-[11px] text-slate-500">
                {satietyText} • Lượt nhận EXP hôm nay: {pet?.dailyRewardedFeedCount ?? 0}/{pet?.dailyRewardLimit ?? 3}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
