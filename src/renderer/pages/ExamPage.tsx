import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  Circle,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { useQuestions } from '../hooks/use-api';
import type { QuestionRecord } from '../../shared/ipc';

interface ExamState {
  questions: QuestionRecord[];
  answers: Record<number, string>;
  currentIndex: number;
  timeLeft: number;
  flagged: Set<number>;
  isSubmitting: boolean;
  showSubmitConfirm: boolean;
}

const ExamPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examType = searchParams.get('type') || 'full'; // full, 常识判断, 言语理解等

  // 根据考试类型设置题目筛选和时间
  const getExamConfig = () => {
    const configs: Record<string, { filter?: { type?: string }, time: number, count: number }> = {
      'full': { time: 120, count: 135 },
      '常识判断': { filter: { type: '常识判断' }, time: 15, count: 20 },
      '言语理解': { filter: { type: '言语理解' }, time: 25, count: 40 },
      '数量关系': { filter: { type: '数量关系' }, time: 15, count: 15 },
      '判断推理': { filter: { type: '判断推理' }, time: 35, count: 40 },
      '资料分析': { filter: { type: '资料分析' }, time: 30, count: 20 },
    };
    return configs[examType] || configs['full'];
  };

  const config = getExamConfig();
  const { data: allQuestions, isLoading } = useQuestions(config.filter);

  const [state, setState] = useState<ExamState>({
    questions: [],
    answers: {},
    currentIndex: 0,
    timeLeft: config.time * 60,
    flagged: new Set(),
    isSubmitting: false,
    showSubmitConfirm: false,
  });

  // 初始化题目
  useEffect(() => {
    if (allQuestions && allQuestions.length > 0 && state.questions.length === 0) {
      // 随机抽取题目
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, config.count);
      setState(prev => ({ ...prev, questions: selected }));
    }
  }, [allQuestions, config.count, state.questions.length]);

  // 倒计时
  useEffect(() => {
    if (state.timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
    }, 1000);

    return () => clearInterval(timer);
  }, [state.timeLeft]);

  const currentQuestion = state.questions[state.currentIndex];
  const options = currentQuestion?.options ? JSON.parse(currentQuestion.options) : [];

  const handleAnswer = useCallback((answer: string) => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [currentQuestion.id]: answer },
    }));
  }, [currentQuestion?.id]);

  const handleFlag = useCallback(() => {
    setState(prev => {
      const newFlagged = new Set(prev.flagged);
      if (newFlagged.has(currentQuestion.id)) {
        newFlagged.delete(currentQuestion.id);
      } else {
        newFlagged.add(currentQuestion.id);
      }
      return { ...prev, flagged: newFlagged };
    });
  }, [currentQuestion?.id]);

  const goToQuestion = useCallback((index: number) => {
    setState(prev => ({ ...prev, currentIndex: index }));
  }, []);

  const handlePrevious = () => {
    if (state.currentIndex > 0) {
      goToQuestion(state.currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (state.currentIndex < state.questions.length - 1) {
      goToQuestion(state.currentIndex + 1);
    }
  };

  const handleSubmit = useCallback(() => {
    setState(prev => ({ ...prev, isSubmitting: true }));

    // 计算成绩
    let correct = 0;
    state.questions.forEach(q => {
      if (state.answers[q.id] === q.answer) {
        correct++;
      }
    });

    const score = correct;
    const accuracy = ((correct / state.questions.length) * 100).toFixed(1);

    // 跳转到成绩页面
    navigate(`/exam-result?score=${score}&total=${state.questions.length}&accuracy=${accuracy}&type=${examType}`);
  }, [state.questions, state.answers, navigate, examType]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(state.answers).length;
  const progress = (answeredCount / state.questions.length) * 100;

  if (isLoading || state.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-dark-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-600 dark:text-dark-300">正在加载题目...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-dark-900">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <p className="text-surface-600 dark:text-dark-300">没有找到题目，请返回重试</p>
          <Button onClick={() => navigate('/mock-exam')} className="mt-4">
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-dark-900 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white dark:bg-dark-800 border-b border-surface-200 dark:border-dark-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('确定要退出考试吗？已答题目将不会保存。')) {
                    navigate('/mock-exam');
                  }
                }}
              >
                <X className="w-4 h-4" />
                退出
              </Button>
              <div className="h-6 w-px bg-surface-200 dark:bg-dark-700" />
              <span className="text-sm font-medium text-surface-900 dark:text-dark-50">
                {examType === 'full' ? '国考全卷' : examType}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="text-sm text-surface-600 dark:text-dark-300">
                  已答 {answeredCount}/{state.questions.length}
                </div>
                <div className="w-32 h-2 bg-surface-100 dark:bg-dark-850 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                state.timeLeft < 300
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'bg-surface-100 dark:bg-dark-850 text-surface-900 dark:text-dark-50'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-semibold">{formatTime(state.timeLeft)}</span>
              </div>

              <Button
                variant="primary"
                onClick={() => setState(prev => ({ ...prev, showSubmitConfirm: true }))}
              >
                提交试卷
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex gap-6">
        {/* 题目区域 */}
        <div className="flex-1">
          <Card variant="elevated">
            <CardContent className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={state.currentIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* 题目标题 */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-3">
                      <Badge variant="primary" size="lg">
                        {state.currentIndex + 1}
                      </Badge>
                      <div>
                        <h3 className="text-lg font-semibold text-surface-900 dark:text-dark-50 mb-1">
                          {currentQuestion.type}
                        </h3>
                        {currentQuestion.tags && (
                          <div className="flex gap-2">
                            {currentQuestion.tags.split(',').map((tag, i) => (
                              <Badge key={i} variant="outline" size="sm">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={state.flagged.has(currentQuestion.id) ? 'primary' : 'outline'}
                      size="sm"
                      onClick={handleFlag}
                      icon={<Flag className="w-4 h-4" />}
                    >
                      {state.flagged.has(currentQuestion.id) ? '已标记' : '标记'}
                    </Button>
                  </div>

                  {/* 题目内容 */}
                  <div className="mb-8">
                    <p className="text-base leading-relaxed text-surface-900 dark:text-dark-50 whitespace-pre-wrap">
                      {currentQuestion.content}
                    </p>
                  </div>

                  {/* 选项 */}
                  <div className="space-y-3">
                    {options.map((option: string, index: number) => {
                      const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                      const isSelected = state.answers[currentQuestion.id] === optionLabel;

                      return (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleAnswer(optionLabel)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                              : 'border-surface-200 dark:border-dark-700 hover:border-brand-300 dark:hover:border-brand-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                              isSelected
                                ? 'bg-brand-500 text-white'
                                : 'bg-surface-100 dark:bg-dark-850 text-surface-600 dark:text-dark-300'
                            }`}>
                              {optionLabel}
                            </div>
                            <p className="flex-1 text-surface-900 dark:text-dark-50 pt-1">
                              {option}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* 导航按钮 */}
              <div className="flex items-center justify-between mt-8 pt-8 border-t border-surface-200 dark:border-dark-700">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={state.currentIndex === 0}
                  icon={<ChevronLeft />}
                >
                  上一题
                </Button>

                <div className="text-sm text-surface-500 dark:text-dark-400">
                  {state.currentIndex + 1} / {state.questions.length}
                </div>

                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={state.currentIndex === state.questions.length - 1}
                  iconRight={<ChevronRight />}
                >
                  下一题
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 题号面板 */}
        <div className="w-80">
          <Card variant="elevated" className="sticky top-24">
            <CardContent className="p-6">
              <h3 className="font-semibold text-surface-900 dark:text-dark-50 mb-4">
                答题卡
              </h3>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {state.questions.map((q, index) => {
                  const isAnswered = state.answers[q.id];
                  const isFlagged = state.flagged.has(q.id);
                  const isCurrent = index === state.currentIndex;

                  return (
                    <motion.button
                      key={q.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => goToQuestion(index)}
                      className={`relative aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-brand-500 text-white ring-2 ring-brand-300'
                          : isAnswered
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-surface-100 dark:bg-dark-850 text-surface-600 dark:text-dark-400 hover:bg-surface-200 dark:hover:bg-dark-800'
                      }`}
                    >
                      {index + 1}
                      {isFlagged && (
                        <Flag className="absolute -top-1 -right-1 w-3 h-3 text-red-500 fill-red-500" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-brand-500" />
                  <span className="text-surface-600 dark:text-dark-300">当前题目</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30" />
                  <span className="text-surface-600 dark:text-dark-300">已作答</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-surface-100 dark:bg-dark-850" />
                  <span className="text-surface-600 dark:text-dark-300">未作答</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-red-500 fill-red-500" />
                  <span className="text-surface-600 dark:text-dark-300">已标记</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 提交确认弹窗 */}
      <AnimatePresence>
        {state.showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setState(prev => ({ ...prev, showSubmitConfirm: false }))}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-800 rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-surface-900 dark:text-dark-50 mb-2">
                  确认提交试卷？
                </h3>
                <p className="text-surface-600 dark:text-dark-300">
                  还有 <span className="font-semibold text-surface-900 dark:text-dark-50">
                    {state.questions.length - answeredCount}
                  </span> 道题未作答
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setState(prev => ({ ...prev, showSubmitConfirm: false }))}
                >
                  继续答题
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleSubmit}
                >
                  确认提交
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamPage;
