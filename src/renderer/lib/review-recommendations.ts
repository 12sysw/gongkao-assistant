export interface ReviewRecommendationWrongRecord {
  type?: string | null;
}

export interface ReviewRecommendationFlashcard {
  category?: string | null;
  mastered?: number | null;
  next_review?: string | null;
}

export interface ReviewRecommendationPlan {
  title?: string | null;
  subject?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;
  status?: 'pending' | 'in_progress' | 'completed' | null;
  daily_minutes?: number | null;
}

export interface ReviewRecommendationItem {
  title: string;
  body: string;
  href: string;
}

type PlanScore = {
  plan: ReviewRecommendationPlan;
  score: number;
  reason: string;
};

function getTopLabel(values: string[], fallback: string) {
  if (values.length === 0) return fallback;

  const counter = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counter).sort((a, b) => b[1] - a[1])[0][0];
}

function isDueFlashcard(nextReview: string | null | undefined, todayKey: string) {
  return String(nextReview ?? '').slice(0, 10) <= todayKey;
}

function normalizeLabel(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function extractSubjectSignalsFromWrongType(type: string | null | undefined) {
  const label = normalizeLabel(type);
  if (!label) return ['综合'];
  if (label.startsWith('行测-')) return [label, '行测'];
  return [label, '综合'];
}

function extractSubjectSignalsFromFlashcardCategory(category: string | null | undefined) {
  const label = normalizeLabel(category);
  if (!label) return ['综合'];
  if (label.startsWith('常识-')) return ['行测-常识判断', '行测', '综合'];
  if (label.startsWith('申论-')) return ['申论', '综合'];
  if (label.startsWith('行测-')) return [label, '行测'];
  return [label, '综合'];
}

function scorePlans(params: {
  activePlans: ReviewRecommendationPlan[];
  dueReviews: ReviewRecommendationWrongRecord[];
  dueFlashcards: ReviewRecommendationFlashcard[];
}) {
  const { activePlans, dueReviews, dueFlashcards } = params;

  const subjectWeight = new Map<string, number>();
  const addWeight = (subject: string, weight: number) => {
    subjectWeight.set(subject, (subjectWeight.get(subject) ?? 0) + weight);
  };

  dueReviews.forEach((record) => {
    extractSubjectSignalsFromWrongType(record.type).forEach((subject, index) => {
      addWeight(subject, index === 0 ? 3 : 1);
    });
  });

  dueFlashcards.forEach((card) => {
    extractSubjectSignalsFromFlashcardCategory(card.category).forEach((subject, index) => {
      addWeight(subject, index === 0 ? 2 : 1);
    });
  });

  const scoredPlans: PlanScore[] = activePlans.map((plan) => {
    const subject = normalizeLabel(plan.subject);
    const priority = plan.priority ?? 'medium';
    let score = subjectWeight.get(subject) ?? 0;

    if (priority === 'high') score += 4;
    else if (priority === 'medium') score += 2;
    else score += 1;

    const reasonParts: string[] = [];
    if ((subjectWeight.get(subject) ?? 0) > 0) {
      reasonParts.push(`今天的到期任务明显集中在 ${subject}`);
    }
    if (priority === 'high') {
      reasonParts.push('而且它本身就是高优先级');
    }

    return {
      plan,
      score,
      reason: reasonParts.join('，'),
    };
  });

  return scoredPlans.sort((a, b) => b.score - a.score);
}

export function buildReviewRecommendations(params: {
  dueReviews: ReviewRecommendationWrongRecord[];
  flashcards: ReviewRecommendationFlashcard[];
  studyPlans: ReviewRecommendationPlan[];
  todayKey: string;
}) {
  const { dueReviews, flashcards, studyPlans, todayKey } = params;
  const items: ReviewRecommendationItem[] = [];

  const dueFlashcards = flashcards.filter(
    (card) => !Number(card.mastered ?? 0) && isDueFlashcard(card.next_review, todayKey)
  );
  const activePlans = studyPlans.filter((plan) => (plan.status ?? 'pending') !== 'completed');
  const highPriorityPlans = activePlans.filter((plan) => (plan.priority ?? 'medium') === 'high');
  const scoredPlans = scorePlans({ activePlans, dueReviews, dueFlashcards });

  if (scoredPlans.length > 0) {
    const bestPlan = scoredPlans[0];
    items.push({
      title: '今天优先推进这个计划',
      body: `${bestPlan.plan.title ?? '当前计划'} 最值得先做，建议至少投入 ${Number(
        bestPlan.plan.daily_minutes ?? 0
      )} 分钟。${bestPlan.reason ? `原因：${bestPlan.reason}。` : ''}`,
      href: '/study-plan',
    });
  } else if (highPriorityPlans.length > 0) {
    const plan = highPriorityPlans[0];
    items.push({
      title: '高优先计划需要推进',
      body: `${plan.title ?? '当前高优先计划'} 仍在进行中，建议今天至少完成 ${Number(
        plan.daily_minutes ?? 0
      )} 分钟。`,
      href: '/study-plan',
    });
  }

  if (dueReviews.length > 0) {
    const topType = getTopLabel(
      dueReviews.map((record) => String(record.type ?? '未分类')),
      '未分类'
    );
    items.push({
      title: '优先补错题高发题型',
      body: `${topType} 是今天到期最多的错题来源，建议先回到错题本快速清掉这一类。`,
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
      body: `${topCategory} 这类卡片到期最多，适合先在统一复习里连刷一轮。`,
      href: '/review',
    });
  }

  if (items.length === 0) {
    items.push({
      title: '今天节奏不错',
      body: '目前没有明显堆积项，可以直接进入统一复习或做一套模考保持手感。',
      href: '/review',
    });
  }

  return items.slice(0, 3);
}
