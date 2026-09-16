"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useLearningFocusMode } from "@/contexts/LearningFocusContext";
import {
  gamificationService,
  type DashboardTodayResponse,
  type Pet,
} from "@/lib/api/services/gamification.service";
import axiosClient from "@/lib/api/axiosClient";

type MarketBalanceResponse = { totalBanh: number };

export function useCompanionPetRuntime() {
  const { user } = useAuthStore();
  const { isFocusMode } = useLearningFocusMode();
  const enabled = Boolean(user?.id) && !isFocusMode;

  const petQuery = useQuery<Pet | null>({
    queryKey: ["my-pet", user?.id],
    queryFn: gamificationService.getMyPet,
    enabled,
    staleTime: 60_000,
  });

  const balanceQuery = useQuery<MarketBalanceResponse>({
    queryKey: ["market-balance"],
    queryFn: async (): Promise<MarketBalanceResponse> => {
      const res = (await axiosClient.get("/market/currency/balance")) as any;
      return res ?? { totalBanh: 0 };
    },
    enabled,
    staleTime: 60_000,
  });

  const todayQuery = useQuery<DashboardTodayResponse>({
    queryKey: ["dashboard-today", user?.id],
    queryFn: gamificationService.getDashboardToday,
    enabled,
    staleTime: 60_000,
  });

  return {
    isFocusMode,
    pet: petQuery.data ?? null,
    balance: balanceQuery.data?.totalBanh ?? 0,
    today: todayQuery.data ?? null,
    isLoading: enabled && (petQuery.isLoading || balanceQuery.isLoading || todayQuery.isLoading),
    isError: petQuery.isError || balanceQuery.isError || todayQuery.isError,
    refetch: async () => {
      await Promise.all([petQuery.refetch(), balanceQuery.refetch(), todayQuery.refetch()]);
    },
  };
}
