import { useMemo, useState, type FormEvent } from 'react';
import { MessageCircle, Reply, Send } from 'lucide-react';
import type { Comment } from '../types/blog';
import { buildCommentTree, formatRelativeTime, type CommentThreadNode } from '../utils/blogLogic';
import { sanitizeUrl } from '../utils/markdown';

interface CommentSectionProps {
  targetType: 'post' | 'moment' | 'page';
  targetId: string;
  comments: Comment[];
  allowComment?: boolean;
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

function CommentNode({
  node,
  depth,
  onReply,
}: {
  node: CommentThreadNode;
  depth: number;
  onReply: (comment: Comment) => void;
}) {
  const { comment, replies } = node;
  const safeHref = comment.url ? sanitizeUrl(comment.url) : null;

  return (
    <div className={depth > 0 ? 'mt-3 ml-5 sm:ml-8 pl-4 border-l border-[var(--md-outline-variant)]' : ''}>
      <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-display font-bold text-xs shrink-0">
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
              <span className="text-xs text-[var(--md-on-surface-variant)] tabular-nums">
                · {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onReply(comment)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[var(--md-on-surface-variant)] hover:text-[var(--md-primary)] rounded-lg hover:bg-[var(--md-surface-container)] transition-colors cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>回复</span>
          </button>
        </div>

        <p className="mt-2.5 text-sm leading-relaxed text-[var(--md-on-surface)]/90 whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>

      {replies.length > 0 && (
        <div className="space-y-3">
          {replies.map((child) => (
            <CommentNode key={child.comment.id} node={child} depth={depth + 1} onReply={onReply} />
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
  onSubmitComment,
}: CommentSectionProps) {
  const [author, setAuthor] = useState('');
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filteredComments = useMemo(
    () => comments.filter((c) => c.targetType === targetType && c.targetId === targetId),
    [comments, targetType, targetId]
  );

  const tree = useMemo(() => buildCommentTree(filteredComments), [filteredComments]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!author.trim()) {
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
        author: author.trim(),
        email: email.trim() || undefined,
        url: url.trim() || undefined,
        content: content.trim(),
      });
      setContent('');
      setReplyTo(null);
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
    <section aria-label="评论区" className="m3-card p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-[var(--md-on-surface)] flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-[var(--md-primary)]" />
          <span>读者留言</span>
          <span className="font-mono text-sm font-normal tabular-nums text-[var(--md-on-surface-variant)]">
            ({filteredComments.length})
          </span>
        </h3>
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

          <div>
            <label
              htmlFor={`cmt-content-${targetId}`}
              className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
            >
              留言内容 *
            </label>
            <textarea
              id={`cmt-content-${targetId}`}
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下你的想法、问题或共鸣..."
              className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none resize-y"
            />
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
            <CommentNode key={node.comment.id} node={node} depth={0} onReply={setReplyTo} />
          ))}
        </div>
      )}
    </section>
  );
}
