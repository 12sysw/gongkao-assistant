import { useState, useEffect } from 'react';
import { Calendar, TrendingDown, Clock, AlertCircle } from 'lucide-react';

interface DailyStats {
  date: string;
  nominalMinutes: number;  // 名义学习时间
  realFocusMinutes: number;  // 真实专注时间
  fishingMinutes: number;  // 摸鱼时间
  pomodorosCompleted: number;
  avgFocusRate: number;  // 平均专注率
}

export default function BrutalReport() {
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    // 从数据库加载番茄钟记录
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const records = await window.api.pomodoroRecord.getRange(oneWeekAgo, today);

    const statsMap = new Map<string, DailyStats>();

    for (const record of records) {
      const date = record.date;
      if (!statsMap.has(date)) {
        statsMap.set(date, {
          date,
          nominalMinutes: 0,
          realFocusMinutes: 0,
          fishingMinutes: 0,
          pomodorosCompleted: 0,
          avgFocusRate: 0,
        });
      }

      const stat = statsMap.get(date)!;
      stat.nominalMinutes += record.duration || 25;
      stat.realFocusMinutes += Math.round((record.real_focus_seconds || 0) / 60);
      stat.pomodorosCompleted += 1;
    }

    // 计算摸鱼时间和平均专注率
    for (const stat of statsMap.values()) {
      stat.fishingMinutes = stat.nominalMinutes - stat.realFocusMinutes;
      stat.avgFocusRate = stat.nominalMinutes > 0
        ? Math.round((stat.realFocusMinutes / stat.nominalMinutes) * 100)
        : 0;
    }

    setStats([...statsMap.values()].sort((a, b) => b.date.localeCompare(a.date)));
  };

  const today = stats.find(s => s.date === selectedDate);

  const getBrutalLevel = (focusRate: number): { level: string; color: string; message: string } => {
    if (focusRate >= 90) return {
      level: '优秀',
      color: 'text-green-500',
      message: '真正的自律！保持下去，上岸稳了。'
    };
    if (focusRate >= 75) return {
      level: '良好',
      color: 'text-blue-500',
      message: '还不错，但还有提升空间。'
    };
    if (focusRate >= 60) return {
      level: '及格',
      color: 'text-yellow-500',
      message: '勉强及格，这个效率很难上岸。'
    };
    if (focusRate >= 40) return {
      level: '较差',
      color: 'text-orange-500',
      message: '别骗自己了，大部分时间在摸鱼。'
    };
    return {
      level: '极差',
      color: 'text-red-500',
      message: '这不是学习，这是浪费生命。'
    };
  };

  const brutal = today ? getBrutalLevel(today.avgFocusRate) : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">残酷真相日报</h1>
        <p className="text-gray-600">不要自欺欺人，直面真实的自己</p>
      </div>

      {/* 日期选择 */}
      <div className="mb-6 flex items-center gap-4">
        <Calendar className="w-5 h-5 text-gray-400" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="px-4 py-2 border rounded-lg"
        />
      </div>

      {!today ? (
        <div className="text-center py-12 text-gray-400">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" />
          <p>这一天没有学习记录</p>
          <p className="text-sm mt-2">又是摆烂的一天？</p>
        </div>
      ) : (
        <>
          {/* 残酷指数 */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 mb-6 text-white">
            <div className="text-center mb-6">
              <div className="text-6xl font-bold mb-2">{today.avgFocusRate}%</div>
              <div className={`text-2xl font-semibold ${brutal?.color}`}>
                {brutal?.level}
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <p className="text-lg text-center">{brutal?.message}</p>
            </div>
          </div>

          {/* 时间分析 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 text-sm mb-1">名义学习时间</div>
                  <div className="text-3xl font-bold">{today.nominalMinutes}</div>
                  <div className="text-gray-400 text-sm">分钟</div>
                </div>
                <Clock className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 text-sm mb-1">真实专注时间</div>
                  <div className="text-3xl font-bold text-green-600">{today.realFocusMinutes}</div>
                  <div className="text-gray-400 text-sm">分钟</div>
                </div>
                <TrendingDown className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 text-sm mb-1">摸鱼时间</div>
                  <div className="text-3xl font-bold text-red-600">{today.fishingMinutes}</div>
                  <div className="text-gray-400 text-sm">分钟</div>
                </div>
                <AlertCircle className="w-12 h-12 text-red-500 opacity-20" />
              </div>
            </div>
          </div>

          {/* 时间分布 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">时间分布</h3>
            <div className="flex h-8 rounded-lg overflow-hidden">
              <div
                style={{ width: `${(today.realFocusMinutes / today.nominalMinutes) * 100}%` }}
                className="bg-green-500 flex items-center justify-center text-white text-sm font-semibold"
              >
                {today.realFocusMinutes > 10 && `${today.realFocusMinutes}min`}
              </div>
              <div
                style={{ width: `${(today.fishingMinutes / today.nominalMinutes) * 100}%` }}
                className="bg-red-500 flex items-center justify-center text-white text-sm font-semibold"
              >
                {today.fishingMinutes > 10 && `${today.fishingMinutes}min`}
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>🟢 真实学习 ({Math.round((today.realFocusMinutes / today.nominalMinutes) * 100)}%)</span>
              <span>🔴 摸鱼走神 ({Math.round((today.fishingMinutes / today.nominalMinutes) * 100)}%)</span>
            </div>
          </div>

          {/* 毒鸡汤 */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <div className="font-semibold text-yellow-800 mb-1">今日警示</div>
                <p className="text-sm text-yellow-700">
                  {today.avgFocusRate < 60 && '你以为开着计时器就是在学习？清醒一点，再这样下去今年上不了岸。'}
                  {today.avgFocusRate >= 60 && today.avgFocusRate < 80 && '及格线水平，但别忘了你的对手都在拼命。'}
                  {today.avgFocusRate >= 80 && '很好，但不要骄傲，保持到考试那天才算赢。'}
                </p>
              </div>
            </div>
          </div>

          {/* 近7天趋势 */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h3 className="font-semibold mb-4">近7天专注率趋势</h3>
            <div className="space-y-2">
              {stats.slice(0, 7).map(stat => (
                <div key={stat.date} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-500">{stat.date}</div>
                  <div className="flex-1">
                    <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${stat.avgFocusRate}%` }}
                        className={`h-full flex items-center justify-end pr-2 text-white text-xs font-semibold transition-all ${
                          stat.avgFocusRate >= 75 ? 'bg-green-500' :
                          stat.avgFocusRate >= 60 ? 'bg-blue-500' :
                          stat.avgFocusRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      >
                        {stat.avgFocusRate}%
                      </div>
                    </div>
                  </div>
                  <div className="w-16 text-sm text-gray-500 text-right">
                    {stat.pomodorosCompleted}🍅
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
