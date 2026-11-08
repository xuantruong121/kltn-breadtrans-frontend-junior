import { create } from "zustand";

/**
 * Screens that stay on one route but need the learner's full attention, such
 * as a Vocabulary Arena match, hide the floating companion pet while they are
 * open. Route-based hiding lives in lib/pet/companionPetVisibility.ts.
 */
interface CompanionPetState {
  suppressed: boolean;
  setSuppressed: (suppressed: boolean) => void;
}

export const useCompanionPetStore = create<CompanionPetState>((set) => ({
  suppressed: false,
  setSuppressed: (suppressed) => set({ suppressed }),
}));
