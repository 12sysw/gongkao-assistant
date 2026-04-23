import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

interface PlanForm {
  title: string;
  subject: string;
  target_date: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  daily_minutes: number;
}

interface LogForm {
  study_minutes: number;
  questions_done: number;
  wrong_count: number;
  note: string;
}

const SUBJECTS = ['行测-言语理解', '行测-数量关系', '行测-判断推理', '行测-资料分析', '行测-常识判断', '申论', '面试', '综合'];

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: '高优先', color: 'bg-red-100 text-red-700' },
  medium: { label: '中优先', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: '低优先', color: 'bg-green-100 text-green-700' },
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: '待开始', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: '进行中', icon: Play, color: 'text-blue-500' },
  completed: { label: '已完成', icon: CheckCircle2, color: 'text-green-500' },
};

const HEATMAP_COLORS = ['bg-gray-100', 'bg-green-200', 'bg-green-300', 'bg-green-500', 'bg-green-700'];

function getApi() {
  return (window as unknown as Window & { api: Record<string, unknown> }).api;
}

function getNextStatus(current: StudyPlanItem['status']): StudyPlanItem['status'] {
  if (current === 'pending') return 'in_progress';
  if (current === 'in_progress') return 'completed';
  return 'pending';
}

/* ─── Sub-components ─── */

const PageHeader: React.FC<{
  onLogStudy: () => void;
  onAddPlan: () => void;
}> = ({ onLogStudy, onAddPlan }) => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-xl font-bold text-gray-800">学习计划</h1>
      <p className="text-sm text-gray-500 mt-1">规划目标，追踪进度，养成习惯</p>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onLogStudy}
        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
      >
        <Clock className="w-4 h-4 mr-1" />
        记录学习
      </button>
      <button
        onClick={onAddPlan}
        className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm transition-colors"
      >
        <Plus className="w-4 h-4 mr-1" />
        新建计划
      </button>
    </div>
  </div>
);

const StatsCards: React.FC<{
  todayMinutes: number;
  todayQuestions: number;
  totalWeeklyMinutes: number;
}> = ({ todayMinutes, todayQuestions, totalWeeklyMinutes }) => (
  <div className="grid grid-cols-3 gap-4">
    <StatCard label="今日学习时长" value={`${todayMinutes}`} unit="分钟" />
    <StatCard label="今日刷题数量" value={`${todayQuestions}`} unit="道" />
    <StatCard label="本周学习时长" value={`${totalWeeklyMinutes}`} unit="分钟" />
  </div>
);

const StatCard: React.FC<{ label: string; value: string; unit: string }> = ({ label, value, unit }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className="text-2xl font-bold text-gray-800">
      {value}<span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
    </p>
  </div>
);

const Heatmap: React.FC<{
  days: { date: string; minutes: number }[];
}> = ({ days }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <h2 className="text-sm font-medium text-gray-700 mb-3">近30天学习热力图</h2>
    <div className="flex gap-1 flex-wrap">
      {days.map((d) => {
        const intensity = d.minutes === 0 ? 0 : d.minutes < 30 ? 1 : d.minutes < 60 ? 2 : d.minutes < 120 ? 3 : 4;
        return (
          <div
            key={d.date}
            className={`w-5 h-5 rounded-sm ${HEATMAP_COLORS[intensity]} cursor-pointer`}
            title={`${d.date}: ${d.minutes}分钟`}
          />
        );
      })}
    </div>
    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
      <span>少</span>
      {HEATMAP_COLORS.map((c, i) => (
        <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
      ))}
      <span>多</span>
    </div>
  </div>
);

const PlanList: React.FC<{
  plans: StudyPlanItem[];
  onStatusChange: (plan: StudyPlanItem) => void;
  onDelete: (id: number) => void;
}> = ({ plans, onStatusChange, onDelete }) => (
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
        {plans.map((plan) => (
          <PlanItem key={plan.id} plan={plan} onStatusChange={onStatusChange} onDelete={onDelete} />
        ))}
      </div>
    )}
  </div>
);

const PlanItem: React.FC<{
  plan: StudyPlanItem;
  onStatusChange: (plan: StudyPlanItem) => void;
  onDelete: (id: number) => void;
}> = ({ plan, onStatusChange, onDelete }) => {
  const StatusIcon = statusConfig[plan.status].icon;
  const daysLeft = dayjs(plan.target_date).diff(dayjs(), 'day');
  const isOverdue = daysLeft < 0 && plan.status !== 'completed';

  return (
    <div className="px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
      <button
        onClick={() => onStatusChange(plan)}
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
        onClick={() => onDelete(plan.id)}
        className="text-gray-300 hover:text-red-500 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

const AddPlanModal: React.FC<{
  show: boolean;
  form: PlanForm;
  onClose: () => void;
  onChange: (form: PlanForm) => void;
  onSubmit: () => void;
}> = ({ show, form, onClose, onChange, onSubmit }) => {
  if (!show) return null;

  const update = <K extends keyof PlanForm>(key: K, value: PlanForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">新建学习计划</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">计划名称</label>
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
              placeholder="如：言语理解专项突破"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">科目</label>
              <select
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
              >
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
              <input
                type="date"
                value={form.target_date}
                onChange={(e) => update('target_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <select
                value={form.priority}
                onChange={(e) => update('priority', e.target.value as PlanForm['priority'])}
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
                value={form.daily_minutes}
                onChange={(e) => update('daily_minutes', parseInt(e.target.value) || 60)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                min={10}
                max={480}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
              rows={2}
              placeholder="计划的详细内容..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
            <button
              onClick={onSubmit}
              disabled={!form.title}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LogStudyModal: React.FC<{
  show: boolean;
  form: LogForm;
  onClose: () => void;
  onChange: (form: LogForm) => void;
  onSubmit: () => void;
}> = ({ show, form, onClose, onChange, onSubmit }) => {
  if (!show) return null;

  const update = <K extends keyof LogForm>(key: K, value: LogForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">记录今日学习</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学习时长（分钟）</label>
            <input
              type="number"
              value={form.study_minutes}
              onChange={(e) => update('study_minutes', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
              min={1}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">做题数量</label>
              <input
                type="number"
                value={form.questions_done}
                onChange={(e) => update('questions_done', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">错题数量</label>
              <input
                type="number"
                value={form.wrong_count}
                onChange={(e) => update('wrong_count', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学习笔记</label>
            <textarea
              value={form.note}
              onChange={(e) => update('note', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
              rows={2}
              placeholder="今天学了什么？有什么心得？"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
            <button
              onClick={onSubmit}
              disabled={form.study_minutes <= 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              记录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */

const StudyPlan: React.FC = () => {
  const [plans, setPlans] = useState<StudyPlanItem[]>([]);
  const [todayRecord, setTodayRecord] = useState<DailyRecordItem | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showLogStudy, setShowLogStudy] = useState(false);
  const [newPlan, setNewPlan] = useState<PlanForm>({
    title: '',
    subject: '行测-言语理解',
    target_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    priority: 'medium',
    description: '',
    daily_minutes: 60,
  });
  const [logForm, setLogForm] = useState<LogForm>({
    study_minutes: 60,
    questions_done: 0,
    wrong_count: 0,
    note: '',
  });
  const [weeklyData, setWeeklyData] = useState<DailyRecordItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      const api = getApi();
      if (!api) return;
      const [plansData, today, weekly] = await Promise.all([
        api.studyPlan.getAll() as Promise<StudyPlanItem[]>,
        api.dailyRecord.getByDate(dayjs().format('YYYY-MM-DD')) as Promise<DailyRecordItem | null>,
        api.dailyRecord.getRange(
          dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
          dayjs().format('YYYY-MM-DD')
        ) as Promise<DailyRecordItem[]>,
      ]);
      setPlans(plansData || []);
      setTodayRecord(today);
      setWeeklyData(weekly || []);
    } catch (e) {
      console.error('加载数据失败', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddPlan = async () => {
    try {
      const api = getApi();
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
  };

  const handleUpdateStatus = async (plan: StudyPlanItem) => {
    try {
      const api = getApi();
      if (!api) return;
      await api.studyPlan.update({ ...plan, status: getNextStatus(plan.status) });
      loadData();
    } catch (e) {
      console.error('更新状态失败', e);
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (!confirm('确定要删除这个计划吗？')) return;
    try {
      const api = getApi();
      if (!api) return;
      await api.studyPlan.delete(id);
      loadData();
    } catch (e) {
      console.error('删除计划失败', e);
    }
  };

  const handleLogStudy = async () => {
    try {
      const api = getApi();
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
  };

  const todayMinutes = todayRecord?.study_minutes || 0;
  const todayQuestions = todayRecord?.questions_done || 0;
  const totalWeeklyMinutes = weeklyData.reduce((sum, r) => sum + r.study_minutes, 0);

  const heatmapDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = dayjs().subtract(29 - i, 'day').format('YYYY-MM-DD');
      const record = weeklyData.find((r) => r.date === date);
      return { date, minutes: record?.study_minutes || 0 };
    });
  }, [weeklyData]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader onLogStudy={() => setShowLogStudy(true)} onAddPlan={() => setShowAddPlan(true)} />

      <StatsCards
        todayMinutes={todayMinutes}
        todayQuestions={todayQuestions}
        totalWeeklyMinutes={totalWeeklyMinutes}
      />

      <Heatmap days={heatmapDays} />

      <PlanList
        plans={plans}
        onStatusChange={handleUpdateStatus}
        onDelete={handleDeletePlan}
      />

      <AddPlanModal
        show={showAddPlan}
        form={newPlan}
        onClose={() => setShowAddPlan(false)}
        onChange={setNewPlan}
        onSubmit={handleAddPlan}
      />

      <LogStudyModal
        show={showLogStudy}
        form={logForm}
        onClose={() => setShowLogStudy(false)}
        onChange={setLogForm}
        onSubmit={handleLogStudy}
      />
    </div>
  );
};

export default StudyPlan;
