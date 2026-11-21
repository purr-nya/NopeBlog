import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Heart,
  KeyRound,
  List,
  Lock,
} from 'lucide-react';
import type { Category, Comment, Post } from '../types/blog';
import { formatShortDate } from '../utils/blogLogic';
import { countWords, estimateReadingMinutes, parseMarkdown } from '../utils/markdown';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CommentSection } from './CommentSection';

interface PostDetailViewProps {
  post: Post;
  allPosts: Post[];
  categories: Category[];
  comments: Comment[];
  unlockedContent?: string;
  isSaved: boolean;
  onBack: () => void;
  onSelectPost: (post: Post) => void;
  onLikePost: (id: string) => void;
  onToggleSave: (id: string) => void;
  onUnlockPost: (id: string, password: string) => Promise<void>;
  onSubmitComment: (payload: {
    targetType: 'post' | 'moment' | 'page';
    targetId: string;
    parentId?: string | null;
    author: string;
    email?: string;
    url?: string;
    content: string;
  }) => Promise<{ flaggedSpam: boolean }>;
}

export function PostDetailView({
  post,
  allPosts,
  categories,
  comments,
  unlockedContent,
  isSaved,
  onBack,
  onSelectPost,
  onLikePost,
  onToggleSave,
  onUnlockPost,
  onSubmitComment,
}: PostDetailViewProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const effectiveContent = post.hasPassword ? unlockedContent || '' : post.content;
  const isLocked = post.hasPassword && !unlockedContent;

  const { toc } = useMemo(() => parseMarkdown(effectiveContent), [effectiveContent]);
  const category = categories.find((c) => c.slug === post.categorySlug);
  const words = countWords(effectiveContent || post.excerpt);
  const minutes = estimateReadingMinutes(effectiveContent || post.excerpt);

  const currentIdx = allPosts.findIndex((p) => p.id === post.id);
  const prevPost = currentIdx > 0 ? allPosts[currentIdx - 1] : null;
  const nextPost = currentIdx >= 0 && currentIdx < allPosts.length - 1 ? allPosts[currentIdx + 1] : null;

  useEffect(() => {
    setPasswordInput('');
    setUnlockError(null);
  }, [post.id]);

  const handleUnlockSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    if (!passwordInput.trim()) {
      setUnlockError('请输入文章访问密码');
      return;
    }
    setUnlocking(true);
    try {
      await onUnlockPost(post.id, passwordInput.trim());
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : '解锁失败');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Return Bar */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回文章列表</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Main Reading Surface */}
        <article className="xl:col-span-9 m3-card overflow-hidden">
          {post.coverImage && (
            <div className="relative h-60 sm:h-80 w-full bg-[var(--md-surface-container-high)] overflow-hidden">
              <img
                src={post.coverImage}
                alt={post.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"
              />
            </div>
          )}

          <div className="p-6 sm:p-10">
            {/* Unboxed Metadata */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-[var(--md-on-surface-variant)]">
              <span>{category?.name || post.categorySlug}</span>
              <span aria-hidden="true">·</span>
              <time className="tabular-nums">发布于 {formatShortDate(post.createdAt)}</time>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{words} 字 / 约 {minutes} 分钟</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{post.views} 次阅读</span>
            </div>

            <h1 className="mt-3 font-display text-2xl sm:text-4xl font-bold leading-tight text-[var(--md-on-surface)] [text-wrap:balance]">
              {post.title}
            </h1>

            {/* Typecho Custom Fields Panel */}
            {post.customFields.length > 0 && (
              <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)]">
                {post.customFields.map((field) => (
                  <div key={field.key}>
                    <dt className="text-[11.5px] text-[var(--md-on-surface-variant)]">
                      {field.key}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-[var(--md-on-surface)]">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <hr className="my-7 border-[var(--md-outline-variant)]/70" />

            {/* Encrypted Post Password Gate or Markdown Body */}
            {isLocked ? (
              <div className="my-8 p-6 sm:p-8 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] max-w-lg mx-auto text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] inline-flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-[var(--md-on-surface)]">
                    此文章受 Typecho 访问密码保护
                  </h2>
                  <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
                    {post.passwordHint || '请输入访问密码以解锁完整正文内容。'}
                  </p>
                </div>

                <form onSubmit={handleUnlockSubmit} className="space-y-3 text-left">
                  <label htmlFor="post-password-input" className="sr-only">
                    文章访问密码
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="post-password-input"
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="输入访问密码..."
                      className="flex-1 px-4 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                    />
                    <button
                      type="submit"
                      disabled={unlocking}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>{unlocking ? '校验中...' : '解锁阅读'}</span>
                    </button>
                  </div>
                  {unlockError && (
                    <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                      {unlockError}
                    </p>
                  )}
                </form>
              </div>
            ) : (
              <MarkdownRenderer content={effectiveContent} />
            )}

            {/* Tags & Engagement Bar */}
            <div className="mt-10 pt-6 border-t border-[var(--md-outline-variant)] flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-[var(--md-on-surface-variant)]">
                标签：{post.tags.join(' / ') || '未归类'}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onLikePost(post.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Heart className="w-4 h-4" />
                  <span className="tabular-nums">点赞 · {post.likes}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleSave(post.id)}
                  aria-pressed={isSaved}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-[var(--md-primary)]' : ''}`} />
                  <span>{isSaved ? '已收藏' : '收藏'}</span>
                </button>
              </div>
            </div>
          </div>
        </article>

        {/* Right Sticky Table of Contents */}
        <aside className="xl:col-span-3 xl:sticky xl:top-24 space-y-4">
          <div className="m3-card p-5">
            <h2 className="font-display text-sm font-semibold text-[var(--md-on-surface)] flex items-center gap-2 mb-3">
              <List className="w-4 h-4 text-[var(--md-primary)]" />
              <span>文章目录</span>
            </h2>
            {toc.length === 0 ? (
              <p className="text-xs text-[var(--md-on-surface-variant)]">
                {isLocked ? '解锁后生成完整目录导航' : '本文无多级小节标题'}
              </p>
            ) : (
              <nav aria-label="文章目录" className="space-y-1.5">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block text-xs leading-snug py-1 text-[var(--md-on-surface-variant)] hover:text-[var(--md-primary)] transition-colors ${
                      item.level === 2 ? 'pl-3' : item.level >= 3 ? 'pl-6' : 'font-medium text-[var(--md-on-surface)]'
                    }`}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </aside>
      </div>

      {/* Previous / Next Post Navigation */}
      <nav
        aria-label="上下篇文章"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {prevPost ? (
          <button
            type="button"
            onClick={() => onSelectPost(prevPost)}
            className="m3-card p-5 text-left hover:border-[var(--md-primary)]/50 transition-colors cursor-pointer"
          >
            <div className="text-xs text-[var(--md-on-surface-variant)] flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>上一篇</span>
            </div>
            <div className="mt-1.5 font-display font-semibold text-[var(--md-on-surface)] line-clamp-1">
              {prevPost.title}
            </div>
          </button>
        ) : (
          <div />
        )}

        {nextPost && (
          <button
            type="button"
            onClick={() => onSelectPost(nextPost)}
            className="m3-card p-5 text-right hover:border-[var(--md-primary)]/50 transition-colors cursor-pointer"
          >
            <div className="text-xs text-[var(--md-on-surface-variant)] inline-flex items-center gap-1">
              <span>下一篇</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <div className="mt-1.5 font-display font-semibold text-[var(--md-on-surface)] line-clamp-1">
              {nextPost.title}
            </div>
          </button>
        )}
      </nav>

      {/* Threaded Comments */}
      <CommentSection
        targetType="post"
        targetId={post.id}
        comments={comments}
        allowComment={post.allowComment}
        onSubmitComment={onSubmitComment}
      />
    </div>
  );
}
