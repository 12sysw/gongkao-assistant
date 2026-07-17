import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Clock, TrendingUp, Home, RotateCcw, ChevronRight, Sparkles, Loader } from 'lucide-react';
import { PageContainer } from '../components/ui/PageLayout';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useRagConfig } from '../hooks/use-api';

const ExamResult: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: ragConfig } = useRagConfig();

  const score = parseInt(searchParams.get('score') || '0');
  const total = parseInt(searchParams.get('total') || '0');
  const accuracy = parseFloat(searchParams.get('accuracy') || '0');
  const examType = searchParams.get('type') || 'full';
  const timeUsed = parseInt(searchParams.get('time') || '0'); // 可选：实际用时

  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // AI 分析
  useEffect(() => {
    if (showAI && !aiAnalysis && !isAnalyzing) {
      analyzeWithAI();
    }
  }, [showAI]);

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);

    // 获取 AI 配置
    let config: { apiUrl: string; apiKey: string; model: string } | null = null;

    try {
      if (ragConfig?.llmApiUrl && ragConfig?.llmApiKey) {
        const baseUrl = ragConfig.llmApiUrl.replace(/\/+$/, '');
        config = {
          apiUrl: `${baseUrl}/chat/completions`,
          apiKey: ragConfig.llmApiKey,
          model: ragConfig.llmModel || 'deepseek-chat',
        };
      }
    } catch {}

    if (!config) {
      const savedConfig = localStorage.getItem('ai_config');
      if (!savedConfig) {
        setAiAnalysis('⚠️ 未配置 AI，请先在设置中配置 AI API');
        setIsAnalyzing(false);
        return;
      }
      const parsed = JSON.parse(savedConfig);
      if (!parsed.apiKey || !parsed.apiUrl) {
        setAiAnalysis('⚠️ AI 配置不完整，请检查设置');
        setIsAnalyzing(false);
        return;
      }
      config = { apiUrl: parsed.apiUrl, apiKey: parsed.apiKey, model: parsed.model || 'deepseek-chat' };
    }

    const wrongCount = total - score;
    const prompt = `你是公务员考试资深辅导老师，擅长通过答题数据分析考生的薄弱环节并给出精准建议。

答题概况：
- 考试类型：${examType === 'full' ? '国考全卷' : examType}
- 题目总数：${total}
- 答对：${score}
- 答错：${wrongCount}
- 正确率：${accuracy}%

请按以下结构输出（不要使用markdown标记）：

【整体评分】
用一段话给出整体表现评价和预估分数区间

【薄弱环节分析】
分析可能的失分原因和需要复习的知识点

【提分建议】
给出3-5条可立即执行的复习建议

【备考策略】
根据当前水平给出后续备考方向`;

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          stream: true
        }),
      });

      if (!response.ok) {
        setAiAnalysis('❌ AI 分析失败，请检查 API 配置');
        setIsAnalyzing(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setAiAnalysis('❌ 无法读取响应流');
        setIsAnalyzing(false);
        return;
      }

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
                setAiAnalysis(fullText);
              }
            } catch (e) {
              // 忽略JSON解析错误
            }
          }
        }
      }

      setIsAnalyzing(false);
    } catch (error) {
      setAiAnalysis('❌ AI 分析出错，请稍后重试');
      setIsAnalyzing(false);
    }
  };

  const getGrade = () => {
    if (accuracy >= 90) return { text: '优秀', color: 'from-green-500 to-emerald-500', emoji: '🎉' };
    if (accuracy >= 80) return { text: '良好', color: 'from-blue-500 to-cyan-500', emoji: '👍' };
    if (accuracy >= 70) return { text: '中等', color: 'from-yellow-500 to-orange-500', emoji: '💪' };
    if (accuracy >= 60) return { text: '及格', color: 'from-orange-500 to-red-500', emoji: '✊' };
    return { text: '需努力', color: 'from-red-500 to-pink-500', emoji: '📚' };
  };

  const grade = getGrade();

  const suggestions = [
    {
      title: '继续练习',
      desc: '熟能生巧，多做题目才能提高',
      action: () => navigate('/mock-exam'),
      icon: RotateCcw,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: '查看错题',
      desc: '复习错题，巩固薄弱知识点',
      action: () => navigate('/wrong-book'),
      icon: Target,
      color: 'from-purple-500 to-indigo-500'
    },
    {
      title: '学习计划',
      desc: '制定学习计划，系统提升',
      action: () => navigate('/study-plan'),
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500'
    },
  ];

  return (
    <PageContainer maxWidth="lg">
      <div className="min-h-[80vh] flex flex-col items-center justify-center py-12">
        {/* 成绩卡片 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="w-full max-w-2xl mb-8"
        >
          <Card variant="elevated" className={`bg-gradient-to-br ${grade.color} overflow-hidden relative`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <CardContent className="p-12 relative text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-8xl mb-4"
              >
                {grade.emoji}
              </motion.div>

              <h1 className="text-4xl font-bold text-white mb-2">
                {grade.text}
              </h1>

              <p className="text-white/90 text-lg mb-8">
                {examType === 'full' ? '国考全卷' : examType} · 测评完成
              </p>

              <div className="flex items-center justify-center gap-8 mb-8">
                <div>
                  <div className="text-6xl font-bold text-white mb-2">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {score}
                    </motion.span>
                    <span className="text-3xl text-white/70">/{total}</span>
                  </div>
                  <p className="text-white/80 text-sm">答对题数</p>
                </div>

                <div className="h-16 w-px bg-white/30" />

                <div>
                  <div className="text-6xl font-bold text-white mb-2">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      {accuracy}
                    </motion.span>
                    <span className="text-3xl text-white/70">%</span>
                  </div>
                  <p className="text-white/80 text-sm">正确率</p>
                </div>
              </div>

              {/* 进度条 */}
              <div className="w-full max-w-md mx-auto">
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${accuracy}%` }}
                    transition={{ delay: 0.9, duration: 1, ease: 'easeOut' }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 详细统计 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="w-full max-w-2xl mb-8"
        >
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: '答对',
                value: score,
                icon: Trophy,
                color: 'text-green-500',
                bg: 'bg-green-50 dark:bg-green-900/20'
              },
              {
                label: '答错',
                value: total - score,
                icon: Target,
                color: 'text-red-500',
                bg: 'bg-red-50 dark:bg-red-900/20'
              },
              {
                label: '总题数',
                value: total,
                icon: Clock,
                color: 'text-blue-500',
                bg: 'bg-blue-50 dark:bg-blue-900/20'
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.2 + i * 0.1 }}
              >
                <Card variant="elevated" hover="lift">
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-3`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="text-3xl font-bold text-surface-900 dark:text-dark-50 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-surface-500 dark:text-dark-400">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* AI 分析 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="w-full max-w-2xl mb-8"
        >
          {!showAI ? (
            <Card variant="elevated" hover="lift" className="cursor-pointer" onClick={() => setShowAI(true)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900 dark:text-dark-50 mb-1">
                        AI 智能分析
                      </h3>
                      <p className="text-sm text-surface-600 dark:text-dark-300">
                        点击获取个性化学习建议
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-surface-400 dark:text-dark-500" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-surface-900 dark:text-dark-50">
                    AI 智能分析
                  </h3>
                </div>

                {isAnalyzing && !aiAnalysis ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-8 h-8 text-brand-500 animate-spin" />
                    <span className="ml-3 text-surface-600 dark:text-dark-300">
                      AI 正在分析中...
                    </span>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-surface-700 dark:text-dark-200 whitespace-pre-wrap leading-relaxed">
                      {aiAnalysis || '加载中...'}
                    </div>
                  </div>
                )}

                {aiAnalysis && !isAnalyzing && (
                  <div className="mt-4 pt-4 border-t border-surface-200 dark:border-dark-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAiAnalysis('');
                        setShowAI(false);
                      }}
                    >
                      收起分析
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* 建议卡片 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="w-full max-w-2xl"
        >
          <h3 className="text-lg font-semibold text-surface-900 dark:text-dark-50 mb-4">
            接下来做什么？
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestions.map((item, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.6 + i * 0.1 }}
              >
                <Card
                  variant="elevated"
                  hover="lift"
                  className="cursor-pointer h-full"
                  onClick={item.action}
                >
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-surface-900 dark:text-dark-50 mb-2">
                      {item.title}
                    </h4>
                    <p className="text-sm text-surface-600 dark:text-dark-300 mb-4">
                      {item.desc}
                    </p>
                    <ChevronRight className="w-5 h-5 text-surface-400 dark:text-dark-500" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 底部按钮 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.9 }}
          className="flex gap-4 mt-8"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/')}
            icon={<Home />}
          >
            返回首页
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/mock-exam')}
            icon={<RotateCcw />}
          >
            再来一次
          </Button>
        </motion.div>
      </div>
    </PageContainer>
  );
};

export default ExamResult;
