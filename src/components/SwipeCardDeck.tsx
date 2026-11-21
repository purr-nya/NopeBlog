import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  RotateCcw,
} from 'lucide-react';

export interface SwipeDeckItem {
  id: string;
  title: string;
  subtitle: string;
  metaLine: string;
  image?: string;
  accentLabel?: string;
}

interface SwipeCardDeckProps {
  items: SwipeDeckItem[];
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onOpenItem: (id: string) => void;
  heading?: string;
  description?: string;
  actionLabel?: string;
}

export function SwipeCardDeck({
  items,
  savedIds,
  onToggleSave,
  onOpenItem,
  heading = '卡片滑动探索',
  description = '左右拖动卡片切换文章或加入灵感收藏，亦可使用键盘方向键翻阅',
  actionLabel = '深入阅读',
}: SwipeCardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [flyOutDir, setFlyOutDir] = useState<1 | -1 | 0>(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startRef = useRef<{ x: number; y: number; time: number; pointerId: number } | null>(null);
  const flyTimerRef = useRef<number | null>(null);

  const safeIndex = items.length > 0 ? currentIndex % items.length : 0;
  const activeItem = items[safeIndex];
  const nextItem = items.length > 1 ? items[(safeIndex + 1) % items.length] : null;
  const thirdItem = items.length > 2 ? items[(safeIndex + 2) % items.length] : null;

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 1800);
    return () => window.clearTimeout(t);
  }, [feedback]);

  useEffect(() => {
    return () => {
      if (flyTimerRef.current) window.clearTimeout(flyTimerRef.current);
    };
  }, []);

  const advance = (dir: 1 | -1, shouldSave = false) => {
    if (!activeItem || flyOutDir !== 0) return;
    if (shouldSave && !savedIds.includes(activeItem.id)) {
      onToggleSave(activeItem.id);
      setFeedback(`已收藏「${activeItem.title.slice(0, 14)}」`);
    } else if (dir === -1) {
      setFeedback('已翻至下一张');
    } else {
      setFeedback('已保留在收藏夹');
    }

    setFlyOutDir(dir);
    flyTimerRef.current = window.setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setFlyOutDir(0);
      setDragOffset({ x: 0, y: 0 });
    }, 220);
  };

  const rewind = () => {
    if (items.length <= 1 || flyOutDir !== 0) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setDragOffset({ x: 0, y: 0 });
    setFeedback('已回到上一张');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        advance(-1, false);
      } else if (e.key === 'ArrowRight') {
        advance(1, true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeItem, savedIds, items.length, flyOutDir]);

  const handlePointerDown = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    if (flyOutDir !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      pointerId: e.pointerId,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!startRef.current || !isDragging) return;
    const dx = e.clientX - startRef.current.x;
    const dy = (e.clientY - startRef.current.y) * 0.16;
    setDragOffset({ x: dx, y: dy });
  };

  const finishDrag = (e: PointerEvent<HTMLElement>) => {
    if (!startRef.current || !isDragging) return;
    const dx = e.clientX - startRef.current.x;
    const elapsed = Math.max(16, performance.now() - startRef.current.time);
    const velocity = dx / elapsed;

    if (e.currentTarget.hasPointerCapture(startRef.current.pointerId)) {
      e.currentTarget.releasePointerCapture(startRef.current.pointerId);
    }
    startRef.current = null;
    setIsDragging(false);

    if (dx > 92 || velocity > 0.55) {
      advance(1, true);
    } else if (dx < -92 || velocity < -0.55) {
      advance(-1, false);
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  if (!activeItem) {
    return (
      <div className="m3-card p-8 text-center text-sm text-[var(--md-on-surface-variant)]">
        暂无可滑览的内容卡片。
      </div>
    );
  }

  const isSaved = savedIds.includes(activeItem.id);
  const tx = flyOutDir !== 0 ? flyOutDir * 420 : dragOffset.x;
  const ty = flyOutDir !== 0 ? 18 : dragOffset.y;
  const rot = flyOutDir !== 0 ? flyOutDir * 14 : Math.max(-12, Math.min(12, dragOffset.x * 0.05));
  const opacity = flyOutDir !== 0 ? 0 : Math.max(0.65, 1 - Math.abs(dragOffset.x) / 520);
  const rightCueOpacity = Math.max(0, Math.min(1, (dragOffset.x - 24) / 80));
  const leftCueOpacity = Math.max(0, Math.min(1, (-dragOffset.x - 24) / 80));

  return (
    <section
      aria-label={heading}
      data-testid="swipe-card-deck"
      className="m3-card p-5 sm:p-6 overflow-hidden"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
            {heading}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[var(--md-on-surface-variant)]">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-[var(--md-on-surface-variant)]">
          {feedback && (
            <span className="text-[var(--md-primary)] font-sans font-medium">{feedback}</span>
          )}
          <span data-testid="deck-counter">
            {String(safeIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Stacked Expressive Card Stage */}
      <div className="relative h-[440px] md:h-[360px] w-full select-none touch-pan-y">
        {/* Background Card 3 */}
        {thirdItem && (
          <div
            aria-hidden="true"
            className="absolute inset-x-6 top-4 bottom-0 rounded-[var(--radius-card)] bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)]/70 scale-[0.94] translate-y-3 opacity-60 pointer-events-none"
          />
        )}

        {/* Background Card 2 */}
        {nextItem && (
          <div
            aria-hidden="true"
            className="absolute inset-x-3 top-2 bottom-0 rounded-[var(--radius-card)] bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] scale-[0.97] translate-y-1.5 opacity-85 pointer-events-none"
          />
        )}

        {/* Top Draggable Expressive Card */}
        <article
          key={activeItem.id}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          style={{
            transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg)`,
            opacity,
            transition: isDragging
              ? 'none'
              : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
          }}
          className="absolute inset-0 rounded-[var(--radius-card)] overflow-hidden border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] cursor-grab active:cursor-grabbing shadow-md grid grid-cols-1 md:grid-cols-12 will-change-transform"
        >
          {/* Visual Side */}
          <div className="relative md:col-span-5 h-40 md:h-full bg-[var(--md-surface-container-high)] overflow-hidden">
            {activeItem.image ? (
              <img
                src={activeItem.image}
                alt={activeItem.title}
                referrerPolicy="no-referrer"
                draggable={false}
                className="w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--md-primary-container)] to-[var(--md-tertiary-container)] p-6">
                <span className="font-display text-xl font-bold text-[var(--md-on-primary-container)] text-center">
                  {activeItem.title}
                </span>
              </div>
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
            />

            {/* Drag Direction Cues */}
            <div
              style={{ opacity: rightCueOpacity }}
              className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-[var(--md-primary)] text-[var(--md-on-primary)] text-xs font-semibold pointer-events-none"
            >
              右滑收藏
            </div>
            <div
              style={{ opacity: leftCueOpacity }}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] text-xs font-semibold pointer-events-none"
            >
              左滑下一篇
            </div>
          </div>

          {/* Editorial Content Side */}
          <div className="md:col-span-7 p-5 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="text-xs text-[var(--md-on-surface-variant)]">
                {activeItem.metaLine}
              </div>
              <h3 className="mt-2.5 font-display text-xl sm:text-2xl font-bold text-[var(--md-on-surface)] leading-snug line-clamp-2 [text-wrap:balance]">
                {activeItem.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--md-on-surface-variant)] line-clamp-3">
                {activeItem.subtitle}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--md-outline-variant)]/60 flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--md-primary)] font-medium truncate">
                {isSaved ? '已收录至灵感清单' : activeItem.accentLabel || '左右拖动卡片切换'}
              </span>
              <button
                type="button"
                onClick={() => onOpenItem(activeItem.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>{actionLabel}</span>
              </button>
            </div>
          </div>
        </article>
      </div>

      {/* Tactile Expressive Deck Controls */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={rewind}
            aria-label="上一张卡片"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>上一张</span>
          </button>

          <button
            type="button"
            onClick={() => advance(-1, false)}
            aria-label="跳过并查看下一张卡片"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>滑过下一篇</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleSave(activeItem.id)}
            aria-pressed={isSaved}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-[var(--radius-control)] whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              isSaved
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? '已收藏' : '收藏卡片'}</span>
          </button>

          <button
            type="button"
            onClick={() => advance(1, true)}
            aria-label="右滑收藏并继续下一张"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>收藏并下一篇</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
