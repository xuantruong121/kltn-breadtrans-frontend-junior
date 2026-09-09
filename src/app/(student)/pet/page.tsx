"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gamificationService, Pet } from "@/lib/api/services/gamification.service";
import { PetStage3D } from "@/modules/pet/components/PetStage3D";
import { PetSelectorModal } from "@/modules/pet/components/PetSelectorModal";
import { PET_SPECIES_LIST, getSpeciesIdFromPetName, PetSpecies } from "@/modules/pet/types";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Award, Heart, Zap } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";

export default function PetPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Lấy dữ liệu pet từ backend
  const { data: pet, isLoading: isPetLoading } = useQuery<Pet>({
    queryKey: ["my-pet"],
    queryFn: gamificationService.getMyPet,
  });

  // Lấy số dư Bánh Mì từ backend
  const { data: balance } = useQuery<{ totalBanh: number }>({
    queryKey: ["market-balance"],
    queryFn: () => axiosClient.get("/market/currency/balance"),
  });

  const banhRanBalance = balance?.totalBanh ?? 0;

  // Mutation cho pet ăn
  const feedMutation = useMutation({
    mutationFn: gamificationService.feedPet,
    onSuccess: (updatedPet) => {
      queryClient.invalidateQueries({ queryKey: ["my-pet"] });
      queryClient.invalidateQueries({ queryKey: ["market-balance"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      if (pet && updatedPet.level > pet.level) {
        toast.success(
          `🎉 Chúc mừng! Thú cưng của bạn đã thăng cấp lên Cấp ${updatedPet.level}!`,
          { duration: 6000 }
        );
      } else {
        toast.success("Thú cưng đã được cho ăn no nê! (+50 EXP, +20 Vui vẻ)");
      }
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Không thể cho thú cưng ăn lúc này!"
      );
    },
  });

  // Mutation đổi loài thú cưng
  const changeSpeciesMutation = useMutation({
    mutationFn: (petName: string) => gamificationService.changePetType(petName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pet"] });
      setIsModalOpen(false);
      toast.success(`Đã đổi sang thú cưng đồng hành mới!`);
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
    if (banhRanBalance < 10) {
      toast.error("Bạn cần ít nhất 10 Bánh Mì để cho thú cưng ăn!");
      return;
    }
    feedMutation.mutate();
  };

  const handleSelectSpecies = (species: PetSpecies) => {
    changeSpeciesMutation.mutate(species.id);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Thú Cưng Đồng Hành
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Chăm sóc thú cưng mỗi ngày để nhận các hiệu ứng bổ trợ học tập
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/market"
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-amber-900 font-bold text-xs hover:bg-amber-100 transition-colors"
          >
            <span>🍞</span>
            <span>{banhRanBalance} Bánh Mì</span>
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Đổi Thú Cưng</span>
          </button>
        </div>
      </div>

      {/* Main Pet Stage */}
      {isPetLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs">
          <div className="animate-spin text-3xl mb-3">🐾</div>
          <p className="text-slate-500 font-bold text-sm">
            Đang gọi thú cưng của bạn ra chào...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <PetStage3D
            pet={pet}
            banhRan={banhRanBalance}
            onFeed={handleFeed}
            onChangeSpecies={() => setIsModalOpen(true)}
            isFeeding={feedMutation.isPending}
            isChangingSpecies={changeSpeciesMutation.isPending}
          />

          {/* Species Details & Active Buff */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Buff Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-700">
                <Zap size={18} />
                <h3 className="font-bold text-sm">Nội Tại Bổ Trợ Hiện Tại</h3>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 space-y-1">
                <span className="font-black text-amber-900 text-sm block">
                  {currentSpecies.buff}
                </span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {currentSpecies.buffDetail}
                </p>
              </div>
            </div>

            {/* Lore & Quote Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Award size={18} />
                <h3 className="font-bold text-sm">Truyền Thuyết Loài</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentSpecies.lore}
              </p>
              <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-900 text-xs italic">
                "{currentSpecies.quote}"
              </div>
            </div>

            {/* Feeding Tips */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <Heart size={18} />
                <h3 className="font-bold text-sm">Mẹo Nuôi Dưỡng</h3>
              </div>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Mỗi lần cho ăn tiêu tốn <strong>10 Bánh Mì</strong> và tăng <strong>50 EXP</strong> cùng <strong>20 Vui vẻ</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Khi đạt <strong>Cấp 2</strong>, bạn sẽ tự động mở khóa huy hiệu <strong>Chuyên Gia Nuôi Thú</strong>!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Làm quiz và luyện phát âm hàng ngày để thu thập thêm nhiều Bánh Mì nhé!</span>
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
