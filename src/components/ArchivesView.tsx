import { useMemo, useState } from 'react';
import { Lock, Search } from 'lucide-react';
import type { Category, Post } from '../types/blog';
import { filterAndSortPosts, groupPostsByYear } from '../utils/blogLogic';

interface ArchivesViewProps {
  posts: Post[];
  categories: Category[];
  initialCategory: string | null;
  initialTag: string | null;
  onSelectPost: (post: Post) => void;
}

export function ArchivesView({
  posts,
  categories,
  initialCategory,
  initialTag,
  onSelectPost,
}: ArchivesViewProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag);

  const filtered = useMemo(
    () =>
      filterAndSortPosts(posts, {
        categorySlug: selectedCategory,
        tag: selectedTag,
        query,
      }),
    [posts, selectedCategory, selectedTag, query]
  );

  const yearGroups = useMemo(() => groupPostsByYear(filtered), [filtered]);

  return (
    <div className="space-y-6">
      <section className="m3-card p-6 sm:p-8 space-y-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--md-on-surface)]">
            文章时间轴归档
          </h1>
          <p className="mt-2 text-sm text-[var(--md-on-surface-variant)] tabular-nums">
            共检索到 {filtered.length} 篇已发布作品，按发布年份纵向编排。
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="按标题、摘要或标签快速筛选..."
              aria-label="筛选归档文章"
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
            />
          </div>

          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            aria-label="按分类筛选归档"
            className="px-4 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none cursor-pointer"
          >
            <option value="">全部分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          {(selectedCategory || selectedTag || query) && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedCategory(null);
                setSelectedTag(null);
              }}
              className="px-4 py-2.5 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] whitespace-nowrap shrink-0 cursor-pointer"
            >
              重置筛选
            </button>
          )}
        </div>

        {selectedTag && (
          <div className="text-xs text-[var(--md-primary)]">
            当前标签筛选：{selectedTag}
          </div>
        )}
      </section>

      {/* Fuwari Vertical Dashed Timeline */}
      {yearGroups.length === 0 ? (
        <div className="m3-card p-12 text-center text-sm text-[var(--md-on-surface-variant)]">
          没有匹配当前筛选条件的文章，请尝试更换关键词或清除过滤。
        </div>
      ) : (
        <div className="m3-card p-6 sm:p-8 space-y-10">
          {yearGroups.map((group) => (
            <section key={group.year} aria-label={`${group.year}年归档`}>
              <div className="flex items-baseline gap-4 mb-5">
                <h2 className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-[var(--md-primary)]">
                  {group.year}
                </h2>
                <span className="text-xs text-[var(--md-on-surface-variant)] tabular-nums">
                  {group.posts.length} 篇文章
                </span>
              </div>

              <div className="relative pl-6 border-l border-dashed border-[var(--md-outline-variant)] space-y-3">
                {group.posts.map((post) => {
                  const dt = new Date(post.createdAt);
                  const md = `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
                    dt.getDate()
                  ).padStart(2, '0')}`;
                  const catName =
                    categories.find((c) => c.slug === post.categorySlug)?.name || post.categorySlug;

                  return (
                    <div key={post.id} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[29px] top-3.5 w-2.5 h-2.5 rounded-full bg-[var(--md-primary)] ring-4 ring-[var(--md-surface-container-lowest)]"
                      />
                      <button
                        type="button"
                        onClick={() => onSelectPost(post)}
                        className="w-full text-left px-4 py-3 rounded-[var(--radius-control)] hover:bg-[var(--md-surface-container-low)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="flex items-baseline gap-3 min-w-0">
                          <span className="font-mono text-xs tabular-nums text-[var(--md-on-surface-variant)] shrink-0">
                            {md}
                          </span>
                          <span className="font-medium text-sm sm:text-base text-[var(--md-on-surface)] truncate flex items-center gap-1.5">
                            {post.hasPassword && (
                              <Lock className="w-3.5 h-3.5 text-[var(--md-tertiary)] shrink-0" />
                            )}
                            <span className="truncate">{post.title}</span>
                          </span>
                        </div>

                        <div className="text-xs text-[var(--md-on-surface-variant)] shrink-0">
                          {catName} · {post.tags.slice(0, 2).join(' / ')}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
