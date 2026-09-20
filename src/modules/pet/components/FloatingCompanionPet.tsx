"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Smile,
  Utensils,
  ArrowRight,
  X,
  Loader2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { useChatAssistantStore } from "@/stores/chatAssistantStore";
import { gamificationService } from "@/lib/api/services/gamification.service";
import { useCompanionPetRuntime } from "../useCompanionPetRuntime";
import {
  getPetVisualState,
  getPetStatusCopy,
  canFeedPet,
  handleFeedFailure,
  getPetRecommendation,
  resolveFloatingPetUIState,
  FloatingPetUIState,
} from "../petLogic";
import { getSpeciesIdFromPetName, PET_SPECIES_LIST } from "../types";
import { CompanionPet2D } from "./CompanionPet2D";

export const FloatingCompanionPet: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { isOpen: isTutorOpen, setIsOpen: setTutorOpen } = useChatAssistantStore();

  const { isFocusMode, pet, balance, today } = useCompanionPetRuntime();

  // Floating UI state machine
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasDismissedMessage, setHasDismissedMessage] = useState(true);
  const [isJustFed, setIsJustFed] = useState(false);
  const [isLevelUp, setIsLevelUp] = useState(false);
  const [ariaFeedback, setAriaFeedback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Derive daily quest recommendation
  const recommendation = useMemo(() => {
    return getPetRecommendation(today?.quests || []);
  }, [today?.quests]);

  const hasMessage = Boolean(recommendation) && !hasDismissedMessage && !isExpanded;

  // Resolve 4 discrete floating UI states
  const uiState: FloatingPetUIState = useMemo(() => {
    return resolveFloatingPetUIState({
      isFocusMode,
      isExpanded,
      hasMessage,
    });
  }, [isFocusMode, isExpanded, hasMessage]);

  // Derive pet species and emotional state
  const speciesId = useMemo(() => {
    return getSpeciesIdFromPetName(pet?.name);
  }, [pet?.name]);

  const speciesInfo = useMemo(() => {
    return PET_SPECIES_LIST.find((s) => s.id === speciesId) || PET_SPECIES_LIST[0];
  }, [speciesId]);

  const satiety = Math.min(100, Math.max(0, pet?.satiety ?? 80));
  const petDisplayName = pet?.name || speciesInfo.speciesName || "Bready";

  const visualEmotion = useMemo(() => {
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

  // Feed eligibility
  const feedEligibility = useMemo(() => {
    return canFeedPet(pet, balance);
  }, [pet, balance]);

  const feedCost = pet?.feedCost ?? 10;
  const satietyText = useMemo(() => {
    return getPetStatusCopy({
      petName: petDisplayName,
      satietyState: pet?.satietyState,
      satiety,
      health: pet?.health,
      happiness: pet?.happiness,
    });
  }, [petDisplayName, pet?.satietyState, satiety, pet?.health, pet?.happiness]);

  // Keyboard accessibility (Escape key closes popover or message)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isExpanded) {
          setIsExpanded(false);
        } else if (hasMessage) {
          setHasDismissedMessage(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, hasMessage]);

  // Outside click listener to close expanded popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isExpanded && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  // Authoritative Feed Mutation
  const feedMutation = useMutation({
    mutationFn: gamificationService.feedPet,
    onSuccess: (updatedPet) => {
      queryClient.invalidateQueries({ queryKey: ["my-pet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["market-balance"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-today", user?.id] });

      const prevLevel = pet?.level ?? 1;
      const leveledUp = updatedPet.level > prevLevel;

      if (leveledUp) {
        setIsLevelUp(true);
        const msg = `Thú cưng đã thăng cấp lên Cấp ${updatedPet.level}!`;
        setAriaFeedback(msg);
        toast.success(msg, { duration: 5000 });
        setTimeout(() => setIsLevelUp(false), 5000);
      } else {
        setIsJustFed(true);
        const msg = "Đã cho thú cưng ăn no nê!";
        setAriaFeedback(msg);
        toast.success(msg);
        setTimeout(() => setIsJustFed(false), 4000);
      }
    },
    onError: (err: any) => {
      const failure = handleFeedFailure(err, balance);
      setAriaFeedback(failure.errorMessage);
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

  // If focus mode or unauthenticated, HIDDEN state renders nothing
  if (uiState === "HIDDEN" || !user) {
    return null;
  }

  // The student pet is the single floating entry point. The tutor panel owns
  // the open state, so avoid rendering two floating controls at once.
  if (isTutorOpen) {
    return null;
  }

  const petName = speciesInfo.speciesName || pet?.name || "Bready";
  const level = pet?.level ?? 1;
  const health = Math.min(100, Math.max(0, pet?.health ?? 100));
  const happiness = Math.min(100, Math.max(0, pet?.happiness ?? 100));
  const exp = pet?.exp ?? 0;
  const expPerLevel = 1000;
  const expPercentage = Math.min(
    100,
    Math.max(0, Math.round(((exp % expPerLevel) / expPerLevel) * 100)),
  );

  return (
    <div
      ref={containerRef}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3.5 md:bottom-6 md:right-6 lg:bottom-8 lg:right-8 z-[45]"
    >
      {/* Live Region for Screen Readers */}
      <div className="sr-only" role="status" aria-live="polite">
        {ariaFeedback}
      </div>

      {/* 1. MESSAGE STATE: Proactive Contextual Speech Bubble (Desktop/Tablet safe; hidden on mobile to prevent filter collisions, indicator dot shown on avatar) */}
      {uiState === "MESSAGE" && recommendation && (
        <div
          role="dialog"
          aria-label="Gợi ý học tập từ thú cưng"
          className="hidden sm:block absolute bottom-full right-0 mb-3 w-72 sm:w-80 rounded-2xl bg-white border border-amber-200/90 shadow-lg p-3.5 text-xs text-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <span>{petName}</span>
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                Gợi ý
              </span>
            </span>
            <button
              type="button"
              onClick={() => setHasDismissedMessage(true)}
              aria-label="Đóng lời nhắn"
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <p className="text-slate-600 leading-relaxed font-medium mb-2.5">
            {recommendation.title}: {recommendation.description}
          </p>

          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Mở chi tiết
            </button>
            <Link
              href={recommendation.actionUrl}
              onClick={() => setHasDismissedMessage(true)}
              className="inline-flex min-h-[32px] items-center gap-1 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <span>{recommendation.actionLabel}</span>
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>

          {/* Speech bubble pointer notch */}
          <div
            className="absolute -bottom-2 right-6 w-3.5 h-3.5 bg-white border-b border-r border-amber-200/90 rotate-45"
            aria-hidden="true"
          />
        </div>
      )}

      {/* 2. EXPANDED STATE: Full Popover Card (Desktop popover, Mobile-safe bottom sheet) */}
      {uiState === "EXPANDED" && (
        <>
          {/* Mobile backdrop scrim */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 sm:hidden animate-in fade-in"
            onClick={() => setIsExpanded(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="floating-pet-dialog-title"
            className="fixed inset-x-0 bottom-0 rounded-t-3xl bg-white border-t border-slate-200 shadow-2xl p-5 max-h-[85dvh] pb-[calc(1.5rem+env(safe-area-inset-bottom))] overflow-y-auto z-50 animate-in slide-in-from-bottom duration-300 sm:inset-auto sm:absolute sm:bottom-full sm:right-0 sm:mb-3 sm:w-88 sm:rounded-2xl sm:border sm:p-5 sm:max-h-[calc(100dvh-6rem)] sm:pb-5 sm:animate-in sm:fade-in sm:zoom-in-95 sm:duration-200"
          >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-3.5">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                <CompanionPet2D speciesId={speciesId} state={visualEmotion} level={level} size="sm" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 id="floating-pet-dialog-title" className="text-sm font-bold text-slate-900">
                    {petName}
                  </h3>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                    Cấp {level}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                  {speciesInfo.title}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              aria-label="Đóng bảng thông tin thú cưng"
              className="size-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Level Progress & Stats Meters */}
          <div className="space-y-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 mb-3.5">
            {/* Level EXP */}
            <div>
              <div className="flex justify-between text-[11px] font-medium mb-1">
                <span className="flex items-center gap-1 text-slate-600">
                  <TrendingUp size={12} className="text-amber-600" aria-hidden="true" /> Tiến trình cấp
                </span>
                <span className="text-amber-900 font-bold">{expPercentage}% ({exp} EXP)</span>
              </div>
              <div
                className="h-2 rounded-full bg-slate-200/80 overflow-hidden"
                role="progressbar"
                aria-valuenow={expPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Kinh nghiệm thú cưng"
              >
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300 motion-reduce:transition-none"
                  style={{ width: `${expPercentage}%` }}
                />
              </div>
            </div>

            {/* Health */}
            <div>
              <div className="flex justify-between text-[11px] font-medium mb-1">
                <span className="flex items-center gap-1 text-slate-600">
                  <Heart size={12} className="text-rose-500 fill-rose-500" aria-hidden="true" /> Sức khỏe
                </span>
                <span className="text-rose-700 font-bold">{health}%</span>
              </div>
              <div
                className="h-2 rounded-full bg-slate-200/80 overflow-hidden"
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
            </div>

            {/* Happiness */}
            <div>
              <div className="flex justify-between text-[11px] font-medium mb-1">
                <span className="flex items-center gap-1 text-slate-600">
                  <Smile size={12} className="text-amber-600" aria-hidden="true" /> Vui vẻ
                </span>
                <span className="text-amber-700 font-bold">{happiness}%</span>
              </div>
              <div
                className="h-2 rounded-full bg-slate-200/80 overflow-hidden"
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
            </div>

            {/* Satiety */}
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

          {/* Current Bánh Mì Balance */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs font-bold text-amber-900 mb-3.5">
            <span className="font-semibold text-slate-700">Số dư Bánh Mì:</span>
            <span>{balance} Bánh Mì</span>
          </div>

          {/* Daily Quest Recommendation Card */}
          {recommendation && (
            <div className="p-3 rounded-xl bg-white border border-slate-200 mb-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                Nhiệm vụ hôm nay
              </span>
              <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                {recommendation.title}: {recommendation.description}
              </p>
              <Link
                href={recommendation.actionUrl}
                onClick={() => setIsExpanded(false)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
              >
                <span>{recommendation.actionLabel}</span>
                <ChevronRight size={13} aria-hidden="true" />
              </Link>
            </div>
          )}

          {/* Shared learning entry point: the pet opens the existing tutor panel. */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              setTutorOpen(true);
            }}
            className="mb-3.5 flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2.5 text-left text-xs font-semibold text-blue-900 transition-colors hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <span className="flex items-center gap-2">
              <MessageCircle size={15} aria-hidden="true" />
              <span>Hỏi trợ lý học tập</span>
            </span>
            <ChevronRight size={14} aria-hidden="true" />
          </button>

          {/* Feed Button & Satiety */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handleFeedClick}
              disabled={feedMutation.isPending || !feedEligibility.allowed}
              aria-label={`Cho thú cưng ăn, tiêu hao ${feedCost} Bánh Mì`}
              className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                feedEligibility.allowed
                  ? "bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-xs"
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

            {!feedEligibility.allowed && (pet?.satietyState === "FULL" || satiety >= 80) ? (
              <p className="text-center text-[11px] font-medium text-slate-500">{satietyText}</p>
            ) : balance < feedCost ? (
              <p className="text-center text-[11px] font-semibold text-rose-600">
                Cần {feedCost} Bánh Mì (Số dư: {balance})
              </p>
            ) : (
              <p className="text-center text-[10px] text-slate-500">
                Tiêu hao {feedCost} Bánh Mì • {satietyText} • EXP hôm nay {pet?.dailyRewardedFeedCount ?? 0}/{pet?.dailyRewardLimit ?? 3}
              </p>
            )}

            {/* Link to /pet */}
            <Link
              href="/pet"
              onClick={() => setIsExpanded(false)}
              className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <span>Vào trang quản lý thú cưng</span>
              <ExternalLink size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </>
      )}

      {/* 3. COLLAPSED STATE: 48px Semantic Avatar Button */}
      <button
        type="button"
        onClick={() => {
          setIsExpanded(!isExpanded);
          setHasDismissedMessage(true);
        }}
        aria-expanded={isExpanded}
        aria-label={`Thú cưng đồng hành ${petName}, cấp ${level}. Nhấn để mở thông tin nhanh.`}
        className="relative size-12 sm:size-14 rounded-full bg-white border-2 border-amber-300 shadow-md hover:shadow-lg hover:border-amber-400 active:scale-95 flex items-center justify-center transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none group"
      >
        <CompanionPet2D speciesId={speciesId} state={visualEmotion} level={level} size="sm" />

        {/* Small badge when a learning quest is pending */}
        {recommendation && !hasDismissedMessage && (
          <span
            className="absolute -top-1 -right-1 size-4 bg-amber-500 border-2 border-white rounded-full flex items-center justify-center animate-pulse"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
};

export default FloatingCompanionPet;
