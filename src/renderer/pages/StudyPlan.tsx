import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  X,
  Play,
} from 'lucide-react';
import dayjs from 'dayjs';

interface StudyPlanItem {
  id: number;
  title: string;
  subject: string;
  target_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  daily_minutes: number;
  created_at: string;
  updated_at: string;
}

interface DailyRecordItem {
  id: number;
  date: string;
  study_minutes: number;
  questions_done: number;
  wrong_count: number;
  note: string;
}

const SUBJECTS = ['行测-言语理解', '行测-数量关系', '行测-判断推理', '行测-资料分析', '行测-常识判断', '申论', '面试', '综合'];

const priorityConfig = {
  high: { label: '高优先', color: 'bg-red-100 text-red-700' },
  medium: { label: '中优先', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: '低优先', color: 'bg-green-100 text-green-700' },
};

const statusConfig = {
  pending: { label: '待开始', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: '进行中', icon: Play, color: 'text-blue-500' },
  completed: { label: '已完成', icon: CheckCircle2, color: 'text-green-500' },
};

const StudyPlan: React.FC = () => {
  const [plans, setPlans] = useState<StudyPlanItem[]>([]);
  const [todayRecord, setTodayRecord] = useState<DailyRecordItem | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showLogStudy, setShowLogStudy] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '',
    subject: '行测-言语理解',
    target_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    priority: 'medium' as const,
    description: '',
    daily_minutes: 60,
  });
  const [logForm, setLogForm] = useState({
    study_minutes: 60,
    questions_done: 0,
    wrong_count: 0,
    note: '',
  });
  const [weeklyData, setWeeklyData] = useState<DailyRecordItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const api = (window as any).api;
      if (!api) return;
      const [plansData, today, weekly] = await Promise.all([
        api.studyPlan.getAll(),
        api.dailyRecord.getByDate(dayjs().format('YYYY-MM-DD')),
        api.dailyRecord.getRange(
          dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
          dayjs().format('YYYY-MM-DD')
        ),
      ]);
      setPlans(plansData || []);
      setTodayRecord(today);
      setWeeklyData(weekly || []);
    } catch (e) {
      console.error('加载数据失败', e);
    }
  }

  async function handleAddPlan() {
    try {
      const api = (window as any).api;
      if (!api) return;
      await api.studyPlan.add(newPlan);
      setShowAddPlan(false);
      setNewPlan({
        title: '',
        subject: '行测-言语理解',
        target_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        priority: 'medium',
        description: '',
        daily_minutes: 60,
      });
      loadData();
    } catch (e) {
      console.error('添加计划失败', e);
    }
  }

  async function handleUpdateStatus(plan: StudyPlanItem, status: StudyPlanItem['status']) {
    try {
      const api = (window as any).api;
      if (!api) return;
      await api.studyPlan.update({ ...plan, status });
      loadData();
    } catch (e) {
      console.error('更新状态失败', e);
    }
  }

  async function handleDeletePlan(id: number) {
    if (!confirm('确定要删除这个计划吗？')) return;
    try {
      const api = (window as any).api;
      if (!api) return;
      await api.studyPlan.delete(id);
      loadData();
    } catch (e) {
      console.error('删除计划失败', e);
    }
  }

  async function handleLogStudy() {
    try {
      const api = (window as any).api;
      if (!api) return;
      await api.dailyRecord.add({
        date: dayjs().format('YYYY-MM-DD'),
        ...logForm,
      });
      setShowLogStudy(false);
      setLogForm({ study_minutes: 60, questions_done: 0, wrong_count: 0, note: '' });
      loadData();
    } catch (e) {
      console.error('记录学习失败', e);
    }
  }

  const todayMinutes = todayRecord?.study_minutes || 0;
  const todayQuestions = todayRecord?.questions_done || 0;
  const totalWeeklyMinutes = weeklyData.reduce((sum, r) => sum + r.study_minutes, 0);

  // 生成日历热力图数据（近30天）
  const heatmapDays = Array.from({ length: 30 }, (_, i) => {
    const date = dayjs().subtract(29 - i, 'day').format('YYYY-MM-DD');
    const record = weeklyData.find(r => r.date === date);
    return { date, minutes: record?.study_minutes || 0 };
  });

  const heatmapColors = ['bg-gray-100', 'bg-green-200', 'bg-green-300', 'bg-green-500', 'bg-green-700'];

  return (
    <div className="p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">学习计划</h1>
          <p className="text-sm text-gray-500 mt-1">规划目标，追踪进度，养成习惯</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogStudy(true)}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
          >
            <Clock className="w-4 h-4 mr-1" />
            记录学习
          </button>
          <button
            onClick={() => setShowAddPlan(true)}
            className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            新建计划
          </button>
        </div>
      </div>

      {/* 今日学习概览 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">今日学习时长</p>
          <p className="text-2xl font-bold text-gray-800">{todayMinutes}<span className="text-sm font-normal text-gray-400 ml-1">分钟</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">今日刷题数量</p>
          <p className="text-2xl font-bold text-gray-800">{todayQuestions}<span className="text-sm font-normal text-gray-400 ml-1">道</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">本周学习时长</p>
          <p className="text-2xl font-bold text-gray-800">{totalWeeklyMinutes}<span className="text-sm font-normal text-gray-400 ml-1">分钟</span></p>
        </div>
      </div>

      {/* 学习热力图 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">近30天学习热力图</h2>
        <div className="flex gap-1 flex-wrap">
          {heatmapDays.map(d => {
            const intensity = d.minutes === 0 ? 0 : d.minutes < 30 ? 1 : d.minutes < 60 ? 2 : d.minutes < 120 ? 3 : 4;
            return (
              <div
                key={d.date}
                className={`w-5 h-5 rounded-sm ${heatmapColors[intensity]} cursor-pointer`}
                title={`${d.date}: ${d.minutes}分钟`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
          <span>少</span>
          {heatmapColors.map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span>多</span>
        </div>
      </div>

      {/* 计划列表 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">我的计划</h2>
        </div>
        {plans.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>暂无学习计划</p>
            <p className="text-xs mt-1">创建一个计划，开始你的备考之旅！</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {plans.map(plan => {
              const StatusIcon = statusConfig[plan.status].icon;
              const daysLeft = dayjs(plan.target_date).diff(dayjs(), 'day');
              const isOverdue = daysLeft < 0 && plan.status !== 'completed';

              return (
                <div key={plan.id} className="px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => {
                      const nextStatus = plan.status === 'pending' ? 'in_progress' : plan.status === 'in_progress' ? 'completed' : 'pending';
                      handleUpdateStatus(plan, nextStatus);
                    }}
                    className={`mt-0.5 ${statusConfig[plan.status].color}`}
                  >
                    <StatusIcon className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${plan.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {plan.title}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig[plan.priority].color}`}>
                        {priorityConfig[plan.priority].label}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary-50 text-primary-700">
                        {plan.subject.split('-').pop()}
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{plan.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        截止：{plan.target_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        每日{plan.daily_minutes}分钟
                      </span>
                      {isOverdue && (
                        <span className="flex items-center gap-1 text-red-500">
                          <AlertCircle className="w-3 h-3" />
                          已逾期{Math.abs(daysLeft)}天
                        </span>
                      )}
                      {!isOverdue && plan.status !== 'completed' && (
                        <span>剩余{daysLeft}天</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 添加计划弹窗 */}
      {showAddPlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">新建学习计划</h2>
              <button onClick={() => setShowAddPlan(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">计划名称</label>
                <input
                  value={newPlan.title}
                  onChange={e => setNewPlan({ ...newPlan, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  placeholder="如：言语理解专项突破"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">科目</label>
                  <select
                    value={newPlan.subject}
                    onChange={e => setNewPlan({ ...newPlan, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                  <input
                    type="date"
                    value={newPlan.target_date}
                    onChange={e => setNewPlan({ ...newPlan, target_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                  <select
                    value={newPlan.priority}
                    onChange={e => setNewPlan({ ...newPlan, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">每日时长(分钟)</label>
                  <input
                    type="number"
                    value={newPlan.daily_minutes}
                    onChange={e => setNewPlan({ ...newPlan, daily_minutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                    min={10}
                    max={480}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newPlan.description}
                  onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  rows={2}
                  placeholder="计划的详细内容..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowAddPlan(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
                <button
                  onClick={handleAddPlan}
                  disabled={!newPlan.title}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 记录学习弹窗 */}
      {showLogStudy && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">记录今日学习</h2>
              <button onClick={() => setShowLogStudy(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学习时长（分钟）</label>
                <input
                  type="number"
                  value={logForm.study_minutes}
                  onChange={e => setLogForm({ ...logForm, study_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  min={1}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">做题数量</label>
                  <input
                    type="number"
                    value={logForm.questions_done}
                    onChange={e => setLogForm({ ...logForm, questions_done: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">错题数量</label>
                  <input
                    type="number"
                    value={logForm.wrong_count}
                    onChange={e => setLogForm({ ...logForm, wrong_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学习笔记</label>
                <textarea
                  value={logForm.note}
                  onChange={e => setLogForm({ ...logForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  rows={2}
                  placeholder="今天学了什么？有什么心得？"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowLogStudy(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
                <button
                  onClick={handleLogStudy}
                  disabled={logForm.study_minutes <= 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  记录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



export default StudyPlan;
