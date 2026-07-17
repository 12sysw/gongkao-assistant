import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Quote, Sparkles, RefreshCw, Share2, Bookmark } from 'lucide-react';
import { PageContainer, PageHeader } from '../components/ui/PageLayout';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const QUOTES = [
  {
    text: '成功不是将来才有的，而是从决定去做的那一刻起，持续累积而成。',
    author: '佚名',
    category: '励志',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    text: '路漫漫其修远兮，吾将上下而求索。',
    author: '屈原',
    category: '经典',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    text: '不积跬步，无以至千里；不积小流，无以成江海。',
    author: '荀子',
    category: '学习',
    color: 'from-green-500 to-emerald-500',
  },
  {
    text: '天道酬勤，功不唐捐。只要你付出努力，就一定会有回报。',
    author: '佚名',
    category: '励志',
    color: 'from-orange-500 to-pink-500',
  },
];

const Encourage: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const currentQuote = QUOTES[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % QUOTES.length);
    setLiked(false);
    setBookmarked(false);
  };

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="每日鼓励"
        subtitle="坚持就是胜利"
        icon={<Heart className="w-7 h-7" />}
      />

      <div className="flex items-center justify-center min-h-[calc(100vh-300px)]">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-3xl"
        >
          <Card
            variant="elevated"
            className={`overflow-hidden bg-gradient-to-br ${currentQuote.color}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <CardContent className="p-12 relative">
              {/* 引号装饰 */}
              <Quote className="w-12 h-12 text-white/30 mb-6" />

              {/* 名言内容 */}
              <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed mb-8">
                {currentQuote.text}
              </p>

              {/* 作者和分类 */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <span className="text-lg text-white/90">—— {currentQuote.author}</span>
                  <Badge variant="outline" className="bg-white/20 border-white/30 text-white">
                    {currentQuote.category}
                  </Badge>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  onClick={() => setLiked(!liked)}
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                  {liked ? '已喜欢' : '喜欢'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  onClick={() => setBookmarked(!bookmarked)}
                >
                  <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
                  {bookmarked ? '已收藏' : '收藏'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                >
                  <Share2 className="w-5 h-5" />
                  分享
                </Button>
                <Button
                  size="lg"
                  className="bg-white text-brand-600 hover:bg-white/90"
                  onClick={handleNext}
                >
                  <RefreshCw className="w-5 h-5" />
                  换一换
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 进度指示器 */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {QUOTES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-brand-500'
                    : 'w-2 bg-surface-300 dark:bg-dark-700 hover:bg-surface-400 dark:hover:bg-dark-600'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </PageContainer>
  );
};

export default Encourage;
