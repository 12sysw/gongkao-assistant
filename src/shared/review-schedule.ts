const WRONG_REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
const MAX_FLASHCARD_INTERVAL_DAYS = 30;
const FLASHCARD_MASTER_THRESHOLD = 5;

type FlashcardReviewTarget = {
  mastered?: number | boolean | null;
  next_review?: string | null;
  nextReview?: string | null;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function normalizeCount(value: number | null | undefined): number {
  const count = Number(value ?? 0);
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.floor(count);
}

export function formatLocalDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDaysAsLocalDate(days: number, from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function getNextWrongReview(currentReviewCount: number | null | undefined, from: Date = new Date()) {
  const reviewCount = normalizeCount(currentReviewCount) + 1;
  const intervalDays = WRONG_REVIEW_INTERVAL_DAYS[Math.min(reviewCount - 1, WRONG_REVIEW_INTERVAL_DAYS.length - 1)];

  return {
    review_count: reviewCount,
    interval_days: intervalDays,
    next_review_at: addDaysAsLocalDate(intervalDays, from),
  };
}

export function getNextFlashcardReview(
  currentReviewCount: number | null | undefined,
  correct: boolean,
  from: Date = new Date()
) {
  const reviewCount = normalizeCount(currentReviewCount) + 1;
  const intervalDays = correct ? Math.min(2 ** reviewCount, MAX_FLASHCARD_INTERVAL_DAYS) : 1;

  return {
    review_count: reviewCount,
    interval_days: intervalDays,
    mastered: correct && reviewCount >= FLASHCARD_MASTER_THRESHOLD ? 1 : 0,
    next_review: addDaysAsLocalDate(intervalDays, from),
  };
}

export function isFlashcardDue(card: FlashcardReviewTarget, todayKey: string = formatLocalDate()): boolean {
  if (Number(card.mastered ?? 0)) return false;

  const nextReview = String(card.next_review ?? card.nextReview ?? '').slice(0, 10);
  return nextReview <= todayKey;
}

export function selectDueFlashcards<T extends FlashcardReviewTarget>(
  cards: T[],
  todayKey: string = formatLocalDate()
): T[] {
  return cards.filter((card) => isFlashcardDue(card, todayKey));
}
