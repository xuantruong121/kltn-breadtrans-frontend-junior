"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gamificationService, Pet } from "@/lib/api/services/gamification.service";
import { CompanionPetStage2D } from "@/modules/pet/components/CompanionPetStage2D";
import { PetSelectorModal } from "@/modules/pet/components/PetSelectorModal";
import { PET_SPECIES_LIST, getSpeciesIdFromPetName, PetSpecies } from "@/modules/pet/types";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, Award, Heart, Zap, AlertCircle, Loader2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { canFeedPet, handleFeedFailure } from "@/modules/pet/petLogic";

export default function PetPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJustFed, setIsJustFed] = useState(false);
  const [isLevelUp, setIsLevelUp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 1. Authoritative Pet data from backend
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

  // 2. Authoritative Bánh Mì balance
  const { data: balanceData } = useQuery<{ totalBanh: number }>({
    queryKey: ["market-balance"],
    queryFn: async (): Promise<{ totalBanh: number }> => {
      const res = (await axiosClient.get("/market/currency/balance")) as any;
      return res ?? { totalBanh: 0 };
    },
    enabled: !!user?.id,
  });

  const banhRanBalance = balanceData?.totalBanh ?? 0;
  const feedCost = pet?.feedCost ?? 10;

  // Mutation cho pet ăn
  const feedMutation = useMutation({
    mutationFn: gamificationService.feedPet,
    onSuccess: (updatedPet) => {
      // Invalidate authoritative cache keys
      queryClient.invalidateQueries({ queryKey: ["my-pet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-today", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["market-balance"] });

      const prevLevel = pet?.level ?? 1;
      const leveledUp = updatedPet.level > prevLevel;

      if (leveledUp) {
        setIsLevelUp(true);
        const msg = `Chúc mừng! Thú cưng đã thăng cấp lên Cấp ${updatedPet.level}!`;
        setStatusMessage(msg);
        toast.success(msg, { duration: 5000 });
        setTimeout(() => setIsLevelUp(false), 5000);
      } else {
        setIsJustFed(true);
        const expReward = updatedPet.feedExpReward ?? 0;
        const msg =
          expReward > 0
            ? `Thú cưng đã được cho ăn! (+${expReward} EXP)`
            : `Thú cưng đã được cho ăn no nê!`;
        setStatusMessage(msg);
        toast.success(msg);
        setTimeout(() => setIsJustFed(false), 4000);
      }
    },
    onError: (err: any) => {
      const failure = handleFeedFailure(err, banhRanBalance);
      setStatusMessage(failure.errorMessage);
      toast.error(failure.errorMessage);
    },
  });

  // Mutation đổi loài thú cưng
  const changeSpeciesMutation = useMutation({
    mutationFn: (petName: string) => gamificationService.changePetType(petName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pet", user?.id] });
      setIsModalOpen(false);
      toast.success("Đã đổi sang thú cưng đồng hành mới!");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Không thể đổi thú cưng lúc này!"
      );
    },
  });

  const currentSpeciesId = getSpeciesIdFromPetName(pet?.name || "bready");
  const currentSpecies =
    PET_SPECIES_LIST.find((s) => s.id === currentSpeciesId) ||
    PET_SPECIES_LIST[0];

  const handleFeed = () => {
    const eligibility = canFeedPet(pet, banhRanBalance);
    if (!eligibility.allowed) {
      if (eligibility.reason) {
        toast.error(eligibility.reason);
      }
      return;
    }
    feedMutation.mutate();
  };

  const handleSelectSpecies = (species: PetSpecies) => {
    changeSpeciesMutation.mutate(species.id);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Screen reader live region */}
      <div className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Quay về trang tổng quan"
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Thú Cưng Đồng Hành
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Chăm sóc thú cưng mỗi ngày để kích hoạt các hiệu ứng bổ trợ học tập
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/market"
            className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3.5 py-2 rounded-xl text-amber-900 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <span className="font-semibold text-slate-700 dark:text-slate-300">Số dư:</span>
            <span>{banhRanBalance} Bánh Mì</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-label="Mở cửa sổ đổi thú cưng"
            className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Đổi Thú Cưng</span>
          </button>
        </div>
      </div>

      {/* Main Pet Stage / States */}
      {isPetLoading ? (
        /* Loading skeleton */
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-xs animate-pulse"
          role="status"
          aria-label="Đang tải dữ liệu thú cưng"
        >
          <Loader2 size={32} className="animate-spin mx-auto text-amber-600 mb-3" aria-hidden="true" />
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
            Đang tải thông tin thú cưng đồng hành...
          </p>
        </div>
      ) : isPetError ? (
        /* Error state */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-12 text-center shadow-xs space-y-3">
          <AlertCircle size={36} className="mx-auto text-rose-500" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Không thể tải thông tin thú cưng
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Đã có lỗi xảy ra khi kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền và thử lại.
          </p>
          <button
            type="button"
            onClick={() => refetchPet()}
            className="inline-flex min-h-[44px] items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Thử lại</span>
          </button>
        </div>
      ) : !pet ? (
        /* Empty state */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs space-y-4">
          <div className="size-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
            <Heart size={28} aria-hidden="true" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Bạn chưa có thú cưng đồng hành
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Hãy chọn một người bạn 2D đồng hành để hỗ trợ quá trình học tập, tăng điểm kinh nghiệm và nhận các hiệu ứng bổ trợ thú vị.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <span>Chọn thú cưng ngay</span>
          </button>
        </div>
      ) : (
        /* Real 2D Pet Stage & Details */
        <div className="space-y-6">
          <CompanionPetStage2D
            pet={pet}
            banhRan={banhRanBalance}
            onFeed={handleFeed}
            onChangeSpecies={() => setIsModalOpen(true)}
            isFeeding={feedMutation.isPending}
            isChangingSpecies={changeSpeciesMutation.isPending}
            isJustFed={isJustFed}
            isLevelUp={isLevelUp}
          />

          {/* Species Details & Active Buff */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Buff Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <Zap size={18} aria-hidden="true" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Đặc điểm thú cưng</h3>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 space-y-1">
                <span className="font-bold text-amber-900 dark:text-amber-200 text-sm block">
                  {currentSpecies.buff}
                </span>
                <p className="text-xs text-amber-900/90 dark:text-amber-100/90 leading-relaxed font-normal">
                  {currentSpecies.buffDetail}
                </p>
              </div>
            </div>

            {/* Lore & Quote Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Award size={18} aria-hidden="true" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Truyền Thuyết Loài</h3>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                {currentSpecies.lore}
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs italic leading-relaxed">
                &ldquo;{currentSpecies.quote}&rdquo;
              </div>
            </div>

            {/* Feeding Tips */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Heart size={18} aria-hidden="true" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Quy Tắc Nuôi Dưỡng</h3>
              </div>
              <ul className="text-xs text-slate-700 dark:text-slate-200 space-y-2.5 leading-relaxed font-normal">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold select-none" aria-hidden="true">•</span>
                  <span>
                    Chi phí thay đổi theo lượt ăn trong ngày ({feedCost} Bánh Mì). Ba lượt đầu có thể nhận EXP; các lượt sau áp dụng hiệu quả giảm dần.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold select-none" aria-hidden="true">•</span>
                  <span>
                    Pet chuyển từ đói sang no theo trạng thái thực tế; không có cooldown 24 giờ cố định.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold select-none" aria-hidden="true">•</span>
                  <span>
                    Hoàn thành bài tập và luyện nghe nói hàng ngày để tích lũy thêm nhiều Bánh Mì.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Selector Modal */}
      <PetSelectorModal
        isOpen={isModalOpen}
        currentPetName={pet?.name || "bready"}
        petLevel={pet?.level || 1}
        roster={pet?.roster as any}
        onClose={() => setIsModalOpen(false)}
        onSelectPet={handleSelectSpecies}
        isUpdating={changeSpeciesMutation.isPending}
      />
    </div>
  );
}
