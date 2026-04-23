import React, { useState } from 'react';
import { Search, BookOpen, Calculator, Scale, Landmark, FlaskConical, PenTool, ChevronDown, ChevronUp } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
}

const CATEGORIES = [
  { key: 'formula', label: '行测公式', icon: Calculator, color: 'bg-blue-50 text-blue-700' },
  { key: 'politics', label: '政治常识', icon: Landmark, color: 'bg-red-50 text-red-700' },
  { key: 'law', label: '法律常识', icon: Scale, color: 'bg-purple-50 text-purple-700' },
  { key: 'economy', label: '经济常识', icon: BookOpen, color: 'bg-green-50 text-green-700' },
  { key: 'tech', label: '科技常识', icon: FlaskConical, color: 'bg-cyan-50 text-cyan-700' },
  { key: 'shenlun', label: '申论金句', icon: PenTool, color: 'bg-amber-50 text-amber-700' },
];

const KNOWLEDGE_DATA: KnowledgeItem[] = [
  // 行测公式
  { id: 'f1', category: 'formula', title: '行程问题', content: '路程 = 速度 × 时间\n相遇：S = (v₁ + v₂) × t\n追及：S = (v₁ - v₂) × t\n流水行船：顺流速度 = 船速 + 水速；逆流速度 = 船速 - 水速', tags: ['数量关系', '行程'] },
  { id: 'f2', category: 'formula', title: '工程问题', content: '工作总量 = 工作效率 × 工作时间\n合作效率 = 各自效率之和\n设工作总量为1，效率 = 1/时间', tags: ['数量关系', '工程'] },
  { id: 'f3', category: 'formula', title: '利润问题', content: '利润 = 售价 - 成本\n利润率 = 利润 / 成本 × 100%\n售价 = 成本 × (1 + 利润率)\n打折：售价 = 定价 × 折扣', tags: ['数量关系', '利润'] },
  { id: 'f4', category: 'formula', title: '排列组合', content: '排列 A(n,m) = n! / (n-m)!\n组合 C(n,m) = n! / [m!(n-m)!]\nC(n,m) = C(n,n-m)\n加法原理：分类用加\n乘法原理：分步用乘', tags: ['数量关系', '排列组合'] },
  { id: 'f5', category: 'formula', title: '概率问题', content: 'P(A) = A事件情况数 / 总情况数\n对立事件：P(Ā) = 1 - P(A)\n独立事件：P(AB) = P(A) × P(B)\n至少一次：1 - P(全不发生)', tags: ['数量关系', '概率'] },
  { id: 'f6', category: 'formula', title: '资料分析速算', content: '增长量 = 现期量 - 基期量 = 基期量 × 增长率\n增长率 = 增长量 / 基期量 × 100%\n比重 = 部分 / 整体\n倍数 = A / B\n平均数 = 总量 / 个数\n百分数化小数：n% = n/100', tags: ['资料分析', '速算'] },
  { id: 'f7', category: 'formula', title: '容斥原理', content: '两集合：|A∪B| = |A| + |B| - |A∩B|\n三集合：|A∪B∪C| = |A|+|B|+|C| - |A∩B| - |A∩C| - |B∩C| + |A∩B∩C|', tags: ['数量关系', '容斥'] },
  // 政治常识
  { id: 'p1', category: 'politics', title: '四项基本原则', content: '坚持社会主义道路\n坚持人民民主专政\n坚持中国共产党的领导\n坚持马克思列宁主义毛泽东思想', tags: ['政治', '核心'] },
  { id: 'p2', category: 'politics', title: '五位一体总体布局', content: '经济建设（根本）\n政治建设（保障）\n文化建设（灵魂）\n社会建设（条件）\n生态文明建设（基础）', tags: ['政治', '总体布局'] },
  { id: 'p3', category: 'politics', title: '四个全面战略布局', content: '全面建设社会主义现代化国家（目标）\n全面深化改革（动力）\n全面依法治国（保障）\n全面从严治党（关键）', tags: ['政治', '战略布局'] },
  { id: 'p4', category: 'politics', title: '新发展理念', content: '创新（引领发展的第一动力）\n协调（持续健康发展的内在要求）\n绿色（永续发展的必要条件）\n开放（国家繁荣发展的必由之路）\n共享（中国特色社会主义的本质要求）', tags: ['政治', '发展理念'] },
  // 法律常识
  { id: 'l1', category: 'law', title: '宪法基本制度', content: '根本制度：社会主义制度\n根本政治制度：人民代表大会制度\n基本经济制度：公有制为主体、多种所有制经济共同发展\n国家机构实行民主集中制原则', tags: ['法律', '宪法'] },
  { id: 'l2', category: 'law', title: '公民基本权利', content: '平等权\n选举权和被选举权（年满18周岁）\n言论、出版、集会、结社、游行、示威自由\n宗教信仰自由\n人身自由（不受非法逮捕、拘禁）\n批评建议权、申诉控告权', tags: ['法律', '权利'] },
  { id: 'l3', category: 'law', title: '行政法要点', content: '行政处罚：警告、罚款、没收、责令停产停业、暂扣/吊销许可证、行政拘留\n行政许可：依申请、外部性、授益性\n行政诉讼：民告官、合法性审查\n行政复议：上级机关复核', tags: ['法律', '行政法'] },
  // 经济常识
  { id: 'e1', category: 'economy', title: '宏观经济指标', content: 'GDP：国内生产总值（领土原则）\nGNP：国民生产总值（国民原则）\nCPI：居民消费价格指数（>3%为通胀）\nPPI：工业生产者出厂价格指数\n恩格尔系数：食品支出/总支出（越低越富裕）\n基尼系数：收入差距（0.3-0.4合理，>0.4差距大）', tags: ['经济', '指标'] },
  { id: 'e2', category: 'economy', title: '财政政策与货币政策', content: '扩张性财政政策：减税、增支\n紧缩性财政政策：增税、减支\n扩张性货币政策：降息、降准、增加货币供给\n紧缩性货币政策：加息、提准、减少货币供给', tags: ['经济', '政策'] },
  // 科技常识
  { id: 't1', category: 'tech', title: '中国航天成就', content: '神舟系列：载人飞船\n嫦娥系列：月球探测\n天问系列：火星探测\n北斗系统：全球导航\n天宫系列：空间站\n长征系列：运载火箭', tags: ['科技', '航天'] },
  { id: 't2', category: 'tech', title: '物理常识', content: '牛顿三定律：惯性定律、F=ma、作用力反作用力\n热力学：能量守恒、熵增原理\n光学：反射定律、折射定律、全反射\n电磁：法拉第电磁感应、麦克斯韦方程组', tags: ['科技', '物理'] },
  // 申论金句
  { id: 's1', category: 'shenlun', title: '人民类金句', content: '"江山就是人民，人民就是江山。"\n"民之所忧，我必念之；民之所盼，我必行之。"\n"时代是出卷人，我们是答卷人，人民是阅卷人。"\n"人民对美好生活的向往，就是我们的奋斗目标。"', tags: ['申论', '人民'] },
  { id: 's2', category: 'shenlun', title: '奋斗类金句', content: '"征途漫漫，惟有奋斗。"\n"幸福都是奋斗出来的。"\n"奋斗是青春最亮丽的底色。"\n"艰难方显勇毅，磨砺始得玉成。"\n"志之所趋，无远弗届，穷山距海，不能限也。"', tags: ['申论', '奋斗'] },
  { id: 's3', category: 'shenlun', title: '创新类金句', content: '"创新是引领发展的第一动力。"\n"惟创新者进，惟创新者强，惟创新者胜。"\n"苟日新，日日新，又日新。"\n"满眼生机转化钧，天工人巧日争新。"', tags: ['申论', '创新'] },
  { id: 's4', category: 'shenlun', title: '治理类金句', content: '"治国之道，富民为始。"\n"法令者，民之命也，为治之本也。"\n"天下之治，天下之民共治之。"\n"治国常富，而乱国必贫。"', tags: ['申论', '治理'] },
];

const KnowledgeBase: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('formula');
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = KNOWLEDGE_DATA.filter(item => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      return item.title.toLowerCase().includes(s) || item.content.toLowerCase().includes(s) || item.tags.some(t => t.toLowerCase().includes(s));
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">知识点速查</h1>
        <p className="text-sm text-gray-500 mt-1">行测公式、常识考点、申论金句，一键速查</p>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="搜索知识点..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" />
      </div>

      {/* 分类 */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = KNOWLEDGE_DATA.filter(k => k.category === cat.key).length;
          return (
            <button key={cat.key} onClick={() => setActiveCategory(activeCategory === cat.key ? 'all' : cat.key)}
              className={`p-3 rounded-xl border transition-colors text-left ${activeCategory === cat.key ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.color} mb-2`}><Icon className="w-4 h-4" /></div>
              <p className="text-sm font-medium text-gray-800">{cat.label}</p>
              <p className="text-xs text-gray-400">{count} 条</p>
            </button>
          );
        })}
      </div>

      {/* 知识列表 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p>没有找到相关知识点</p></div>
        ) : filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${CATEGORIES.find(c => c.key === item.category)?.color || 'bg-gray-100 text-gray-600'}`}>
                    {CATEGORIES.find(c => c.key === item.category)?.label || item.category}
                  </span>
                  <h3 className="text-sm font-medium text-gray-800">{item.title}</h3>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {item.tags.map(tag => <span key={tag} className="text-xs text-gray-400">#{tag}</span>)}
                </div>
              </div>
              {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
            </div>
            {expandedId === item.id && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{item.content}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeBase;
