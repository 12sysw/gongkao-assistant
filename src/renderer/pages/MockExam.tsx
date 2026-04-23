import { useEffect, useCallback } from 'react';
import {
  Clock,
  BarChart3,
  Target,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useMockExamStore } from '../stores/mock-exam-store';

// ==================== 题目生成 ====================
const QUESTION_TYPES = ['言语理解', '数量关系', '判断推理', '资料分析', '常识判断'];

function generateMockQuestions(): any[] {
  const counts = { '言语理解': 40, '数量关系': 15, '判断推理': 35, '资料分析': 20, '常识判断': 25 };
  const questions: any[] = [];

  QUESTION_TYPES.forEach((type, typeIndex) => {
    const count = counts[type as keyof typeof counts];
    for (let i = 0; i < count; i++) {
      questions.push({
        id: typeIndex * 100 + i,
        type: `行测-${type}`,
        content: `【${type}】第${i + 1}题：这是一道模拟题目，请在实际使用时导入真实题目。`,
        options: ['A.选项一', 'B.选项二', 'C.选项三', 'D.选项四'],
        answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
        explanation: '这是解析内容',
      });
    }
  });

  return questions;
}

function generateChallengeQuestions(): any[] {
  const questions: any[] = [];

  QUESTION_TYPES.forEach((type, typeIndex) => {
    for (let i = 0; i < 5; i++) {
      questions.push({
        id: typeIndex * 100 + i + 1000,
        type: `行测-${type}`,
        content: `【${type}挑战题${i + 1}】这是一道随机挑战题目，请认真作答！`,
        options: ['A.选项一', 'B.选项二', 'C.选项三', 'D.选项四'],
        answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
        explanation: '这是解析内容',
      });
    }
  });

  // 随机打乱
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions;
}

// ==================== AI 分析 ====================
async function analyzeWithAI(report: any, onStream: (text: string) => void): Promise<string | null> {
  const savedConfig = localStorage.getItem('ai_config');
  if (!savedConfig) return null;

  const config = JSON.parse(savedConfig);
  if (!config.apiKey || !config.apiUrl) return null;

  const prompt = `你是公务员考试资深辅导老师，擅长通过答题数据分析考生的薄弱环节并给出精准建议。

答题概况：
- 题目总数：${report.totalQuestions}
- 已答题：${report.totalAnswered}
- 答对：${report.correctCount}
- 正确率：${report.accuracy}%
- 答题用时：${Math.floor(report.timeUsed / 60)}分钟

分题型详情：
${report.weaknesses.map((w: any) => `${w.type.split('-')[1]}：${w.correct}/${w.total}题 正确率${w.accuracy.toFixed(0)}%`).join('\n')}

请按以下结构输出（不要使用markdown标记）：

【整体评分】
用一段话给出整体表现评价和预估分数

【薄弱环节分析】
针对正确率低于70%的题型，指出常见失分原因和需要复习的知识点

【提分建议】
给出3-5条可立即执行的复习建议

【时间管理】
分析答题节奏是否合理`;

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: 1500, stream: true }),
    });

    if (!response.ok) return null;

    const reader = response.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              onStream(fullText);
            }
          } catch {}
        }
      }
    }

    return fullText || null;
  } catch {
    return null;
  }
}

// ==================== 格式化工具 ====================
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function generateSuggestions(weaknesses: any[], unanswered: number, timeUsed: number): string[] {
  const suggestions: string[] = [];
  const minutes = Math.floor(timeUsed / 60);

  if (minutes < 90) suggestions.push('⏰ 完成速度较快，建议检查是否有漏题或粗心错误');
  else if (minutes > 115) suggestions.push('⏰ 时间紧张，建议加强限时训练');

  const weak = weaknesses.filter(w => w.accuracy < 60);
  if (weak.length > 0) suggestions.push(`📉 重点突破：${weak.map(w => w.type.split('-')[1]).join('、')} 正确率低于60%`);

  if (unanswered > 10) suggestions.push(`⚠️ 有${unanswered}题未作答，建议考试时先跳过难题`);

  const strong = weaknesses.filter(w => w.accuracy >= 80);
  if (strong.length > 0) suggestions.push(`💪 保持优势：${strong.map(w => w.type.split('-')[1]).join('、')} 表现优秀`);

  if (suggestions.length === 0) suggestions.push('🎯 整体表现均衡，继续保持！');
  return suggestions;
}

// ==================== 主组件 ====================
export default function MockExam() {
  const store = useMockExamStore();

  // 正式考试计时器
  useEffect(() => {
    if (store.step === 'exam' && !store.challengeMode && store.timeLeft > 0) {
      const timer = setInterval(() => {
        if (store.timeLeft <= 1) {
          handleSubmit();
        } else {
          store.decrementTime();
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [store.step, store.challengeMode, store.timeLeft]);

  // 挑战模式倒计时
  useEffect(() => {
    if (store.challengeCountdown !== null && store.challengeCountdown > 0) {
      const countdown = store.challengeCountdown;
      const timer = setTimeout(() => countdown !== null && store.setChallengeCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (store.challengeCountdown === 0) {
      store.setChallengeCountdown(null);
      store.setChallengeMode(true);
      store.setChallengeTimer(0);
      store.setQuestions(generateChallengeQuestions());
      store.setStep('exam');
      store.clearAnswers();
      store.setCurrentIndex(0);
    }
  }, [store.challengeCountdown]);

  // 挑战模式计时
  useEffect(() => {
    if (store.challengeMode && !store.challengeResult) {
      const timer = setInterval(() => store.incrementChallengeTimer(), 1000);
      return () => clearInterval(timer);
    }
  }, [store.challengeMode, store.challengeResult]);

  // 开始正式考试
  const startExam = useCallback(() => {
    store.setStep('exam');
    store.setChallengeMode(false);
    store.clearAnswers();
    store.setCurrentIndex(0);
    store.setTimeLeft(120 * 60);
    store.setQuestions(generateMockQuestions());
  }, []);

  // 开始挑战模式
  const startChallenge = useCallback(() => {
    store.setChallengeCountdown(3);
    store.setChallengeResult(null);
  }, []);

  // 答题
  const handleAnswer = useCallback((answer: string) => {
    const q = store.questions[store.currentIndex];
    store.setAnswer(q.id, { questionId: q.id, type: q.type, myAnswer: answer, correct: answer === q.answer });

    if (store.challengeMode) {
      if (store.currentIndex < store.questions.length - 1) {
        setTimeout(() => store.setCurrentIndex(store.currentIndex + 1), 150);
      } else {
        setTimeout(() => finishChallenge(), 200);
      }
    } else {
      if (store.currentIndex < store.questions.length - 1) {
        setTimeout(() => store.setCurrentIndex(store.currentIndex + 1), 200);
      }
    }
  }, [store.currentIndex, store.questions, store.challengeMode]);

  // 完成挑战
  const finishChallenge = useCallback(() => {
    const answers = store.answers;
    const correctCount = Array.from(answers.values()).filter(a => a.correct).length;
    const accuracy = (correctCount / store.questions.length) * 100;

    store.setStep('select');
    store.setChallengeMode(false);

    if (accuracy < 60) {
      store.setChallengeResult('lose');
      store.setChallengeMessage(store.getRandomTaunt());
    } else {
      store.setChallengeResult('win');
      store.setChallengeMessage(store.getRandomPraise());
    }
  }, [store.answers, store.questions.length]);

  // 重置挑战
  const resetChallenge = useCallback(() => {
    store.setChallengeResult(null);
    store.setChallengeMode(false);
    store.setStep('select');
    store.clearAnswers();
    store.setQuestions([]);
  }, []);

  // 交卷确认
  const handleSubmit = useCallback(() => {
    store.setShowConfirm(true);
  }, []);

  // 确认交卷
  const confirmSubmit = useCallback(() => {
    store.setShowConfirm(false);

    const answers = store.answers;
    const answerList = Array.from(answers.values());
    const correctCount = answerList.filter(a => a.correct).length;
    const totalAnswered = answerList.length;
    const totalQuestions = store.questions.length;
    const unansweredCount = totalQuestions - totalAnswered;
    const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered * 100).toFixed(1) : '0';
    const timeUsed = 120 * 60 - store.timeLeft;

    // 按题型统计
    const typeStats: Record<string, { correct: number; total: number; unanswered: number }> = {};
    store.questions.forEach(q => {
      if (!typeStats[q.type]) typeStats[q.type] = { correct: 0, total: 0, unanswered: 0 };
      typeStats[q.type].total++;
      const ans = answers.get(q.id);
      if (ans) { if (ans.correct) typeStats[q.type].correct++; }
      else { typeStats[q.type].unanswered++; }
    });

    const weaknesses = Object.entries(typeStats)
      .map(([type, stat]) => ({ type, accuracy: stat.total > 0 ? (stat.correct / stat.total * 100) : 0, ...stat }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const suggestions = generateSuggestions(weaknesses, unansweredCount, timeUsed);

    const report = { totalQuestions, totalAnswered, correctCount, unansweredCount, accuracy, timeUsed, typeStats, weaknesses, suggestions, aiAnalysis: undefined };
    store.setReport(report);
    store.setStep('result');

    // 后台AI分析
    store.setAiAnalyzing(true);
    store.setAiAnalysisText('');
    analyzeWithAI(report, (text) => store.setAiAnalysisText(text)).then(aiAnalysis => {
      if (aiAnalysis && store.report) {
        store.setReport({ ...store.report, aiAnalysis });
      }
      store.setAiAnalyzing(false);
    }).catch(() => store.setAiAnalyzing(false));
  }, [store.answers, store.questions, store.timeLeft]);

  // 重置考试
  const resetExam = useCallback(() => {
    store.setStep('select');
    store.setReport(null);
    store.setAiAnalysisText('');
    store.setAiAnalyzing(false);
  }, []);

  // ==================== 渲染 ====================
  const { step, questions, currentIndex, answers, timeLeft, report, showConfirm, challengeMode, challengeCountdown, challengeTimer, challengeResult, challengeMessage, aiAnalyzing, aiAnalysisText } = store;

  // 选择界面
  if (step === 'select') {
    return <SelectPage startExam={startExam} startChallenge={startChallenge} challengeCountdown={challengeCountdown} challengeResult={challengeResult} challengeMessage={challengeMessage} resetChallenge={resetChallenge} questions={questions} answers={answers} challengeTimer={challengeTimer} />;
  }

  // 答题界面
  if (step === 'exam') {
    return <ExamPage questions={questions} currentIndex={currentIndex} answers={answers} timeLeft={timeLeft} challengeMode={challengeMode} challengeTimer={challengeTimer} handleAnswer={handleAnswer} handleSubmit={handleSubmit} showConfirm={showConfirm} confirmSubmit={confirmSubmit} setShowConfirm={store.setShowConfirm} setCurrentIndex={store.setCurrentIndex} />;
  }

  // 结果界面
  if (step === 'result' && report) {
    return <ResultPage report={report} aiAnalyzing={aiAnalyzing} aiAnalysisText={aiAnalysisText} resetExam={resetExam} />;
  }

  return null;
}

// ==================== 选择页面 ====================
function SelectPage({ startExam, startChallenge, challengeCountdown, challengeResult, challengeMessage, resetChallenge, questions, answers, challengeTimer }: any) {
  return (
    <div className="p-6 space-y-6 relative">
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">智能套题测评</h1>
        <p className="text-gray-500">模拟真实考试，AI分析薄弱环节</p>
      </div>

      {/* 悬浮挑战入口 */}
      <button onClick={startChallenge} className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white rounded-full p-4 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all animate-bounce">
        <Sparkles className="w-6 h-6" />
      </button>
      <div className="fixed bottom-20 right-6 z-40 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded shadow">点我有惊喜！</div>

      {/* 正式考试入口 */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div onClick={startExam} className="bg-white border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-primary-400 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">行政职业能力测验</h3>
              <p className="text-sm text-gray-500 mt-1">135题 | 120分钟 | 言语+数量+判断+资料+常识</p>
            </div>
            <div className="flex items-center gap-2 text-primary-600">
              <Clock className="w-5 h-5" />
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-6 opacity-60">
          <h3 className="text-lg font-semibold text-gray-500">申论</h3>
          <p className="text-sm text-gray-400 mt-1">即将上线</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm text-yellow-800">💡 <strong>提示：</strong>请先在错题本中导入题目，或系统将使用模拟题目进行测评</p>
      </div>

      {/* 倒计时弹窗 */}
      {challengeCountdown !== null && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]">
          <div className="text-center">
            <div className="text-9xl font-bold text-white animate-bounce mb-4">{challengeCountdown}</div>
            {challengeCountdown > 0 && <p className="text-3xl text-gray-300">准备好了吗...</p>}
          </div>
        </div>
      )}

      {/* 挑战结果弹窗 */}
      {challengeResult && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-xl">
            <div className="text-6xl mb-4">{challengeResult === 'win' ? '🎉' : '😅'}</div>
            <h2 className={`text-2xl font-bold mb-2 ${challengeResult === 'win' ? 'text-green-600' : 'text-red-600'}`}>
              {challengeResult === 'win' ? '挑战成功！' : '挑战失败'}
            </h2>
            <p className="text-gray-600 mb-2">正确率：{Math.round((Array.from(answers.values()).filter((a: any) => a.correct).length / questions.length) * 100)}%</p>
            <p className="text-sm text-gray-500 mb-2">用时：{challengeTimer}秒</p>
            <p className={`text-lg font-medium mt-4 ${challengeResult === 'win' ? 'text-green-600' : 'text-orange-600'}`}>{challengeMessage}</p>
            <button onClick={resetChallenge} className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">再来一次</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 答题页面 ====================
function ExamPage({ questions, currentIndex, answers, timeLeft, challengeMode, challengeTimer, handleAnswer, handleSubmit, showConfirm, confirmSubmit, setShowConfirm, setCurrentIndex }: any) {
  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // 挑战模式全屏
  if (challengeMode) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
        <div className="px-6 py-4 text-white">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🎮</span>
              <span className="text-lg font-bold">挑战模式</span>
              <span className="text-white/80">第 {currentIndex + 1} / {questions.length} 题</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">已答 {answers.size} 题</span>
              <div className="flex items-center gap-2 font-mono text-xl bg-white/20 px-3 py-1 rounded-full">
                <Clock className="w-5 h-5" />
                {formatTime(challengeTimer)}
              </div>
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-3">
            <div className="w-full h-2 bg-white/30 rounded-full">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {q && (
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <p className="text-xl text-gray-800 leading-relaxed mb-8">{q.content}</p>
                <div className="space-y-4">
                  {q.options.map((opt: string, i: number) => {
                    const isSelected = answers.get(q.id)?.myAnswer === opt[0];
                    return (
                      <button key={i} onClick={() => handleAnswer(opt[0])} className={`w-full text-left p-5 rounded-xl border-3 transition-all text-lg ${isSelected ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}>
                        <span className="font-medium">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 text-center text-white/60 text-sm">选择答案后自动跳转下一题 · 共 {questions.length} 题</div>
      </div>
    );
  }

  // 正式考试模式
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部状态栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">{q?.type}</span>
            <span className="text-sm text-gray-400">第 {currentIndex + 1} / {questions.length} 题</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">已答 {answers.size} 题</span>
            <div className={`flex items-center gap-1 font-mono text-lg ${timeLeft < 600 ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-2">
          <div className="w-full h-1 bg-gray-200 rounded-full">
            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* 题目内容 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {q && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-lg text-gray-800 leading-relaxed mb-6">{q.content}</p>
              <div className="space-y-3">
                {q.options.map((opt: string, i: number) => {
                  const isSelected = answers.get(q.id)?.myAnswer === opt[0];
                  return (
                    <button key={i} onClick={() => handleAnswer(opt[0])} className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <span className="font-medium">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部导航 */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30">上一题</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">交卷</button>
          <button onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))} disabled={currentIndex === questions.length - 1} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30">下一题</button>
        </div>
      </div>

      {/* 题号导航 */}
      <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex gap-1 flex-wrap">
          {questions.slice(0, 50).map((_q: any, i: number) => (
            <button key={i} onClick={() => setCurrentIndex(i)} className={`w-7 h-7 text-xs rounded ${currentIndex === i ? 'bg-primary-500 text-white' : answers.has(questions[i]?.id) ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-200'}`}>
              {i + 1}
            </button>
          ))}
          {questions.length > 50 && <span className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">...</span>}
        </div>
      </div>

      {/* 交卷确认 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">确认交卷？</h3>
            <div className="text-sm text-gray-600 mb-4 space-y-1">
              <p>已答题数：{answers.size} / {questions.length}</p>
              <p>未答题数：{questions.length - answers.size}</p>
              {questions.length - answers.size > 0 && <p className="text-orange-500">⚠️ 还有 {questions.length - answers.size} 题未作答</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">继续答题</button>
              <button onClick={confirmSubmit} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">确认交卷</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 结果页面 ====================
function ResultPage({ report, aiAnalyzing, aiAnalysisText, resetExam }: any) {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-gray-800">测评报告</h1>
      </div>

      {/* 核心数据 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-primary-600">{report.correctCount}</p>
          <p className="text-sm text-gray-500 mt-1">正确题数</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{report.unansweredCount}</p>
          <p className="text-sm text-gray-500 mt-1">未作答</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-800">{report.accuracy}%</p>
          <p className="text-sm text-gray-500 mt-1">正确率</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-800">{formatTime(report.timeUsed)}</p>
          <p className="text-sm text-gray-500 mt-1">用时</p>
        </div>
      </div>

      {/* 各题型正确率 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary-500" />各题型正确率</h2>
        <div className="space-y-4">
          {report.weaknesses.map((w: any) => {
            const pct = w.accuracy;
            let color = 'bg-green-500';
            if (pct < 50) color = 'bg-red-500';
            else if (pct < 70) color = 'bg-yellow-500';
            else if (pct < 85) color = 'bg-blue-500';
            return (
              <div key={w.type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{w.type.split('-')[1]}</span>
                  <span className="text-sm text-gray-500">{w.correct}/{w.total} | {pct.toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI分析 */}
      {(aiAnalyzing || aiAnalysisText || report.aiAnalysis) ? (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            AI深度分析
            {aiAnalyzing && <span className="text-xs text-purple-500 animate-pulse">分析中...</span>}
          </h2>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {(aiAnalysisText || report.aiAnalysis || '').split('\n').map((line: string, i: number) => (
              <p key={i} className="text-gray-700 mb-2">{line}</p>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-primary-500" />智能分析建议</h2>
          <div className="space-y-3">
            {report.suggestions.map((s: string, i: number) => (
              <div key={i} className="bg-white/80 rounded-lg p-3 text-sm text-gray-700">{s}</div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-700">💡 配置AI接口后可获得更详细的深度分析，<a href="#/settings" className="underline">去设置</a></div>
        </div>
      )}

      {/* 薄弱提示 */}
      {report.weaknesses.filter((w: any) => w.accuracy < 60).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">需要重点突破</p>
              <p className="text-sm text-red-600 mt-1">{report.weaknesses.filter((w: any) => w.accuracy < 60).map((w: any) => w.type.split('-')[1]).join('、')} 正确率较低</p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-center gap-4">
        <button onClick={resetExam} className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
          <RefreshCw className="w-4 h-4" />
          再测一次
        </button>
      </div>
    </div>
  );
}