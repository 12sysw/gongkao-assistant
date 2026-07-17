import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, ZoomIn, ZoomOut, Maximize2, RefreshCw, Download, Filter } from 'lucide-react';
import { PageContainer, PageHeader } from '../components/ui/PageLayout';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, Tag } from '../components/ui/Badge';
import { cn } from '../lib/utils';

const KNOWLEDGE_TYPES = [
  { value: 'all', label: '全部', color: 'primary' },
  { value: '言语', label: '言语理解', color: 'info' },
  { value: '数量', label: '数量关系', color: 'warning' },
  { value: '判断', label: '判断推理', color: 'success' },
  { value: '资料', label: '资料分析', color: 'danger' },
];

const KnowledgeGraph: React.FC = () => {
  const [selectedType, setSelectedType] = useState('all');
  const [zoom, setZoom] = useState(100);

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="知识图谱"
        subtitle="可视化知识结构"
        icon={<Network className="w-7 h-7" />}
        badge={<Badge variant="primary" size="lg">128 个知识点</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧控制面板 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 类型筛选 */}
          <Card variant="elevated">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-dark-50 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                类型筛选
              </h3>
              <div className="space-y-2">
                {KNOWLEDGE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm',
                      selectedType === type.value
                        ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400'
                        : 'hover:bg-surface-50 dark:hover:bg-dark-850 text-surface-700 dark:text-dark-200'
                    )}
                  >
                    <span>{type.label}</span>
                    {selectedType === type.value && (
                      <Badge variant={type.color as any} size="sm">
                        {Math.floor(Math.random() * 30 + 10)}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 视图控制 */}
          <Card variant="elevated">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-dark-50 mb-3">
                视图控制
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-600 dark:text-dark-300">缩放</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-semibold w-12 text-center">{zoom}%</span>
                    <Button size="sm" variant="outline" onClick={() => setZoom(Math.min(200, zoom + 10))}>
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button size="sm" variant="outline" fullWidth icon={<Maximize2 />}>
                  适应屏幕
                </Button>
                <Button size="sm" variant="outline" fullWidth icon={<RefreshCw />}>
                  重新布局
                </Button>
                <Button size="sm" variant="secondary" fullWidth icon={<Download />}>
                  导出图片
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 统计信息 */}
          <Card variant="elevated">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-dark-50 mb-3">
                统计信息
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-600 dark:text-dark-300">知识点总数</span>
                  <span className="font-semibold text-surface-900 dark:text-dark-50">128</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-600 dark:text-dark-300">关联关系</span>
                  <span className="font-semibold text-surface-900 dark:text-dark-50">256</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-600 dark:text-dark-300">已掌握</span>
                  <span className="font-semibold text-success-600 dark:text-success-400">86</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-600 dark:text-dark-300">待学习</span>
                  <span className="font-semibold text-warning-600 dark:text-warning-400">42</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧图谱区域 */}
        <div className="lg:col-span-3">
          <Card variant="elevated" className="h-[calc(100vh-280px)]">
            <CardContent className="p-6 h-full">
              <div className="relative w-full h-full bg-surface-50 dark:bg-dark-900 rounded-xl overflow-hidden">
                {/* 占位符 - 实际项目中这里会是 D3.js 或其他图谱库 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Network className="w-16 h-16 mx-auto text-surface-300 dark:text-dark-600" />
                    <div>
                      <p className="text-lg font-semibold text-surface-900 dark:text-dark-50 mb-2">
                        知识图谱可视化
                      </p>
                      <p className="text-sm text-surface-600 dark:text-dark-300">
                        实际项目中这里会渲染交互式知识图谱
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {KNOWLEDGE_TYPES.filter(t => t.value !== 'all').map((type, i) => (
                        <motion.div
                          key={type.value}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className={cn(
                            'w-16 h-16 rounded-full flex items-center justify-center text-white text-xs font-semibold',
                            `bg-gradient-to-br`,
                            type.value === '言语' ? 'from-blue-500 to-cyan-500' :
                            type.value === '数量' ? 'from-orange-500 to-pink-500' :
                            type.value === '判断' ? 'from-green-500 to-emerald-500' :
                            'from-red-500 to-pink-500'
                          )}
                        >
                          {type.label}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default KnowledgeGraph;
