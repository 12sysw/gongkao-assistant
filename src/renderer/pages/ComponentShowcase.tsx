import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge, Tag } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import {
  Save,
  Trash2,
  Search,
  User,
  Mail,
  Lock,
  Download,
  Upload,
  Eye,
  Star,
  Heart,
} from 'lucide-react';

const ComponentShowcase: React.FC = () => {
  const { success, error, info, warning } = useToast();
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleToastDemo = () => {
    success('操作成功', '这是一条成功提示消息');
    setTimeout(() => info('提示信息', '这是一条普通提示'), 500);
    setTimeout(() => warning('警告', '这是一条警告消息'), 1000);
  };

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-surface-0 dark:bg-dark-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-surface-900 dark:text-dark-50 font-display">
            组件展示页面
          </h1>
          <p className="text-surface-600 dark:text-dark-300">
            Phase 1 Week 1 升级成果预览
          </p>
        </div>

        {/* Cards */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-surface-900 dark:text-dark-50 font-display">
            Card 组件
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="default" hover="lift">
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <Badge variant="default">默认</Badge>
              </CardHeader>
              <CardContent>
                这是一个默认样式的卡片，带有 lift hover 效果。
              </CardContent>
            </Card>

            <Card variant="elevated" hover="glow">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
                <Badge variant="primary" dot>主要</Badge>
              </CardHeader>
              <CardContent>
                这是一个 elevated 卡片，带有 glow hover 效果。
              </CardContent>
            </Card>

            <Card variant="outlined" hover="border">
              <CardHeader>
                <CardTitle>Outlined Card</CardTitle>
                <Badge variant="success">成功</Badge>
              </CardHeader>
              <CardContent>
                这是一个 outlined 卡片，带有 border hover 效果。
              </CardContent>
            </Card>

            <Card variant="filled" hover="lift">
              <CardHeader>
                <CardTitle>Filled Card</CardTitle>
                <Badge variant="warning">警告</Badge>
              </CardHeader>
              <CardContent>
                这是一个 filled 填充背景的卡片。
              </CardContent>
            </Card>

            <Card variant="glass" hover="lift">
              <CardHeader>
                <CardTitle>Glass Card</CardTitle>
                <Badge variant="info">信息</Badge>
              </CardHeader>
              <CardContent>
                这是一个毛玻璃效果的卡片。
              </CardContent>
            </Card>

            <Card variant="elevated" hover="lift" animated>
              <CardHeader>
                <CardTitle>Animated Card</CardTitle>
                <Badge variant="danger">危险</Badge>
              </CardHeader>
              <CardContent>
                这是一个带进入动画的卡片。
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">查看详情</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-surface-900 dark:text-dark-50 font-display">
            Button 组件
          </h2>

          <Card variant="elevated">
            <CardContent className="space-y-6">
              {/* Variants */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-dark-200">
                  变体（Variants）
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="outline">Outline</Button>
                </div>
              </div>

              {/* Sizes */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-dark-200">
                  尺寸（Sizes）
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Extra Small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </div>
              </div>

              {/* With Icons */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-dark-200">
                  带图标（With Icons）
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Button icon={<Save />}>保存</Button>
                  <Button icon={<Download />} variant="secondary">
                    下载
                  </Button>
                  <Button icon={<Upload />} iconPosition="right" variant="outline">
                    上传
                  </Button>
                  <Button icon={<Trash2 />} variant="danger">
                    删除
                  </Button>
                </div>
              </div>

              {/* States */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-dark-200">
                  状态（States）
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Button loading={loading} onClick={handleLoadingDemo}>
                    {loading ? '加载中...' : '点击加载'}
                  </Button>
                  <Button disabled>禁用状态</Button>
                  <Button ripple={false}>无水波纹</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Inputs */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-surface-900 dark:text-dark-50 font-display">
            Input 组件
          </h2>

          <Card variant="elevated">
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="普通输入" placeholder="请输入..." />

                <Input
                  label="带图标"
                  icon={<Search />}
                  placeholder="搜索..."
                />

                <Input
                  floatingLabel
                  label="浮动标签"
                  placeholder="输入时标签上浮"
                />

                <Input
                  label="可清除"
                  clearable
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onClear={() => setInputValue('')}
                  placeholder="输入后显示清除按钮"
                />

                <Input
                  label="用户名"
                  icon={<User />}
                  clearable
                  placeholder="请输入用户名"
                />

                <Input
                  label="邮箱"
                  type="email"
                  icon={<Mail />}
                  helperText="我们不会分享您的邮箱"
                />

                <Input
                  label="密码"
                  type="password"
                  icon={<Lock />}
                  helperText="至少8位字符"
                />

                <Input
                  label="错误状态"
                  error="此字段为必填项"
                  placeholder="输入错误"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Badges & Tags */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-surface-900 dark:text-dark-50 font-display">
            Badge & Tag 组件
          </h2>

          <Card variant="elevated">
            <CardContent className="space-y-6">
              {/* Badges */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-dark-200">
                  Badge 徽章
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="danger">Danger</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="success" dot>带状态点</Badge>
                  <Badge variant="primary" size="sm">小尺寸</Badge>
                  <Badge variant="info" size="lg">大尺寸</Badge>
                  <Badge variant="danger" removable onRemove={() => {}}>
                    可移除
                  </Badge>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-dark-200">
                  Tag 标签
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Tag variant="default">Default</Tag>
                  <Tag variant="primary">Primary</Tag>
                  <Tag variant="success">Success</Tag>
                  <Tag variant="warning">Warning</Tag>
                  <Tag variant="danger">Danger</Tag>
                  <Tag variant="info">Info</Tag>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Tag variant="primary" selected>已选中</Tag>
                  <Tag variant="success" onRemove={() => {}}>
                    可移除
                  </Tag>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Toast Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-surface-900 dark:text-dark-50 font-display">
            Toast 通知
          </h2>

          <Card variant="elevated">
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleToastDemo}>
                  显示多个通知
                </Button>
                <Button
                  variant="success"
                  onClick={() => success('成功', '操作已完成')}
                >
                  成功通知
                </Button>
                <Button
                  variant="danger"
                  onClick={() => error('错误', '操作失败，请重试')}
                >
                  错误通知
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => info('提示', '这是一条提示信息')}
                >
                  信息通知
                </Button>
                <Button
                  variant="outline"
                  onClick={() => warning('警告', '请注意此操作')}
                >
                  警告通知
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Color Palette */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-surface-900 dark:text-dark-50 font-display">
            色彩系统
          </h2>

          <Card variant="elevated">
            <CardContent className="space-y-6">
              {/* Brand Colors */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-dark-200">
                  Brand 品牌色
                </h3>
                <div className="grid grid-cols-10 gap-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div key={shade} className="space-y-1">
                      <div
                        className={`h-12 rounded-lg bg-brand-${shade} border border-surface-200 dark:border-white/10`}
                      />
                      <p className="text-xs text-center text-surface-600 dark:text-dark-400">
                        {shade}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Semantic Colors */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-dark-200">
                  语义化颜色
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="h-16 rounded-lg bg-success-500" />
                    <p className="text-sm font-medium text-center">Success</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-16 rounded-lg bg-warning-500" />
                    <p className="text-sm font-medium text-center">Warning</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-16 rounded-lg bg-danger-500" />
                    <p className="text-sm font-medium text-center">Danger</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-16 rounded-lg bg-info-500" />
                    <p className="text-sm font-medium text-center">Info</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="text-center py-8 text-surface-500 dark:text-dark-400 text-sm">
          <p>Phase 1 Week 1 升级完成 - 2026-06-14</p>
          <p className="mt-1">下一步：仪表盘重设计（Day 4-5）</p>
        </div>
      </div>
    </div>
  );
};

export default ComponentShowcase;
