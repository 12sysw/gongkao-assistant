import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Save, Trash2, Layers } from 'lucide-react';

const CATEGORIES = ['常识-政治', '常识-法律', '常识-经济', '常识-人文', '常识-科技', '行测-公式', '申论-金句'];

interface Flashcard {
  id: number;
  front: string;
  back: string;
  category: string;
  difficulty: string;
  review_count: number;
  mastered: number;
  next_review: string;
  created_at: string;
}

const Flashcards: React.FC = () => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [filterMode, setFilterMode] = useState<'all' | 'due' | 'mastered'>('all');
  const [form, setForm] = useState({ front: '', back: '', category: CATEGORIES[0], difficulty: 'medium' });

  useEffect(() => { loadCards(); }, []);

  const loadCards = async () => {
    try {
      const api = (window as any).api;
      if (!api) return;
      const data = await api.flashcard.getAll();
      setCards(data || []);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async () => {
    if (!form.front.trim() || !form.back.trim()) return;
    try {
      const api = (window as any).api;
      await api.flashcard.add(form);
      setForm({ front: '', back: '', category: CATEGORIES[0], difficulty: 'medium' });
      setShowForm(false);
      loadCards();
    } catch (e) { console.error(e); }
  };

  const handleResult = async (correct: boolean) => {
    const card = filteredCards[currentIndex];
    if (!card) return;
    const newCount = card.review_count + 1;
    const nextDays = correct ? Math.min(Math.pow(2, newCount), 30) : 1;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextDays);
    try {
      const api = (window as any).api;
      await api.flashcard.update(card.id, {
        review_count: newCount,
        mastered: correct && newCount >= 5 ? 1 : 0,
        next_review: nextDate.toISOString().split('T')[0],
      });
      setIsFlipped(false);
      loadCards();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此卡片？')) return;
    try {
      const api = (window as any).api;
      await api.flashcard.delete(id);
      loadCards();
    } catch (e) { console.error(e); }
  };

  const filteredCards = cards.filter(c => {
    if (filterCat !== 'all' && c.category !== filterCat) return false;
    const today = new Date().toISOString().split('T')[0];
    if (filterMode === 'due') return c.next_review <= today && !c.mastered;
    if (filterMode === 'mastered') return c.mastered === 1;
    return true;
  });

  const dueCount = cards.filter(c => c.next_review <= new Date().toISOString().split('T')[0] && !c.mastered).length;
  const currentCard = filteredCards[currentIndex] || null;

  const nextCard = () => { setIsFlipped(false); setCurrentIndex(i => Math.min(i + 1, filteredCards.length - 1)); };
  const prevCard = () => { setIsFlipped(false); setCurrentIndex(i => Math.max(i - 1, 0)); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">记忆卡片</h1>
          <p className="text-sm text-gray-500 mt-1">今日待复习 <span className="text-blue-600 font-semibold">{dueCount}</span> 张 · 共 {cards.length} 张</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm transition-colors">
          <Plus className="w-4 h-4 mr-1" /> 新建卡片
        </button>
      </div>

      {/* 筛选 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden mr-2">
            {(['all', 'due', 'mastered'] as const).map(m => (
              <button key={m} onClick={() => { setFilterMode(m); setCurrentIndex(0); }}
                className={`px-3 py-1.5 text-xs ${filterMode === m ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-600'}`}>
                {m === 'all' ? '全部' : m === 'due' ? '待复习' : '已掌握'}
              </button>
            ))}
          </div>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setFilterCat(filterCat === cat ? 'all' : cat); setCurrentIndex(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filterCat === cat ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {cat.split('-')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* 学习区 */}
      {currentCard ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>{currentIndex + 1} / {filteredCards.length}</span>
            <div className="flex gap-2">
              <span className={`px-2 py-0.5 rounded text-xs ${currentCard.difficulty === 'easy' ? 'bg-green-100 text-green-700' : currentCard.difficulty === 'hard' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {currentCard.difficulty === 'easy' ? '简单' : currentCard.difficulty === 'hard' ? '困难' : '中等'}
              </span>
              {currentCard.mastered ? <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">已掌握</span> : null}
            </div>
          </div>

          {/* 卡片 */}
          <div onClick={() => setIsFlipped(!isFlipped)} className="cursor-pointer" style={{ perspective: '1000px' }}>
            <div className="relative w-full min-h-[280px] transition-transform duration-500" style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg flex items-center justify-center p-8" style={{ backfaceVisibility: 'hidden' }}>
                <div className="text-white text-center">
                  <p className="text-xs opacity-70 mb-3">{currentCard.category}</p>
                  <p className="text-xl font-bold leading-relaxed">{currentCard.front}</p>
                  <p className="text-xs opacity-50 mt-6">点击翻转 · 复习 {currentCard.review_count} 次</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg flex items-center justify-center p-8" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <div className="text-white text-center">
                  <p className="text-xs opacity-70 mb-3">答案</p>
                  <p className="text-xl font-bold leading-relaxed whitespace-pre-wrap">{currentCard.back}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 操作 */}
          {isFlipped && (
            <div className="flex justify-center gap-3">
              <button onClick={() => handleResult(false)} className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm transition-colors">
                <X className="w-4 h-4" /> 不会
              </button>
              <button onClick={() => handleResult(true)} className="flex items-center gap-2 px-6 py-2.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm transition-colors">
                <Check className="w-4 h-4" /> 会了
              </button>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button onClick={prevCard} disabled={currentIndex === 0} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50 transition-colors">上一张</button>
            <button onClick={nextCard} disabled={currentIndex >= filteredCards.length - 1} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50 transition-colors">下一张</button>
            <button onClick={() => { if (confirm('确定删除？')) handleDelete(currentCard.id); }} className="px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <Layers className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          <p className="text-lg">暂无卡片</p>
          <p className="text-sm mt-1">点击右上角新建卡片开始学习</p>
        </div>
      )}

      {/* 新建弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">新建记忆卡片</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">正面（问题）</label>
                <textarea value={form.front} onChange={e => setForm({ ...form, front: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-20 focus:outline-none focus:border-primary-400" placeholder="例如：我国根本政治制度是什么？" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">背面（答案）</label>
                <textarea value={form.back} onChange={e => setForm({ ...form, back: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-20 focus:outline-none focus:border-primary-400" placeholder="例如：人民代表大会制度" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-primary-400">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">难度</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-primary-400">
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">取消</button>
                <button onClick={handleAdd} disabled={!form.front.trim() || !form.back.trim()} className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  <Save className="w-4 h-4 mr-1" /> 保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flashcards;
