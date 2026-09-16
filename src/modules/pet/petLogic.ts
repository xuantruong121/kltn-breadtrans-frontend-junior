/**
 * Deterministic domain logic for the BreadTrans 2D companion pet system.
 * Authoritative feeding checks, satiety formatting, and visual state mapping.
 */

export type PetVisualState = "idle" | "learning" | "hungry" | "fed" | "cooldown" | "levelup";

export interface PetVisualStateOptions {
  health?: number;
  happiness?: number;
  canFeed?: boolean;
  satietyState?: "FULL" | "NORMAL" | "HUNGRY" | "VERY_HUNGRY";
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
  if (health < 40 || happiness < 40 || options.satietyState === "HUNGRY" || options.satietyState === "VERY_HUNGRY") {
    return "hungry";
  }
  if (options.satietyState === "FULL" || options.canFeed === false) {
    return "fed";
  }
  return "idle";
}

/**
 * Legacy formatter retained for old callers; new UI renders satiety labels instead.
 */
export function formatPetCooldown(nextFeedAt?: string | null, now: Date = new Date()): string {
  if (!nextFeedAt) {
    return "Sẵn sàng cho ăn";
  }

  const targetDate = new Date(nextFeedAt);
  if (Number.isNaN(targetDate.getTime())) {
    return "Sẵn sàng cho ăn";
  }

  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return "Sẵn sàng cho ăn";
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `Có thể cho ăn sau ${hours} giờ ${minutes} phút`;
  }
  if (hours > 0) {
    return `Có thể cho ăn sau ${hours} giờ`;
  }
  if (minutes > 0) {
    return `Có thể cho ăn sau ${minutes} phút`;
  }
  return "Có thể cho ăn sau ít hơn 1 phút";
}

export interface PetFeedEligibilityInput {
  canFeed?: boolean;
  feedCost?: number;
  satietyState?: "FULL" | "NORMAL" | "HUNGRY" | "VERY_HUNGRY";
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

  if (pet.canFeed === false) {
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
