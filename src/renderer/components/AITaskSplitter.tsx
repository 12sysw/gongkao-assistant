import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, Clock } from 'lucide-react';

interface SubTask {
  task: string;
  pomodoros: number;
  type: string;
}

interface AITaskSplitterProps {
  onTasksGenerated?: (tasks: SubTask[]) => void;
}

export default function AITaskSplitter({ onTasksGenerated }: AITaskSplitterProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<SubTask[]>([]);
  const [error, setError] = useState('');

  const splitTask = async () => {
    if (!input.trim()) {
      setError('请输入学习任务');
      return;
    }

    setLoading(true);
    setError('');
    setTasks([]);

    try {
      // 获取AI配置
      const config = await window.api.rag.configGet();
      if (!config.llmApiUrl || !config.llmApiKey) {
        throw new Error('请先在设置中配置AI接口');
      }

      const response = await fetch(config.llmApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.llmApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.llmModel || 'claude-3-5-sonnet-20241022',
          messages: [{
            role: 'user',
            content: `你是公考学习规划专家。请将以下学习任务拆解成具体可执行的小任务。

学习任务：${input}

要求：
1. 拆解成5-10个具体的小任务
2. 每个任务应该是明确的行动，不要太笼统
3. 估算每个任务需要的番茄钟数量（1个番茄=25分钟）
4. 标注任务类型：刷题/背诵/整理/复习等
5. 按照合理的学习顺序排列

输出JSON格式（不要markdown代码块，直接JSON）：
[
  {"task": "任务描述", "pomodoros": 2, "type": "刷题"},
  ...
]`
          }],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      let content = data.content?.[0]?.text || data.choices?.[0]?.message?.content || '';

      // 提取JSON（处理可能的markdown包裹）
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('AI返回格式错误');
      }

      const parsedTasks = JSON.parse(jsonMatch[0]) as SubTask[];

      if (!Array.isArray(parsedTasks) || parsedTasks.length === 0) {
        throw new Error('AI未能生成有效任务');
      }

      setTasks(parsedTasks);
      onTasksGenerated?.(parsedTasks);

    } catch (err) {
      console.error('AI任务拆解失败:', err);
      setError(err instanceof Error ? err.message : '拆解失败');
    } finally {
      setLoading(false);
    }
  };

  const addToStudyPlan = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      for (const task of tasks) {
        await window.api.studyPlan.add({
          title: task.task,
          subject: task.type,
          target_date: today,
          priority: 'medium',
          daily_minutes: task.pomodoros * 25,
          description: `AI自动拆解 - 预计${task.pomodoros}个番茄钟`,
        });
      }

      alert(`已添加${tasks.length}个任务到学习计划！`);
      setInput('');
      setTasks([]);
    } catch (err) {
      alert('添加失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const totalPomodoros = tasks.reduce((sum, t) => sum + t.pomodoros, 0);
  const totalMinutes = totalPomodoros * 25;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-purple-500" />
        <h2 className="text-xl font-bold">AI智能任务拆解</h2>
      </div>

      <p className="text-gray-600 text-sm mb-4">
        输入大任务，AI帮你拆解成具体可执行的小任务，并估算学习时长
      </p>

      {/* 输入区 */}
      <div className="mb-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例如：复习行测数量关系排列组合部分"
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      {/* 快速模板 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-sm text-gray-500">快速模板：</span>
        {['复习行测数量关系', '整理申论万能素材', '刷常识判断100题', '背诵时政热点'].map(template => (
          <button
            key={template}
            onClick={() => setInput(template)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition"
          >
            {template}
          </button>
        ))}
      </div>

      {/* 拆解按钮 */}
      <button
        onClick={splitTask}
        disabled={loading || !input.trim()}
        className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            AI拆解中...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            开始拆解
          </>
        )}
      </button>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 拆解结果 */}
      {tasks.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">拆解结果</h3>
            <div className="text-sm text-gray-500">
              共 {tasks.length} 个任务 · {totalPomodoros} 个番茄钟 · 约 {Math.floor(totalMinutes / 60)}小时{totalMinutes % 60}分钟
            </div>
          </div>

          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium mb-1">{task.task}</div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="px-2 py-0.5 bg-white rounded-full">{task.type}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.pomodoros} 个番茄钟 ({task.pomodoros * 25}分钟)
                    </span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-gray-300" />
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={addToStudyPlan}
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition"
            >
              添加到学习计划
            </button>
            <button
              onClick={() => setTasks([])}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
            >
              清空
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
