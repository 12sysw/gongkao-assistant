import { selectDueFlashcards } from '../../shared/review-schedule';

export interface ReviewRecommendationWrongRecord {
  type?: string | null;
}

export interface ReviewRecommendationFlashcard {
  category?: string | null;
  mastered?: number | null;
  next_review?: string | null;
}

export interface ReviewRecommendationItem {
  title: string;
  body: string;
  href: string;
}

function getTopLabel(values: string[], fallback: string) {
  if (values.length === 0) return fallback;

  const counter = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counter).sort((a, b) => b[1] - a[1])[0][0];
}

export function buildReviewRecommendations(params: {
  dueReviews: ReviewRecommendationWrongRecord[];
  flashcards: ReviewRecommendationFlashcard[];
  todayKey: string;
}) {
  const { dueReviews, flashcards, todayKey } = params;
  const items: ReviewRecommendationItem[] = [];
  const dueFlashcards = selectDueFlashcards(flashcards, todayKey);

  if (dueReviews.length > 0) {
    const topType = getTopLabel(
      dueReviews.map((record) => String(record.type ?? '未分类')),
      '未分类'
    );
    items.push({
      title: '优先补错题高发题型',
      body: `${topType} 是今天到期最多的错题来源，建议先回到错题本清掉这一类。`,
      href: '/wrong-book',
    });
  }

  if (dueFlashcards.length > 0) {
    const topCategory = getTopLabel(
      dueFlashcards.map((card) => String(card.category ?? '未分类')),
      '未分类'
    );
    items.push({
      title: '卡片分类有堆积',
      body: `${topCategory} 这类卡片到期最多，适合先在今日复习里连刷一轮。`,
      href: '/review',
    });
  }

  if (dueReviews.length + dueFlashcards.length >= 20) {
    items.push({
      title: '先清库存，再做新题',
      body: '今天的到期任务较多，先完成一轮串行复习，再进入题库或模考，避免复习债继续累积。',
      href: '/review',
    });
  }

  if (items.length === 0) {
    items.push({
      title: '今天没有复习堆积',
      body: '可以进入真题题库练习，或做一套模考保持输出手感。',
      href: '/question-bank',
    });
  }

  return items.slice(0, 3);
}
