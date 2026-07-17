/**
 * 增强版PDF题库解析器
 * 解决问题：
 * 1. 支持真题和答案分开的PDF
 * 2. 更强的题目识别正则
 * 3. 智能匹配答案
 * 4. 处理各种格式异常
 */

import { db, sqlite } from '../db';
import * as schema from '../db/schema';

// 题目编号识别（支持更多格式）
const QUESTION_NUMBER_PATTERNS = [
  /^\s*(?:第\s*)?(\d{1,3})\s*[、．.。)）:：题]\s*/,  // 1. 或 第1题
  /^\s*(\d{1,3})\s*[、．.。)）]\s*/,                // 1、 或 1.
  /^\s*\((\d{1,3})\)\s*/,                         // (1)
  /^\s*【(\d{1,3})】\s*/,                         // 【1】
];

// 选项识别（支持更多格式）
const OPTION_PATTERNS = [
  /^([A-D])\s*[、．.。)）:：]\s*(.+?)$/gm,        // A. 选项内容
  /^([A-D])\s+(.+?)$/gm,                         // A 选项内容
  /^\(([A-D])\)\s*(.+?)$/gm,                     // (A) 选项内容
  /^【([A-D])】\s*(.+?)$/gm,                     // 【A】选项内容
];

// 答案识别
const ANSWER_PATTERNS = [
  /(?:答案|正确答案|参考答案|标准答案)\s*[:：]\s*([A-D])/i,
  /^(\d{1,3})\s*[、．.。)）]\s*([A-D])\s*$/gm,   // 答案列表：1. A
  /^(\d{1,3})\s+([A-D])\s*$/gm,                  // 1 A
];

/**
 * 从文本中提取题目编号
 */
function extractQuestionNumber(text: string): string | null {
  for (const pattern of QUESTION_NUMBER_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= 150) {
        return match[1];
      }
    }
  }
  return null;
}

/**
 * 从文本中提取选项
 */
function extractOptions(text: string): string[] {
  const options: string[] = [];

  for (const pattern of OPTION_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length >= 2) {
      // 找到至少2个选项
      for (const match of matches.slice(0, 4)) {
        const label = match[1].toUpperCase();
        const content = match[2].trim();
        if (content) {
          options.push(`${label}. ${content}`);
        }
      }
      if (options.length >= 2) break;
    }
  }

  return options;
}

/**
 * 从答案PDF中构建答案映射表
 */
function buildAnswerMap(answerDocs: any[]): Map<string, string> {
  const answerMap = new Map<string, string>();

  for (const doc of answerDocs) {
    const content = doc.content || '';

    // 尝试所有答案格式
    for (const pattern of ANSWER_PATTERNS) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        if (match[2]) {
          // 格式：1. A
          const num = match[1];
          const answer = match[2].toUpperCase();
          answerMap.set(num, answer);
        } else if (match[1]) {
          // 格式：答案：A
          // 需要根据上下文推断题号
          const lines = content.split('\n');
          const lineIndex = lines.findIndex(line => line.includes(match[0]));
          if (lineIndex > 0) {
            const prevLine = lines[lineIndex - 1];
            const num = extractQuestionNumber(prevLine);
            if (num) {
              answerMap.set(num, match[1].toUpperCase());
            }
          }
        }
      }
    }
  }

  return answerMap;
}

/**
 * 智能题型分类
 */
function classifyQuestionType(content: string, number: string): string {
  const num = parseInt(number);

  // 根据题号推断（国考标准题序）
  if (num >= 1 && num <= 20) return '行测-常识判断';
  if (num >= 21 && num <= 60) return '行测-言语理解';
  if (num >= 61 && num <= 75) return '行测-数量关系';
  if (num >= 76 && num <= 115) return '行测-判断推理';
  if (num >= 116 && num <= 135) return '行测-资料分析';

  // 根据内容关键词推断
  if (/资料|图表|统计|增长率|比重/.test(content)) return '行测-资料分析';
  if (/判断|图形|定义|类比|逻辑/.test(content)) return '行测-判断推理';
  if (/数量|数学|计算/.test(content)) return '行测-数量关系';
  if (/言语|阅读|填空/.test(content)) return '行测-言语理解';
  if (/常识|政治|法律|经济/.test(content)) return '行测-常识判断';

  return '行测-常识判断';
}

/**
 * 解析单个题目段落
 */
function parseQuestion(text: string, answerMap: Map<string, string>, sourceTitle: string) {
  const number = extractQuestionNumber(text);
  if (!number) return null;

  // 移除题号前缀
  let cleanText = text;
  for (const pattern of QUESTION_NUMBER_PATTERNS) {
    cleanText = cleanText.replace(pattern, '');
  }

  const options = extractOptions(cleanText);
  if (options.length < 2) return null;

  // 提取题干（选项之前的内容）
  const firstOption = cleanText.indexOf(options[0].charAt(0));
  const questionContent = cleanText.substring(0, firstOption).trim();

  if (questionContent.length < 5) return null;

  // 查找答案
  const answer = answerMap.get(number) || '';

  const type = classifyQuestionType(questionContent, number);

  return {
    type,
    content: questionContent,
    options: JSON.stringify(options),
    answer: answer || 'A', // 默认A
    explanation: answer ? `来源：${sourceTitle}` : `来源：${sourceTitle}；未识别到答案，默认A`,
    tags: `pdf_import,${sourceTitle},${answer ? 'has_answer' : 'no_answer'}`,
    number,
  };
}

/**
 * 主函数：增强版PDF题库同步
 */
export function enhancedSyncPdfToQuestions() {
  console.log('[Enhanced Parser] 开始解析PDF题库...');

  // 1. 获取所有PDF文档
  const allDocs = sqlite.prepare(`
    SELECT id, title, content, source, category
    FROM rag_docs
    WHERE source IN ('pdf_exam', 'pdf_answer')
  `).all() as any[];

  // 2. 分离真题和答案
  const examDocs = allDocs.filter(d =>
    d.source === 'pdf_exam' ||
    !d.title.includes('答案') && !d.title.includes('解析')
  );

  const answerDocs = allDocs.filter(d =>
    d.source === 'pdf_answer' ||
    d.title.includes('答案') ||
    d.title.includes('解析')
  );

  console.log(`[Enhanced Parser] 真题文档：${examDocs.length}，答案文档：${answerDocs.length}`);

  // 3. 构建答案映射表
  const answerMap = buildAnswerMap(answerDocs);
  console.log(`[Enhanced Parser] 识别到 ${answerMap.size} 个答案`);

  // 4. 解析每个真题文档
  const questions: any[] = [];

  for (const doc of examDocs) {
    const content = doc.content || '';
    const title = doc.title || 'PDF题库';

    // 按段落分割（每个题目通常是一个段落）
    const paragraphs = content.split(/\n\s*\n+/).filter(p => p.trim().length > 20);

    for (const para of paragraphs) {
      const question = parseQuestion(para, answerMap, title);
      if (question) {
        questions.push(question);
      }
    }
  }

  console.log(`[Enhanced Parser] 解析出 ${questions.length} 道题目`);

  // 5. 去重并导入数据库
  const existingQuestions = sqlite.prepare('SELECT id, content FROM questions').all() as any[];
  const existingSet = new Set(existingQuestions.map(q =>
    q.content.replace(/\s+/g, '').substring(0, 100)
  ));

  let imported = 0;
  let skipped = 0;

  const insertStmt = sqlite.prepare(`
    INSERT INTO questions (type, content, options, answer, explanation, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const q of questions) {
    const key = q.content.replace(/\s+/g, '').substring(0, 100);
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    try {
      insertStmt.run(q.type, q.content, q.options, q.answer, q.explanation, q.tags);
      imported++;
      existingSet.add(key);
    } catch (err) {
      console.error(`[Enhanced Parser] 导入失败：`, err);
      skipped++;
    }
  }

  console.log(`[Enhanced Parser] 导入完成：新增 ${imported} 题，跳过 ${skipped} 题`);

  return {
    questionsImported: imported,
    questionsSkipped: skipped,
    totalParsed: questions.length,
    answerFound: questions.filter(q => q.tags.includes('has_answer')).length,
  };
}
