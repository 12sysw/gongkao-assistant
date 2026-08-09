export const PAPER_QUESTION_TYPES = [
  '行测-常识判断',
  '行测-言语理解',
  '行测-数量关系',
  '行测-判断推理',
  '行测-资料分析',
  '申论',
] as const;

export type PaperQuestionType = typeof PAPER_QUESTION_TYPES[number];

export interface PaperQuestionDraft {
  localId: string;
  enabled: boolean;
  number: string;
  type: PaperQuestionType;
  material: string;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
  warnings: string[];
}

function normalizeText(text: string) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0|\u3000/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gim, '')
    .replace(/^\s*第\s*\d+\s*页\s*(?:共\s*\d+\s*页)?\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function inferType(text: string, number: string): PaperQuestionType {
  const compact = text.replace(/\s+/g, '');
  if (/申论|作答要求|给定资料/.test(compact) && !/行政职业能力测验|行测/.test(compact)) return '申论';
  if (/资料分析|增长率|比重|基期|现期|同比|环比|百分点|图表|统计资料/.test(compact)) return '行测-资料分析';
  if (/图形推理|定义判断|类比推理|逻辑判断|判断推理|加强|削弱/.test(compact)) return '行测-判断推理';
  if (/数量关系|数学运算|工程问题|行程问题|排列组合|概率|利润/.test(compact)) return '行测-数量关系';
  if (/言语理解|逻辑填空|片段阅读|语句排序|中心理解|选词填空/.test(compact)) return '行测-言语理解';
  if (/常识判断|政治|法律|科技|人文|历史|地理/.test(compact)) return '行测-常识判断';

  const value = Number.parseInt(number, 10);
  if (Number.isFinite(value)) {
    if (value <= 20) return '行测-常识判断';
    if (value <= 60) return '行测-言语理解';
    if (value <= 75) return '行测-数量关系';
    if (value <= 115) return '行测-判断推理';
    return '行测-资料分析';
  }
  return '行测-常识判断';
}

function extractAnswerMap(text: string) {
  const result = new Map<string, string>();
  const patterns = [
    /(?:^|\n|\s)(?:第\s*)?(\d{1,3})\s*(?:题)?\s*[.．、)）:：]?\s*(?:【?答案】?|正确答案|参考答案)\s*[:：]?\s*([A-D])/gim,
    /(?:^|\n)\s*(\d{1,3})\s*[.．、)）:：]\s*([A-D])(?=\s|[。；;，,、]|$)/gim,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) result.set(match[1], match[2].toUpperCase());
  }
  return result;
}

function cleanOption(label: string, value: string) {
  return `${label}. ${cleanBlock(value)}`;
}

function cleanBlock(value: string) {
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitMetadata(body: string) {
  const marker = /(?:^|\n|\s+)(?:【\s*)?(答案解析|参考解析|解析|正确答案|参考答案|答案)(?:\s*】)?\s*[:：]?\s*/gi;
  const matches = [...body.matchAll(marker)];
  if (matches.length === 0) return { questionBody: body, answer: '', explanation: '' };

  const questionBody = body.slice(0, matches[0].index).trim();
  let answer = '';
  let explanation = '';
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? body.length : body.length;
    const value = cleanBlock(body.slice(start, end));
    if (/答案/.test(match[1])) {
      answer ||= value.match(/^\s*([A-D])(?=\s|[。；;，,、]|$)/i)?.[1]?.toUpperCase() ?? '';
      if (/解析/.test(match[1])) {
        explanation ||= value.replace(/^\s*[A-D](?=\s|[。；;，,、]|$)\s*/i, '').trim();
      }
    } else {
      explanation ||= value;
    }
  }
  return { questionBody, answer, explanation };
}

function extractMaterial(context: string) {
  const normalized = cleanBlock(context);
  const marker = normalized.search(/(?:给定资料|根据以下资料|阅读下列材料|资料\s*\d*|材料\s*\d*)\s*[:：]?/i);
  if (marker < 0) return '';
  const material = normalized.slice(marker).trim();
  const questionStart = material.search(/\n\s*(?:第\s*)?\d{1,3}\s*(?:题|[.．、)）:：])\s*/);
  return questionStart > 0 ? material.slice(0, questionStart).trim() : material;
}

function parseSegment(segment: string, number: string, context: string, answerMap: Map<string, string>, index: number): PaperQuestionDraft | null {
  const body = segment
    .replace(/^\s*(?:第\s*)?\d{1,3}\s*(?:题|[.．、)）:：])\s*/, '')
    .trim();
  const metadata = splitMetadata(body);
  const optionPattern = /(?:^|\n|\s+)([A-D])\s*[.．、)）:：]\s*/g;
  const matches = [...metadata.questionBody.matchAll(optionPattern)];
  const options: string[] = [];
  let content = metadata.questionBody;

  if (matches.length >= 2) {
    content = metadata.questionBody.slice(0, matches[0].index).trim();
    for (let i = 0; i < Math.min(matches.length, 4); i += 1) {
      const match = matches[i];
      const start = (match.index ?? 0) + match[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index ?? metadata.questionBody.length : metadata.questionBody.length;
      options.push(cleanOption(match[1].toUpperCase(), metadata.questionBody.slice(start, end)));
    }
  }

  content = cleanBlock(content);
  const answer = metadata.answer || answerMap.get(number) || '';
  const explanation = metadata.explanation;
  const warnings: string[] = [];
  if (content.length < 5) warnings.push('题干过短');
  if (options.length > 0 && options.length < 4) warnings.push(`仅识别到 ${options.length} 个选项`);
  if (options.length === 0 && !/申论|作答要求/.test(`${context} ${content}`)) warnings.push('未识别选项');
  if (!answer && options.length > 0) warnings.push('缺少答案');

  if (!content && options.length === 0) return null;
  return {
    localId: `draft-${Date.now()}-${index}`,
    enabled: true,
    number,
    type: inferType(`${context}\n${content}`, number),
    material: extractMaterial(context),
    content,
    options,
    answer,
    explanation,
    warnings,
  };
}

export function parsePaperText(rawText: string): PaperQuestionDraft[] {
  const text = normalizeText(rawText);
  if (!text) return [];
  const answerMap = extractAnswerMap(text);
  const starts = [...text.matchAll(/^\s*(?:第\s*)?(\d{1,3})\s*(?:题|[.．、)）:：])\s*(?=\S)/gm)]
    .filter((match) => {
      const value = Number.parseInt(match[1], 10);
      if (value < 1 || value > 200) return false;
      const after = text.slice((match.index ?? 0) + match[0].length).split('\n', 1)[0].trim();
      return !/^[A-D](?:[。；;，,、]?\s*)$/i.test(after);
    });

  if (starts.length === 0) {
    const draft = parseSegment(text, '1', text.slice(0, 300), answerMap, 0);
    return draft ? [draft] : [];
  }

  return starts.flatMap((start, index) => {
    const from = start.index ?? 0;
    const to = index + 1 < starts.length ? starts[index + 1].index ?? text.length : text.length;
    const contextStart = index === 0 ? 0 : Math.max(0, from - 2000);
    const draft = parseSegment(text.slice(from, to), start[1], text.slice(contextStart, from), answerMap, index);
    return draft ? [draft] : [];
  });
}

export function splitPaperTextForAi(rawText: string, maxChars = 12000) {
  const text = normalizeText(rawText);
  if (!text) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + maxChars);
    if (end < text.length) {
      const windowStart = Math.max(start + Math.floor(maxChars * 0.6), start);
      const boundaryText = text.slice(windowStart, end);
      const boundaries = [...boundaryText.matchAll(/\n\s*(?:第\s*)?\d{1,3}\s*(?:题|[.．、)）:：])\s*/g)];
      const boundary = boundaries.at(-1);
      if (boundary?.index !== undefined) end = windowStart + boundary.index;
    }
    if (end <= start) end = Math.min(text.length, start + maxChars);
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

export function splitDraftContent(draft: PaperQuestionDraft) {
  const material = draft.material.trim();
  const content = draft.content.trim();
  if (!material) return content;
  return `【资料】\n${material}\n\n【题目】${content}`;
}

export function validateDraft(draft: PaperQuestionDraft) {
  const warnings: string[] = [];
  if (!draft.content.trim()) warnings.push('缺少题干');
  if (draft.type !== '申论' && draft.options.length < 2) warnings.push('缺少选项');
  if (draft.type !== '申论' && !/^[A-D]$/i.test(draft.answer.trim())) warnings.push('缺少有效答案');
  return warnings;
}
