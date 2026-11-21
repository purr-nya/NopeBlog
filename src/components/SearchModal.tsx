import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, MessageSquare, Search, X } from 'lucide-react';
import type { Moment, Post, StandalonePage } from '../types/blog';
import { formatShortDate } from '../utils/blogLogic';

interface SearchModalProps {
  open: boolean;
  posts: Post[];
  moments: Moment[];
  pages: StandalonePage[];
  onClose: () => void;
  onSelectPost: (post: Post) => void;
  onSelectMoments: () => void;
  onSelectPage: (slug: string) => void;
}

export function SearchModal({
  open,
  posts,
  moments,
  pages,
  onClose,
  onSelectPost,
  onSelectMoments,
  onSelectPage,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 40);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedPosts = posts.filter((p) =>
      !q
        ? true
        : `${p.title} ${p.excerpt} ${p.tags.join(' ')} ${p.content}`.toLowerCase().includes(q)
    );
    const matchedMoments = moments.filter((m) =>
      !q
        ? false
        : `${m.content} ${m.mood} ${m.location || ''} ${m.tags.join(' ')}`.toLowerCase().includes(q)
    );
    const matchedPages = pages.filter((pg) =>
      !q ? false : `${pg.title} ${pg.subtitle || ''} ${pg.content}`.toLowerCase().includes(q)
    );
    return {
      posts: matchedPosts.slice(0, 6),
      moments: matchedMoments.slice(0, 4),
      pages: matchedPages.slice(0, 3),
    };
  }, [query, posts, moments, pages]);

  if (!open) return null;

  const totalCount = results.posts.length + results.moments.length + results.pages.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="全站搜索"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl m3-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--md-outline-variant)]">
          <Search className="w-5 h-5 text-[var(--md-primary)] shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文章标题、标签、正文或说说内容..."
            aria-label="输入关键词搜索全站"
            className="flex-1 bg-transparent text-base text-[var(--md-on-surface)] placeholder:text-[var(--md-on-surface-variant)] outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭搜索弹窗"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl hover:bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {totalCount === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--md-on-surface-variant)]">
              未找到包含「{query}」的内容，试着换一个关键词。
            </div>
          ) : (
            <>
              {results.posts.length > 0 && (
                <div>
                  <div className="px-2 mb-2 text-xs font-medium text-[var(--md-on-surface-variant)]">
                    文章 ({results.posts.length})
                  </div>
                  <div className="space-y-1">
                    {results.posts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => {
                          onSelectPost(post);
                          onClose();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-[var(--radius-control)] hover:bg-[var(--md-surface-container)] transition-colors flex items-start gap-3 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 mt-1 text-[var(--md-primary)] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[var(--md-on-surface)] truncate">
                            {post.title}
                          </div>
                          <div className="text-xs text-[var(--md-on-surface-variant)] mt-0.5 line-clamp-1">
                            {formatShortDate(post.createdAt)} · {post.excerpt}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.moments.length > 0 && (
                <div>
                  <div className="px-2 mb-2 text-xs font-medium text-[var(--md-on-surface-variant)]">
                    说说 ({results.moments.length})
                  </div>
                  <div className="space-y-1">
                    {results.moments.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onSelectMoments();
                          onClose();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-[var(--radius-control)] hover:bg-[var(--md-surface-container)] transition-colors flex items-start gap-3 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 mt-1 text-[var(--md-tertiary)] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm text-[var(--md-on-surface)] line-clamp-1">
                            {m.content}
                          </div>
                          <div className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                            {m.mood} · {formatShortDate(m.createdAt)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.pages.length > 0 && (
                <div>
                  <div className="px-2 mb-2 text-xs font-medium text-[var(--md-on-surface-variant)]">
                    独立页面 ({results.pages.length})
                  </div>
                  <div className="space-y-1">
                    {results.pages.map((pg) => (
                      <button
                        key={pg.id}
                        type="button"
                        onClick={() => {
                          onSelectPage(pg.slug);
                          onClose();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-[var(--radius-control)] hover:bg-[var(--md-surface-container)] transition-colors cursor-pointer"
                      >
                        <div className="text-sm font-semibold text-[var(--md-on-surface)]">
                          {pg.title}
                        </div>
                        {pg.subtitle && (
                          <div className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                            {pg.subtitle}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
