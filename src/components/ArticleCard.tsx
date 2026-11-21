import { useState } from 'react';
import { ArrowUpRight, Bookmark, Heart, Lock, Pin } from 'lucide-react';
import type { Category, DensityMode, Post } from '../types/blog';
import { formatShortDate } from '../utils/blogLogic';
import { countWords, estimateReadingMinutes } from '../utils/markdown';

interface ArticleCardProps {
  post: Post;
  category?: Category;
  density: DensityMode;
  compactCard?: boolean;
  staggerIndex?: number;
  isSaved: boolean;
  isLiked: boolean;
  onOpen: (post: Post) => void;
  onToggleSave: (id: string) => void;
  onLikePost: (id: string) => void;
}

export function ArticleCard({
  post,
  category,
  density,
  compactCard = false,
  staggerIndex = 0,
  isSaved,
  isLiked,
  onOpen,
  onToggleSave,
  onLikePost,
}: ArticleCardProps) {
  const [popping, setPopping] = useState(false);
  const words = countWords(post.content || post.excerpt);
  const minutes = estimateReadingMinutes(post.content || post.excerpt);
  const padClass = density === 'compact' ? 'p-4 sm:p-5' : 'p-5 sm:p-7';

  const handleLikeClick = () => {
    setPopping(true);
    setTimeout(() => setPopping(false), 340);
    onLikePost(post.id);
  };

  return (
    <article
      style={{ ['--stagger' as string]: Math.min(staggerIndex, 8) }}
      className="m3-card m3-card-interactive fuwari-onload group overflow-hidden"
    >
      <div
        className={`grid grid-cols-1 ${
          !compactCard && post.coverImage ? 'md:grid-cols-12 items-stretch' : ''
        }`}
      >
        <div
          className={`${
            !compactCard && post.coverImage ? 'md:col-span-7 lg:col-span-8' : ''
          } ${padClass} flex flex-col justify-between`}
        >
          <div>
            {/* Clean Unboxed Metadata Line (Zero-Pill Discipline) */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--md-on-surface-variant)]">
              {post.pinned && (
                <>
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--md-primary)]">
                    <Pin className="w-3.5 h-3.5" />
                    置顶
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              {post.hasPassword && (
                <>
                  <span className="inline-flex items-center gap-1 font-medium text-[var(--md-tertiary)]">
                    <Lock className="w-3.5 h-3.5" />
                    加密手记
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>{category?.name || post.categorySlug}</span>
              <span aria-hidden="true">·</span>
              <time className="tabular-nums">{formatShortDate(post.createdAt)}</time>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{words} 字 / {minutes} 分钟阅读</span>
            </div>

            {/* Primary Title */}
            <h3 className="mt-2.5 font-display text-xl sm:text-[1.4rem] font-bold leading-snug text-[var(--md-on-surface)] group-hover:text-[var(--md-primary)] transition-colors [text-wrap:balance]">
              <button
                type="button"
                onClick={() => onOpen(post)}
                className="text-left w-full cursor-pointer"
              >
                {post.title}
              </button>
            </h3>

            {/* Excerpt */}
            <p className="mt-3 text-sm sm:text-[14.5px] leading-relaxed text-[var(--md-on-surface-variant)] line-clamp-2">
              {post.excerpt}
            </p>
          </div>

          {/* Bottom Metadata & Actions */}
          <div className="mt-5 pt-3.5 border-t border-[var(--md-outline-variant)]/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--md-on-surface-variant)]">
              {post.tags.slice(0, 3).map((tag, idx) => (
                <span key={tag}>
                  {idx > 0 && <span className="mr-2 opacity-50">/</span>}
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLikeClick}
                aria-label={isLiked ? `取消点赞 ${post.title}` : `点赞 ${post.title}`}
                aria-pressed={isLiked}
                className={`inline-flex items-center gap-1 px-2.5 h-9 text-xs font-medium rounded-[var(--radius-control)] transition-colors cursor-pointer ${
                  isLiked
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)] hover:text-rose-500'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''} ${
                    popping ? 'animate-heart-pop' : ''
                  }`}
                />
                <span className="tabular-nums">{post.likes}</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleSave(post.id)}
                aria-label={isSaved ? `取消收藏 ${post.title}` : `收藏 ${post.title}`}
                aria-pressed={isSaved}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-control)] transition-colors cursor-pointer ${
                  isSaved
                    ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                    : 'bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => onOpen(post)}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] group-hover:bg-[var(--md-primary)] group-hover:text-[var(--md-on-primary)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>阅读全文</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        {!compactCard && post.coverImage && (
          <div className="md:col-span-5 lg:col-span-4 relative min-h-[190px] md:min-h-full bg-[var(--md-surface-container-high)] overflow-hidden">
            <button
              type="button"
              onClick={() => onOpen(post)}
              aria-label={`查看文章：${post.title}`}
              className="block w-full h-full cursor-pointer"
            >
              <img
                src={post.coverImage}
                alt={post.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
