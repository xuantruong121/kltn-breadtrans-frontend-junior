/**
 * Deterministic domain logic for the BreadTrans 2D companion pet system.
 * Authoritative feeding checks, satiety formatting, and visual state mapping.
 */

export type PetSatietyState = "FULL" | "NORMAL" | "HUNGRY" | "VERY_HUNGRY";

export function getPetSatietyState(satiety: number): PetSatietyState {
  const safeSatiety = Math.min(100, Math.max(0, satiety));
  if (safeSatiety >= 80) return "FULL";
  if (safeSatiety >= 50) return "NORMAL";
  if (safeSatiety >= 20) return "HUNGRY";
  return "VERY_HUNGRY";
}

export interface PetStatusCopyOptions {
  petName?: string;
  satietyState?: PetSatietyState;
  satiety?: number;
  health?: number;
  happiness?: number;
}

/**
 * State-aware Vietnamese copy for pet companions.
 * Clearly differentiates hunger (satiety) from emotional/physical condition (health & happiness).
 */
export function getPetStatusCopy(options: PetStatusCopyOptions): string {
  const name = options.petName?.trim() || "Bready";
  const satietyState =
    options.satietyState ??
    (options.satiety !== undefined ? getPetSatietyState(options.satiety) : "NORMAL");
  const health = options.health ?? 100;
  const happiness = options.happiness ?? 100;

  if (satietyState === "FULL") {
    if (health < 70 || happiness < 70) {
      return `${name} đã no nhưng vẫn hơi mệt và buồn.`;
    }
    return `${name} đã no, chưa cần ăn thêm.`;
  }
  if (satietyState === "NORMAL") {
    return `${name} đã ăn vừa đủ.`;
  }
  if (satietyState === "VERY_HUNGRY") {
    return `${name} đang rất đói.`;
  }
  return `${name} đang đói và có thể ăn.`;
}

export type PetVisualState = "idle" | "learning" | "hungry" | "fed" | "cooldown" | "levelup";

export interface PetVisualStateOptions {
  health?: number;
  happiness?: number;
  satiety?: number;
  canFeed?: boolean;
  satietyState?: PetSatietyState;
  isLearningRoute?: boolean;
  isJustFed?: boolean;
  isLevelUp?: boolean;
}

/**
 * Determines the deterministic visual pose of the 2D pet companion.
 * Precedence: levelup > fed > learning > hungry/satiety > idle.
 */
export function getPetVisualState(options: PetVisualStateOptions): PetVisualState {
  if (options.isLevelUp) {
    return "levelup";
  }
  if (options.isJustFed) {
    return "fed";
  }
  if (options.isLearningRoute) {
    return "learning";
  }
  const health = options.health ?? 100;
  const happiness = options.happiness ?? 100;
  const satietyState =
    options.satietyState ??
    (options.satiety !== undefined ? getPetSatietyState(options.satiety) : undefined);

  if (
    health < 40 ||
    happiness < 40 ||
    satietyState === "HUNGRY" ||
    satietyState === "VERY_HUNGRY"
  ) {
    return "hungry";
  }
  if (satietyState === "FULL" || options.canFeed === false) {
    return "fed";
  }
  return "idle";
}

export interface PetFeedEligibilityInput {
  canFeed?: boolean;
  feedCost?: number;
  satiety?: number;
  satietyState?: PetSatietyState;
}

export interface PetFeedEligibilityResult {
  allowed: boolean;
  reason?: string;
  feedCost: number;
}

/**
 * Authoritative evaluation of feeding eligibility based on server values and balance.
 */
export function canFeedPet(
  pet: PetFeedEligibilityInput | null | undefined,
  userBalance: number,
): PetFeedEligibilityResult {
  const feedCost = pet?.feedCost ?? 10;

  if (!pet) {
    return {
      allowed: false,
      reason: "Chưa có thông tin thú cưng",
      feedCost,
    };
  }

  const isFull =
    pet.canFeed === false ||
    pet.satietyState === "FULL" ||
    (pet.satiety !== undefined && pet.satiety >= 80);

  if (isFull) {
    return {
      allowed: false,
      reason: "Thú cưng đang no, chưa cần ăn thêm",
      feedCost,
    };
  }

  if (userBalance < feedCost) {
    return {
      allowed: false,
      reason: `Bạn cần ít nhất ${feedCost} Bánh Mì để cho thú cưng ăn`,
      feedCost,
    };
  }

  return {
    allowed: true,
    feedCost,
  };
}

/**
 * Authoritative list of React Query cache keys invalidated upon feeding.
 */
export function getFeedingInvalidationKeys(userId?: number | string | null): (string | (string | number)[])[] {
  const keys: (string | (string | number)[])[] = [
    ["my-pet", userId ?? ""],
    ["user-stats", userId ?? ""],
    ["profile", userId ?? ""],
    ["dashboard-today", userId ?? ""],
    "market-balance",
  ];
  return keys;
}

/**
 * Handles feed failure safely without mutating or deducting user balance locally.
 */
export function handleFeedFailure(
  error: any,
  currentBalance: number,
): { balance: number; errorMessage: string } {
  const backendMessage =
    error?.response?.data?.message ||
    error?.message ||
    "Không thể cho thú cưng ăn lúc này. Vui lòng kiểm tra lại kết nối.";

  return {
    balance: currentBalance, // Zero local deduction on failure
    errorMessage: backendMessage,
  };
}

/**
 * Practice focus mode rule: Suppress companion widgets during active exercises.
 */
export function shouldRenderCompanion(isFocusMode: boolean): boolean {
  return !isFocusMode;
}

/**
 * Suppress FloatingAiTutor during active exercises to prevent UI obstruction.
 */
export function shouldRenderFloatingAiTutor(isFocusMode: boolean): boolean {
  return !isFocusMode;
}

export interface PetRecommendation {
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
}

/** Selects the first actionable incomplete quest without inventing learner analytics. */
export function getPetRecommendation(
  quests: Array<{
    title?: string;
    description?: string | null;
    isCompleted: boolean;
    actionLabel?: string;
    actionUrl?: string;
  }>,
): PetRecommendation | null {
  const quest = quests.find((item) => !item.isCompleted && item.actionUrl);
  if (!quest?.actionUrl) return null;

  return {
    title: quest.title || "Nhiệm vụ tiếp theo",
    description: quest.description || "Hoàn thành một hoạt động học tập hôm nay.",
    actionLabel: quest.actionLabel || "Bắt đầu học",
    actionUrl: quest.actionUrl,
  };
}

export type FloatingPetUIState = "COLLAPSED" | "MESSAGE" | "EXPANDED" | "HIDDEN";

export interface ResolveFloatingPetUIStateOptions {
  isFocusMode: boolean;
  isExpanded: boolean;
  hasMessage: boolean;
}

/**
 * Resolves the 4 floating companion UI states strictly decoupled from emotional states.
 */
export function resolveFloatingPetUIState(options: ResolveFloatingPetUIStateOptions): FloatingPetUIState {
  if (options.isFocusMode) {
    return "HIDDEN";
  }
  if (options.isExpanded) {
    return "EXPANDED";
  }
  if (options.hasMessage) {
    return "MESSAGE";
  }
  return "COLLAPSED";
}

/** Student layout: the companion is the single right-side floating entry point. */
export function getFloatingPetBoundingBox(
  viewport: "desktop" | "tablet" | "mobile",
  screenWidth = 1440,
): { x1: number; x2: number; y1: number; y2: number } {
  const width = 48;
  const height = 48;
  const right = viewport === "mobile" ? 14 : viewport === "tablet" ? 24 : 32;
  const bottom = viewport === "mobile" ? 72 : 32;
  return {
    x1: screenWidth - right - width,
    x2: screenWidth - right,
    y1: bottom,
    y2: bottom + height,
  };
}
