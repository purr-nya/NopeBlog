import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Eye,
  Heart,
  MessageCircle,
  PenLine,
  Reply,
  Send,
  Trash2,
} from 'lucide-react';
import type { Comment, UserProfile } from '../types/blog';
import { buildCommentTree, formatRelativeTime, type CommentThreadNode } from '../utils/blogLogic';
import { sanitizeUrl } from '../utils/markdown';
import { MarkdownRenderer } from './MarkdownRenderer';

interface CommentSectionProps {
  targetType: 'post' | 'moment' | 'page';
  targetId: string;
  comments: Comment[];
  allowComment?: boolean;
  currentUser?: UserProfile | null;
  likedCommentIds?: string[];
  onSubmitComment: (payload: {
    targetType: 'post' | 'moment' | 'page';
    targetId: string;
    parentId?: string | null;
    author: string;
    email?: string;
    url?: string;
    content: string;
  }) => Promise<{ flaggedSpam: boolean }>;
  onLikeComment?: (id: string) => void;
  onDeleteComment?: (id: string) => Promise<void>;
}

const QUICK_EMOJIS = ['✨', '🌿', '☕', '📷', '🔥', '👏', '💡', '🎉'];

function CommentNode({
  node,
  depth,
  currentUser,
  likedCommentIds,
  poppingId,
  onReply,
  onLike,
  onDelete,
}: {
  node: CommentThreadNode;
  depth: number;
  currentUser?: UserProfile | null;
  likedCommentIds: string[];
  poppingId: string | null;
  onReply: (comment: Comment) => void;
  onLike: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
}) {
  const { comment, replies } = node;
  const safeHref = comment.url ? sanitizeUrl(comment.url) : null;
  const isLiked = likedCommentIds.includes(comment.id);
  const canDelete = Boolean(
    onDelete && currentUser && comment.userId && comment.userId === currentUser.id
  );

  return (
    <div
      className={
        depth > 0
          ? 'mt-3 ml-4 sm:ml-8 pl-3.5 sm:pl-4 border-l border-[var(--md-outline-variant)]'
          : ''
      }
    >
      <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-sm">
            <span
              style={
                comment.avatarHue !== undefined
                  ? { backgroundColor: `oklch(0.70 0.13 ${comment.avatarHue})`, color: '#ffffff' }
                  : undefined
              }
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-display font-bold text-xs shrink-0"
            >
              {comment.author.slice(0, 1).toUpperCase()}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              {safeHref && safeHref !== '#' ? (
                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[var(--md-on-surface)] hover:text-[var(--md-primary)] transition-colors"
                >
                  {comment.author}
                </a>
              ) : (
                <span className="font-semibold text-[var(--md-on-surface)]">{comment.author}</span>
              )}
              {comment.isAdmin && (
                <span className="text-xs font-medium text-[var(--md-primary)]">· 博主</span>
              )}
              {!comment.isAdmin && comment.userId && (
                <span className="text-xs text-[var(--md-primary)]">· 认证会员</span>
              )}
              <span className="text-xs text-[var(--md-on-surface-variant)] tabular-nums">
                · {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onLike(comment.id)}
              aria-pressed={isLiked}
              aria-label={`给 ${comment.author} 的评论点赞，当前 ${comment.likes} 赞`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                isLiked
                  ? 'bg-rose-500/12 text-rose-600 dark:text-rose-400 font-medium'
                  : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container)] hover:text-rose-500'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''} ${
                  poppingId === comment.id ? 'animate-heart-pop' : ''
                }`}
              />
              <span className="tabular-nums">{comment.likes || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => onReply(comment)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[var(--md-on-surface-variant)] hover:text-[var(--md-primary)] rounded-lg hover:bg-[var(--md-surface-container)] transition-colors cursor-pointer"
            >
              <Reply className="w-3.5 h-3.5" />
              <span>回复</span>
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={() => void onDelete!(comment.id)}
                aria-label="删除我的评论"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除</span>
              </button>
            )}
          </div>
        </div>

        <p className="mt-2.5 text-sm leading-relaxed text-[var(--md-on-surface)]/90 whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>

      {replies.length > 0 && (
        <div className="space-y-3">
          {replies.map((child) => (
            <CommentNode
              key={child.comment.id}
              node={child}
              depth={depth + 1}
              currentUser={currentUser}
              likedCommentIds={likedCommentIds}
              poppingId={poppingId}
              onReply={onReply}
              onLike={onLike}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({
  targetType,
  targetId,
  comments,
  allowComment = true,
  currentUser = null,
  likedCommentIds = [],
  onSubmitComment,
  onLikeComment,
  onDeleteComment,
}: CommentSectionProps) {
  const [author, setAuthor] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sortBy, setSortBy] = useState<'latest' | 'hot'>('latest');
  const [composerTab, setComposerTab] = useState<'write' | 'preview'>('write');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [poppingId, setPoppingId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setAuthor(currentUser.displayName);
      setEmail(currentUser.email);
    }
  }, [currentUser]);

  const filteredComments = useMemo(
    () => comments.filter((c) => c.targetType === targetType && c.targetId === targetId),
    [comments, targetType, targetId]
  );

  const tree = useMemo(() => {
    const built = buildCommentTree(filteredComments);
    if (sortBy === 'hot') {
      return [...built].sort((a, b) => {
        if ((b.comment.likes || 0) !== (a.comment.likes || 0)) {
          return (b.comment.likes || 0) - (a.comment.likes || 0);
        }
        return b.comment.createdAt.localeCompare(a.comment.createdAt);
      });
    }
    return [...built].sort((a, b) => b.comment.createdAt.localeCompare(a.comment.createdAt));
  }, [filteredComments, sortBy]);

  const handleLikeClick = (id: string) => {
    if (!onLikeComment) return;
    setPoppingId(id);
    setTimeout(() => setPoppingId((cur) => (cur === id ? null : cur)), 340);
    onLikeComment(id);
  };

  const insertSnippet = (snippet: string) => {
    setComposerTab('write');
    setContent((prev) => `${prev}${snippet}`);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const effectiveAuthor = (currentUser?.displayName || author).trim();
    if (!effectiveAuthor) {
      setError('请先填写你的昵称');
      return;
    }
    if (!content.trim()) {
      setError('请输入留言内容');
      return;
    }

    setSubmitting(true);
    try {
      const res = await onSubmitComment({
        targetType,
        targetId,
        parentId: replyTo?.id ?? null,
        author: effectiveAuthor,
        email: (currentUser?.email || email).trim() || undefined,
        url: url.trim() || undefined,
        content: content.trim(),
      });
      setContent('');
      setReplyTo(null);
      setComposerTab('write');
      setNotice(
        res.flaggedSpam
          ? '你的评论已进入反垃圾审核队列，待博主确认后公开展示。'
          : '评论已发布，感谢你的真诚交流。'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '评论提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-label="评论区" className="m3-card p-5 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-[var(--md-on-surface)] flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-[var(--md-primary)]" />
          <span>读者留言</span>
          <span className="font-mono text-sm font-normal tabular-nums text-[var(--md-on-surface-variant)]">
            ({filteredComments.length})
          </span>
        </h3>

        {filteredComments.length > 1 && (
          <div
            role="group"
            aria-label="评论排序方式"
            className="inline-flex items-center gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]"
          >
            <button
              type="button"
              aria-pressed={sortBy === 'latest'}
              onClick={() => setSortBy('latest')}
              className={`px-3 py-1 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] transition-colors cursor-pointer ${
                sortBy === 'latest'
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              最新
            </button>
            <button
              type="button"
              aria-pressed={sortBy === 'hot'}
              onClick={() => setSortBy('hot')}
              className={`px-3 py-1 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] transition-colors cursor-pointer ${
                sortBy === 'hot'
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              最热
            </button>
          </div>
        )}
      </div>

      {allowComment ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {replyTo && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-[var(--radius-control)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] text-xs">
              <span>正在回复 @{replyTo.author}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="underline font-medium cursor-pointer"
              >
                取消回复
              </button>
            </div>
          )}

          {currentUser ? (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] text-xs text-[var(--md-on-surface-variant)]">
              <span>
                正以会员身份{' '}
                <strong className="text-[var(--md-on-surface)]">{currentUser.displayName}</strong>{' '}
                (@{currentUser.username}) 发表留言
              </span>
              <span className="text-[var(--md-primary)]">支持随时撤回自己的评论</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor={`cmt-author-${targetId}`}
                  className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                >
                  昵称 *
                </label>
                <input
                  id={`cmt-author-${targetId}`}
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="怎么称呼你"
                  className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={`cmt-email-${targetId}`}
                  className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                >
                  邮箱（选填，不公开）
                </label>
                <input
                  id={`cmt-email-${targetId}`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor={`cmt-url-${targetId}`}
                  className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                >
                  个人站点（选填）
                </label>
                <input
                  id={`cmt-url-${targetId}`}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                />
              </div>
            </div>
          )}

          {/* Composer Toolbar: Write / Preview + Emoji + Quick Markdown */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--md-surface-container)]">
                <button
                  type="button"
                  onClick={() => setComposerTab('write')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                    composerTab === 'write'
                      ? 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] font-medium'
                      : 'text-[var(--md-on-surface-variant)]'
                  }`}
                >
                  <PenLine className="w-3 h-3" />
                  <span>撰写</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComposerTab('preview')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                    composerTab === 'preview'
                      ? 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] font-medium'
                      : 'text-[var(--md-on-surface-variant)]'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>预览</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertSnippet(emoji)}
                    aria-label={`插入表情 ${emoji}`}
                    className="w-7 h-7 rounded-lg text-sm hover:bg-[var(--md-surface-container)] transition-colors cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => insertSnippet('**重点**')}
                  className="px-2 py-1 text-[11px] font-mono rounded-md bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] cursor-pointer"
                >
                  **粗体**
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('`code`')}
                  className="px-2 py-1 text-[11px] font-mono rounded-md bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] cursor-pointer"
                >
                  `代码`
                </button>
              </div>
            </div>

            {composerTab === 'write' ? (
              <textarea
                id={`cmt-content-${targetId}`}
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                aria-label="留言内容"
                placeholder="写下你的想法、问题或共鸣..."
                className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none resize-y"
              />
            ) : (
              <div className="min-h-[92px] p-4 rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)]">
                {content.trim() ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <p className="text-xs text-[var(--md-on-surface-variant)]">
                    尚未输入留言内容，切换回“撰写”即可编辑。
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-xs text-[var(--md-primary)] font-medium">{notice}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 disabled:opacity-60 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? '提交中...' : '发表评论'}</span>
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-[var(--md-on-surface-variant)]">
          本文已由作者关闭评论功能。
        </p>
      )}

      {/* Comment Thread List */}
      {tree.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--md-on-surface-variant)]">
          还没有人留言，来做第一位留下足迹的朋友吧。
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          {tree.map((node) => (
            <CommentNode
              key={node.comment.id}
              node={node}
              depth={0}
              currentUser={currentUser}
              likedCommentIds={likedCommentIds}
              poppingId={poppingId}
              onReply={setReplyTo}
              onLike={handleLikeClick}
              onDelete={onDeleteComment}
            />
          ))}
        </div>
      )}
    </section>
  );
}
