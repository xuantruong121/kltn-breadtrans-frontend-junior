"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Zap, Award, Loader2 } from "lucide-react";
import { PET_SPECIES_LIST, PetSpecies, getSpeciesIdFromPetName } from "../types";
import { CompanionPet2D } from "./CompanionPet2D";

interface PetSelectorModalProps {
  isOpen: boolean;
  currentPetName: string;
  petLevel?: number;
  roster?: Record<string, { level: number; exp: number }> | null;
  onClose: () => void;
  onSelectPet: (species: PetSpecies) => void;
  isUpdating?: boolean;
}

export const PetSelectorModal: React.FC<PetSelectorModalProps> = ({
  isOpen,
  currentPetName,
  petLevel = 1,
  roster,
  onClose,
  onSelectPet,
  isUpdating = false,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Focus close button on open for keyboard accessibility
  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isUpdating) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isUpdating, onClose]);

  if (!isOpen) return null;

  const selectedSpeciesId = getSpeciesIdFromPetName(currentPetName);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-selector-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full p-5 sm:p-7 max-h-[min(90dvh,calc(100dvh-3rem))] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
            <div>
              <h2
                id="pet-selector-title"
                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
              >
                Chọn Thú Cưng Đồng Hành
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mỗi loài thú cưng sở hữu cấp độ độc lập và hiệu ứng bổ trợ học tập riêng biệt
              </p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              aria-label="Đóng cửa sổ chọn thú cưng"
              className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* 4 Species Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {PET_SPECIES_LIST.map((species) => {
              const isSelected = selectedSpeciesId === species.id;
              const speciesLevel = isSelected
                ? petLevel || 1
                : roster?.[species.id]?.level || 1;
              const speciesStageName =
                speciesLevel >= 10
                  ? species.stages.stage4.name
                  : speciesLevel >= 7
                  ? species.stages.stage3.name
                  : speciesLevel >= 4
                  ? species.stages.stage2.name
                  : species.stages.stage1.name;

              return (
                <div
                  key={species.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-amber-50/40 border-amber-400 ring-1 ring-amber-400/40 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs"
                  }`}
                >
                  <div>
                    {/* Species Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="size-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          <CompanionPet2D speciesId={species.id} size="sm" level={speciesLevel} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${species.elementColor}`}
                            >
                              {species.element}
                            </span>
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                              Cấp {speciesLevel}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight mt-1">
                            {species.speciesName}
                          </h3>
                          <span className="text-[11px] font-medium text-slate-500">
                            {speciesStageName}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span
                          className="bg-emerald-500 text-white p-1 rounded-full shadow-2xs shrink-0"
                          title="Đang đồng hành"
                        >
                          <CheckCircle2 size={16} aria-hidden="true" />
                        </span>
                      )}
                    </div>

                    {/* Lore description */}
                    <p className="text-xs text-slate-600 mb-2.5 leading-relaxed line-clamp-2">
                      {species.lore}
                    </p>

                    {/* Passive Buff Card */}
                    <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/70 mb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Zap size={13} className="text-amber-600 fill-amber-600 shrink-0" aria-hidden="true" />
                        <span>Nội tại: {species.buff}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        {species.buffDetail}
                      </p>
                    </div>

                    {/* Quote Bubble */}
                    <div className="text-[11px] text-slate-500 italic mb-4 line-clamp-1">
                      &ldquo;{species.quote}&rdquo;
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    disabled={isSelected || isUpdating}
                    onClick={() => onSelectPet(species)}
                    aria-label={isSelected ? `${species.name} đang đồng hành` : `Chọn ${species.name} làm bạn đồng hành`}
                    className={`w-full min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold cursor-default"
                        : "bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-xs"
                    }`}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        <span>Đang chuyển đổi...</span>
                      </>
                    ) : isSelected ? (
                      <>
                        <CheckCircle2 size={15} aria-hidden="true" />
                        <span>Đang đồng hành</span>
                      </>
                    ) : (
                      <>
                        <Award size={15} aria-hidden="true" />
                        <span>Chọn {species.name} đồng hành</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
            <p className="text-xs font-medium text-slate-600">
              Cấp độ và kinh nghiệm được lưu trữ độc lập cho từng loài thú cưng trên tài khoản của bạn.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
