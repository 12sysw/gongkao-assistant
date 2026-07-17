import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Search, Plus, Folder, FileText, TrendingUp, CheckCircle2 } from 'lucide-react';
import { PageContainer, PageHeader, PageSection, EmptyState } from '../components/ui/PageLayout';
import { ListItemCard, StatCardModern } from '../components/ui/DataDisplay';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge, Tag } from '../components/ui/Badge';

const CATEGORIES = [
  { value: 'all', label: '全部', count: 2450 },
  { value: '言语理解', label: '言语理解', count: 650 },
  { value: '数量关系', label: '数量关系', count: 400 },
  { value: '判断推理', label: '判断推理', count: 700 },
  { value: '资料分析', label: '资料分析', count: 500 },
  { value: '常识判断', label: '常识判断', count: 200 },
];

const QuestionBank: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = {
    total: 2450,
    completed: 1230,
    accuracy: 78,
    inProgress: 245,
  };

  return (
    <PageContainer>
      <PageHeader
        title="题库管理"
        subtitle="海量题目，分类练习"
        icon={<Database className="w-7 h-7" />}
        badge={<Badge variant="primary" size="lg">{stats.completed} 已完成</Badge>}
        actions={<Button icon={<Plus />}>导入题目</Button>}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCardModern
          label="总题目数"
          value={stats.total}
          icon={<Database className="w-5 h-5" />}
          gradient="from-purple-500 to-indigo-500"
        />
        <StatCardModern
          label="已完成"
          value={stats.completed}
          icon={<CheckCircle2 className="w-5 h-5" />}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCardModern
          label="正确率"
          value={`${stats.accuracy}%`}
          change={5}
          icon={<TrendingUp className="w-5 h-5" />}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCardModern
          label="进行中"
          value={stats.inProgress}
          icon={<FileText className="w-5 h-5" />}
          gradient="from-orange-500 to-pink-500"
        />
      </div>

      {/* 搜索和筛选 */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <Card variant="elevated">
          <CardContent className="p-5 space-y-4">
            <Input
              placeholder="搜索题目..."
              icon={<Search />}
              clearable
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
            />
            <div className="flex items-center gap-2 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <Tag
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'primary' : 'default'}
                  selected={selectedCategory === cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.label} ({cat.count})
                </Tag>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 题目分类 */}
      <PageSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.filter(c => c.value !== 'all').map((category, index) => (
            <motion.div
              key={category.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="elevated" hover="lift" className="cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-brand-100 dark:bg-brand-950">
                      <Folder className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    </div>
                    <Badge variant="outline">{category.count}题</Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-dark-50 mb-2">
                    {category.label}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-surface-600 dark:text-dark-300">完成进度</span>
                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                        {Math.round(Math.random() * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-surface-100 dark:bg-dark-850 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round(Math.random() * 100)}%` }}
                        transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                        className="h-full bg-gradient-to-r from-brand-500 to-brand-600"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </PageSection>
    </PageContainer>
  );
};

export default QuestionBank;
