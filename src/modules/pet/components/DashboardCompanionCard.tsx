"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Smile,
  Utensils,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { gamificationService, Pet } from "@/lib/api/services/gamification.service";
import axiosClient from "@/lib/api/axiosClient";
import { getSpeciesIdFromPetName, PET_SPECIES_LIST } from "../types";
import {
  getPetVisualState,
  getPetStatusCopy,
  canFeedPet,
  handleFeedFailure,
} from "../petLogic";
import { CompanionPet2D } from "./CompanionPet2D";

interface DashboardCompanionCardProps {
  className?: string;
}

export const DashboardCompanionCard: React.FC<DashboardCompanionCardProps> = ({
  className = "",
}) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [isJustFed, setIsJustFed] = useState(false);
  const [isLevelUp, setIsLevelUp] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // 1. Fetch current Pet data from backend (authoritative)
  const {
    data: pet,
    isLoading: isPetLoading,
    isError: isPetError,
    refetch: refetchPet,
  } = useQuery<Pet | null>({
    queryKey: ["my-pet", user?.id],
    queryFn: gamificationService.getMyPet,
    enabled: !!user?.id,
  });

  // 2. Fetch authoritative Bánh Mì balance
  const { data: balanceData } = useQuery<{ totalBanh: number }>({
    queryKey: ["market-balance"],
    queryFn: async (): Promise<{ totalBanh: number }> => {
      const res = (await axiosClient.get("/market/currency/balance")) as any;
      return res ?? { totalBanh: 0 };
    },
    enabled: !!user?.id,
  });

  const userBalance = balanceData?.totalBanh ?? 0;

  // Derive species information
  const speciesId = useMemo(() => {
    return getSpeciesIdFromPetName(pet?.name);
  }, [pet?.name]);

  const speciesInfo = useMemo(() => {
    return PET_SPECIES_LIST.find((s) => s.id === speciesId) || PET_SPECIES_LIST[0];
  }, [speciesId]);

  // Feed eligibility strictly from backend metadata
  const feedCost = pet?.feedCost ?? 10;
  const feedEligibility = useMemo(() => {
    return canFeedPet(pet, userBalance);
  }, [pet, userBalance]);

  const satiety = Math.min(100, Math.max(0, pet?.satiety ?? 80));
  const petDisplayName = pet?.name || speciesInfo.speciesName || "Bready";
  const satietyText = useMemo(() => {
    return getPetStatusCopy({
      petName: petDisplayName,
      satietyState: pet?.satietyState,
      satiety,
      health: pet?.health,
      happiness: pet?.happiness,
    });
  }, [petDisplayName, pet?.satietyState, satiety, pet?.health, pet?.happiness]);

  // Visual pose state
  const visualState = useMemo(() => {
    return getPetVisualState({
      health: pet?.health,
      happiness: pet?.happiness,
      satiety,
      canFeed: pet?.canFeed,
      satietyState: pet?.satietyState,
      isJustFed,
      isLevelUp,
    });
  }, [pet?.health, pet?.happiness, satiety, pet?.canFeed, pet?.satietyState, isJustFed, isLevelUp]);

  // Feed Pet Mutation
  const feedMutation = useMutation({
    mutationFn: gamificationService.feedPet,
    onSuccess: (updatedPet) => {
      // Invalidate authoritative queries
      queryClient.invalidateQueries({ queryKey: ["my-pet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-today", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["market-balance"] });

      const prevLevel = pet?.level ?? 1;
      const leveledUp = updatedPet.level > prevLevel;

      if (leveledUp) {
        setIsLevelUp(true);
        const msg = `Thú cưng đã thăng cấp lên Cấp ${updatedPet.level}!`;
        setStatusFeedback(msg);
        toast.success(msg, { duration: 5000 });
        setTimeout(() => setIsLevelUp(false), 5000);
      } else {
        setIsJustFed(true);
        const msg = `Đã cho thú cưng ăn thành công!`;
        setStatusFeedback(msg);
        toast.success(msg);
        setTimeout(() => setIsJustFed(false), 4000);
      }
    },
    onError: (err: any) => {
      const failure = handleFeedFailure(err, userBalance);
      setStatusFeedback(failure.errorMessage);
      toast.error(failure.errorMessage);
    },
  });

  const handleFeedClick = () => {
    if (!feedEligibility.allowed) {
      if (feedEligibility.reason) {
        toast.error(feedEligibility.reason);
      }
      return;
    }
    feedMutation.mutate();
  };

  return (
    <aside
      className={`rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col space-y-4 h-fit ${className}`}
      aria-label="Thẻ thông tin thú cưng đồng hành"
    >
      {/* Accessible live region for feeding status */}
      <div className="sr-only" role="status" aria-live="polite">
        {statusFeedback}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-rose-500 fill-rose-500" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Thú Cưng Đồng Hành
          </h3>
        </div>
        {pet && (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
            Cấp {pet.level}
          </span>
        )}
      </div>

      {/* Body States */}
      {isPetLoading ? (
        /* Loading Skeleton */
        <div className="space-y-4 animate-pulse" role="status" aria-label="Đang tải dữ liệu thú cưng">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="size-16 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-16 rounded-xl bg-slate-100" />
          <div className="h-11 rounded-xl bg-slate-200" />
        </div>
      ) : isPetError ? (
        /* Error State */
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-center space-y-2.5">
          <AlertCircle size={20} className="mx-auto text-rose-500" aria-hidden="true" />
          <p className="text-xs font-bold text-rose-900">Không thể tải thông tin thú cưng</p>
          <button
            type="button"
            onClick={() => refetchPet()}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Thử lại</span>
          </button>
        </div>
      ) : !pet ? (
        /* Empty State */
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 text-center space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <Heart size={22} aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Chưa có thú cưng đồng hành</h4>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Chọn một người bạn đồng hành 2D để rèn luyện tiếng Anh mỗi ngày và nhận buff học tập.
            </p>
          </div>
          <Link
            href="/pet"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <span>Nhận thú cưng ngay</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        /* Real Pet Content */
        <div className="space-y-4">
          {/* Top Pet Hero Display */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="shrink-0">
              <CompanionPet2D
                speciesId={speciesId}
                state={visualState}
                level={pet.level}
                size="sm"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {speciesInfo.speciesName || pet.name}
                </h4>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {speciesInfo.title || "Bạn đồng hành học tập"}
              </p>

              {/* Status Indicator */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${
                    feedEligibility.allowed
                      ? "bg-emerald-500"
                      : "bg-slate-400"
                  }`}
                  aria-hidden="true"
                />
                <span className="text-[11px] font-semibold text-slate-700">
                  {feedEligibility.allowed
                    ? "Có thể cho ăn"
                    : !feedEligibility.allowed && (pet.satietyState === "FULL" || satiety >= 80)
                      ? "Đang no"
                      : "Chưa thể cho ăn"}
                </span>
              </div>
            </div>
          </div>

          {/* Health & Happiness & Satiety Progress Meters */}
          <div className="space-y-2.5 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60">
            {/* Health Meter */}
            <div>
              <div className="flex justify-between text-[11px] font-medium mb-1">
                <span className="flex items-center gap-1 text-slate-600">
                  <Heart size={12} className="text-rose-500 fill-rose-500" aria-hidden="true" /> Sức khỏe
                </span>
                <span className="text-rose-700 font-bold">{pet.health}%</span>
              </div>
              <div
                className="h-2 rounded-full bg-slate-200/80 overflow-hidden"
                role="progressbar"
                aria-valuenow={pet.health}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Sức khỏe thú cưng"
              >
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-300 motion-reduce:transition-none"
                  style={{ width: `${Math.min(100, Math.max(0, pet.health))}%` }}
                />
              </div>
            </div>

            {/* Happiness Meter */}
            <div>
              <div className="flex justify-between text-[11px] font-medium mb-1">
                <span className="flex items-center gap-1 text-slate-600">
                  <Smile size={12} className="text-amber-600" aria-hidden="true" /> Vui vẻ
                </span>
                <span className="text-amber-700 font-bold">{pet.happiness}%</span>
              </div>
              <div
                className="h-2 rounded-full bg-slate-200/80 overflow-hidden"
                role="progressbar"
                aria-valuenow={pet.happiness}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Độ vui vẻ thú cưng"
              >
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300 motion-reduce:transition-none"
                  style={{ width: `${Math.min(100, Math.max(0, pet.happiness))}%` }}
                />
              </div>
            </div>

            {/* Satiety Meter */}
            <div>
              <div className="flex justify-between text-[11px] font-medium mb-1">
                <span className="flex items-center gap-1 text-slate-600">
                  <Utensils size={12} className="text-orange-500" aria-hidden="true" /> Độ no
                </span>
                <span className="text-orange-700 font-bold">{satiety}%</span>
              </div>
              <div
                className="h-2 rounded-full bg-slate-200/80 overflow-hidden"
                role="progressbar"
                aria-valuenow={satiety}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Độ no thú cưng"
              >
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-300 motion-reduce:transition-none"
                  style={{ width: `${satiety}%` }}
                />
              </div>
            </div>
          </div>

          {/* Passive Buff Note */}
          {speciesInfo.buff && (
            <div className="px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900">
              <span className="font-bold">Đặc điểm:</span> {speciesInfo.buff}
            </div>
          )}

          {/* Feed Action Panel */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleFeedClick}
              disabled={feedMutation.isPending || !feedEligibility.allowed}
              aria-label={`Cho thú cưng ăn, tiêu tốn ${feedCost} Bánh Mì`}
              className={`w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                feedEligibility.allowed
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs active:scale-[0.98]"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {feedMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Đang cho ăn...</span>
                </>
              ) : (
                <>
                  <Utensils size={15} aria-hidden="true" />
                  <span>Cho ăn ({feedCost} Bánh Mì)</span>
                </>
              )}
            </button>

            {/* Satiety or Requirement Message */}
            {!feedEligibility.allowed && (pet.satietyState === "FULL" || satiety >= 80) ? (
              <p className="text-center text-[11px] font-medium text-slate-500">{satietyText}</p>
            ) : userBalance < feedCost ? (
              <p className="text-center text-[11px] font-semibold text-rose-600">
                Cần {feedCost} Bánh Mì (Hiện có: {userBalance})
              </p>
            ) : (
              <p className="text-center text-[10px] text-slate-500">
                Tiêu hao {feedCost} Bánh Mì • {satietyText} • EXP hôm nay {pet.dailyRewardedFeedCount ?? 0}/{pet.dailyRewardLimit ?? 3}
              </p>
            )}

            {/* Link to Full Pet Room */}
            <Link
              href="/pet"
              className="w-full inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <span>Xem chi tiết thú cưng</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
};
