"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Sparkles, Zap, Shield, Heart, Award, ArrowRight } from "lucide-react";
import { PET_SPECIES_LIST, PetSpecies, getSpeciesIdFromPetName } from "../types";
import { Button3D } from "@/components/ui";

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
  if (!isOpen) return null;

  const selectedSpeciesId = getSpeciesIdFromPetName(currentPetName);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_20px_40px_rgba(0,0,0,0.2)] max-w-4xl w-full p-5 sm:p-7 max-h-[88vh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-amber-400"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐾</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                  Viện Thú Cưng Đồng Hành
                </h2>
              </div>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                Mỗi loài thú cưng sở hữu cấp độ độc lập và nội tại bổ trợ riêng biệt
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
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
                <motion.div
                  key={species.id}
                  whileHover={{ y: -3 }}
                  className={`p-4 sm:p-5 rounded-3xl border-3 transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-amber-50/80 border-amber-400 shadow-[0_5px_0_0_#f59e0b]"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-[0_3px_0_0_#e2e8f0]"
                  }`}
                >
                  <div>
                    {/* Species Header */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-200 shadow-2xs flex items-center justify-center text-2xl shrink-0">
                          {species.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${species.elementColor}`}
                            >
                              {species.element}
                            </span>
                            <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                              Cấp {speciesLevel}
                            </span>
                          </div>
                          <h3 className="font-black text-slate-800 text-base leading-tight mt-0.5">
                            {species.speciesName}
                          </h3>
                          <span className="text-[11px] font-bold text-slate-400">
                            {speciesStageName}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="bg-emerald-500 text-white p-1 rounded-full shadow-2xs shrink-0" title="Đang đồng hành">
                          <CheckCircle2 size={16} />
                        </span>
                      )}
                    </div>

                    {/* Lore description */}
                    <p className="text-[11px] font-medium text-slate-500 mb-2 leading-relaxed line-clamp-2">
                      {species.lore}
                    </p>

                    {/* Passive Buff Card */}
                    <div className="bg-amber-50/60 p-2.5 rounded-2xl border border-amber-200/80 shadow-2xs mb-2">
                      <div className="flex items-center gap-1 text-[11px] font-black text-amber-800">
                        <Zap size={13} className="text-amber-500 fill-amber-500 shrink-0" />
                        <span>Nội tại: {species.buff}</span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 mt-0.5 leading-snug">
                        {species.buffDetail}
                      </p>
                    </div>

                    {/* Quote Bubble */}
                    <div className="text-[11px] font-bold text-slate-600 italic mb-3 line-clamp-1">
                      "{species.quote}"
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button3D
                    variant={isSelected ? "green" : "blue"}
                    size="sm"
                    disabled={isSelected || isUpdating}
                    onClick={() => onSelectPet(species)}
                    className="w-full font-black text-xs py-2 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 size={15} /> Đang Đồng Hành
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} /> Chọn {species.name} Đồng Hành
                      </>
                    )}
                  </Button3D>
                </motion.div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="bg-sky-50 border border-sky-200 p-3 rounded-2xl text-center">
            <p className="text-xs font-bold text-sky-800">
              💡 Cấp độ (Level) và Điểm Kinh Nghiệm (XP) của từng thú cưng được lưu trữ độc lập cho mỗi loài!
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
