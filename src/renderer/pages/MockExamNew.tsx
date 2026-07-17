import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Play, Clock, Target, TrendingUp, CheckCircle2, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { PageContainer, PageHeader, PageSection } from '../components/ui/PageLayout';
import { StatCardModern } from '../components/ui/DataDisplay';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

// 模拟数据
const MOCK_PAPERS = [
  {
    id: 1,
    title: '2025年国考行测真题',
    questions: 135,
    time: 120,
    completed: true,
    score: 128,
    date: '2025-12-01'
  },
  {
    id: 2,
    title: '2024年国考行测真题',
    questions: 135,
    time: 120,
    completed: true,
    score: 132,
    date: '2024-12-01'
  },
  {
    id: 3,
    title: '2023年国考行测真题',
    questions: 130,
    time: 120,
    completed: false
  },
  {
    id: 4,
    title: '国考模拟卷（一）',
    questions: 135,
    time: 120,
    completed: false
  },
  {
    id: 5,
    title: '国考模拟卷（二）',
    questions: 135,
    time: 120,
    completed: false
  },
  {
    id: 6,
    title: '行测专项：言语理解',
    questions: 40,
    time: 30,
    completed: false
  },
  {
    id: 7,
    title: '行测专项：数量关系',
    questions: 15,
    time: 15,
    completed: false
  },
  {
    id: 8,
    title: '行测专项：判断推理',
    questions: 40,
    time: 35,
    completed: false
  },
];

const MockExam: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const stats = {
    total: MOCK_PAPERS.length,
    completed: MOCK_PAPERS.filter(p => p.completed).length,
    avgScore: 130,
    bestScore: 132,
  };

  const handleStartExam = useCallback((paperId: number) => {
    const paper = MOCK_PAPERS.find(p => p.id === paperId);
    if (!paper) return;

    setIsLoading(true);

    // 根据套题类型确定考试参数
    let examType = 'full';
    if (paper.title.includes('言语理解')) {
      examType = '言语理解';
    } else if (paper.title.includes('数量关系')) {
      examType = '数量关系';
    } else if (paper.title.includes('判断推理')) {
      examType = '判断推理';
    } else if (paper.title.includes('资料分析')) {
      examType = '资料分析';
    } else if (paper.title.includes('常识判断')) {
      examType = '常识判断';
    }

    // 模拟加载延迟
    setTimeout(() => {
      setIsLoading(false);
      // 跳转到答题页面
      navigate(`/exam?type=${examType}`);
    }, 300);
  }, [navigate]);

  return (
    <PageContainer>
      <PageHeader
        title="套题测评"
        subtitle="真实模拟，检验实力"
        icon={<FileText className="w-7 h-7" />}
        badge={<Badge variant="primary" size="lg">{stats.completed}/{stats.total} 已完成</Badge>}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCardModern
          label="套题总数"
          value={stats.total}
          icon={<FileText className="w-5 h-5" />}
          gradient="from-purple-500 to-indigo-500"
        />
        <StatCardModern
          label="已完成"
          value={stats.completed}
          icon={<CheckCircle2 className="w-5 h-5" />}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCardModern
          label="平均分"
          value={stats.avgScore}
          icon={<Target className="w-5 h-5" />}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCardModern
          label="最高分"
          value={stats.bestScore}
          change={8}
          icon={<TrendingUp className="w-5 h-5" />}
          gradient="from-orange-500 to-pink-500"
        />
      </div>

      {/* 套题列表 */}
      <PageSection title="国考套题" description="历年真题和模拟题">
        <div className="space-y-3">
          {MOCK_PAPERS.map((exam, index) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card variant="elevated" hover="lift" className="cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-surface-900 dark:text-dark-50">
                          {exam.title}
                        </h3>
                        {exam.completed ? (
                          <Badge variant="success" size="sm">
                            已完成 · {exam.score}分
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm">
                            未开始
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-surface-600 dark:text-dark-300">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {exam.questions} 道题
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {exam.time} 分钟
                        </span>
                        {exam.date && (
                          <span className="text-xs text-surface-500 dark:text-dark-400">
                            {exam.date}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={exam.completed ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleStartExam(exam.id)}
                      disabled={isLoading}
                      icon={exam.completed ? <RefreshCw /> : <Play />}
                    >
                      {exam.completed ? '重新考试' : '开始考试'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </PageSection>

      {/* 答题建议 */}
      <PageSection title="答题建议" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: '时间分配',
              content: '言语25min，数量15min，判断35min，资料30min，常识15min',
              icon: Clock,
              color: 'from-blue-500 to-cyan-500'
            },
            {
              title: '答题顺序',
              content: '建议先做资料分析和判断推理，最后做数量关系',
              icon: Target,
              color: 'from-purple-500 to-indigo-500'
            },
            {
              title: '检查策略',
              content: '预留10分钟检查，重点检查填涂是否正确',
              icon: CheckCircle2,
              color: 'from-green-500 to-emerald-500'
            },
          ].map((tip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <Card variant="elevated" hover="lift" className={`bg-gradient-to-br ${tip.color} overflow-hidden relative`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <CardContent className="p-6 relative">
                  <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm w-fit mb-4">
                    <tip.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{tip.title}</h3>
                  <p className="text-sm text-white/90 leading-relaxed">{tip.content}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </PageSection>
    </PageContainer>
  );
};

export default MockExam;
