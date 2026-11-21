import { useState, type FormEvent } from 'react';
import { Eye, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { Category, CustomField, Post, PostStatus } from '../types/blog';
import { MarkdownRenderer } from './MarkdownRenderer';

const BUILTIN_COVERS = [
  { label: '默认无封面', url: '' },
  { label: 'M3 几何陶瓷', url: '/src/assets/images/cover_m3_design_1795201622507.jpg' },
  { label: '京都雨夜', url: '/src/assets/images/cover_tokyo_walk_1795201621571.jpg' },
  { label: '橡木书桌', url: '/src/assets/images/cover_desk_setup_1795201622816.jpg' },
  { label: '拂晓湖雾', url: '/src/assets/images/cover_mountain_mist_1795201633310.jpg' },
  { label: '暮色海亭', url: '/src/assets/images/hero_kaze_banner_1795201628975.jpg' },
];

interface AdminPostEditorProps {
  initialPost: Post | null;
  categories: Category[];
  onSave: (payload: Record<string, unknown>, existingId?: string) => Promise<void>;
  onCancel: () => void;
}

export function AdminPostEditor({
  initialPost,
  categories,
  onSave,
  onCancel,
}: AdminPostEditorProps) {
  const [title, setTitle] = useState(initialPost?.title || '');
  const [slug, setSlug] = useState(initialPost?.slug || '');
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || '');
  const [content, setContent] = useState(initialPost?.content || '');
  const [categorySlug, setCategorySlug] = useState(
    initialPost?.categorySlug || categories[0]?.slug || 'design'
  );
  const [tagsText, setTagsText] = useState(initialPost?.tags.join(', ') || '');
  const [status, setStatus] = useState<PostStatus>(initialPost?.status || 'published');
  const [pinned, setPinned] = useState(initialPost?.pinned || false);
  const [allowComment, setAllowComment] = useState(initialPost?.allowComment ?? true);
  const [coverImage, setCoverImage] = useState(initialPost?.coverImage || '');
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [passwordHint, setPasswordHint] = useState(initialPost?.passwordHint || '');
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialPost?.customFields || []
  );
  const [previewMode, setPreviewMode] = useState<'split' | 'write' | 'preview'>('split');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insertSnippet = (snippet: string) => {
    setContent((prev) => `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}${snippet}`);
  };

  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { key: '', value: '' }]);
  };

  const updateCustomField = (index: number, patch: Partial<CustomField>) => {
    setCustomFields((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('请填写文章标题');
      return;
    }
    setSaving(true);
    try {
      const tags = tagsText
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const payload: Record<string, unknown> = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim(),
        content,
        categorySlug,
        tags,
        status,
        pinned,
        allowComment,
        coverImage: coverImage.trim(),
        passwordHint: passwordHint.trim(),
        customFields: customFields.filter((f) => f.key.trim()),
      };
      if (password.trim()) {
        payload.password = password.trim();
      } else if (clearPassword) {
        payload.clearPassword = true;
      }
      await onSave(payload, initialPost?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-[var(--md-on-surface)]">
          {initialPost ? '编辑 Typecho 文章' : '撰写新文章'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>返回列表</span>
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? '保存中...' : '保存文章'}</span>
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Title & Slug */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <label htmlFor="ed-title" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">
            文章标题 *
          </label>
          <input
            id="ed-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入富有表现力的文章标题..."
            className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
          />
        </div>
        <div>
          <label htmlFor="ed-slug" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">
            自定义缩略名 (Slug)
          </label>
          <input
            id="ed-slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="留空自动生成"
            className="w-full px-3.5 py-2.5 text-sm font-mono rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
          />
        </div>
      </div>

      {/* Metadata Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label htmlFor="ed-cat" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">
            所属分类
          </label>
          <select
            id="ed-cat"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ed-status" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">
            发布状态
          </label>
          <select
            id="ed-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PostStatus)}
            className="w-full px-3 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
          >
            <option value="published">已发布</option>
            <option value="draft">草稿箱</option>
            <option value="private">仅自己可见</option>
          </select>
        </div>

        <div>
          <label htmlFor="ed-tags" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">
            标签（逗号分隔）
          </label>
          <input
            id="ed-tags"
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="设计, TypeScript, 随笔"
            className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
          />
        </div>

        <div>
          <label htmlFor="ed-cover" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">
            文章封面图
          </label>
          <select
            id="ed-cover"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
          >
            {BUILTIN_COVERS.map((c) => (
              <option key={c.label} value={c.url}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label htmlFor="ed-excerpt" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1">
          文章摘要
        </label>
        <input
          id="ed-excerpt"
          type="text"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="留空将自动从正文前 140 字提取..."
          className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
        />
      </div>

      {/* Markdown Toolbar & Split Preview */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: '二级标题', snip: '## 小节标题\n' },
              { label: 'Fuwari 提示框', snip: ':::tip 提示\n在这里补充一段说明。\n:::\n' },
              { label: '代码块', snip: '```ts\nconsole.log("KazeBlog");\n```\n' },
              { label: '引用', snip: '> 一句值得被记住的话。\n' },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => insertSnippet(btn.snip)}
                className="px-2.5 py-1 text-xs rounded-lg bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] cursor-pointer"
              >
                + {btn.label}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--md-surface-container)] text-xs">
            {(
              [
                { id: 'write', label: '仅编辑', icon: Pencil },
                { id: 'split', label: '双栏预览', icon: Eye },
                { id: 'preview', label: '纯预览', icon: Eye },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPreviewMode(m.id)}
                className={`px-2.5 py-1 rounded-md cursor-pointer ${
                  previewMode === m.id
                    ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                    : 'text-[var(--md-on-surface-variant)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`grid gap-4 ${
            previewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {previewMode !== 'preview' && (
            <textarea
              aria-label="Markdown 正文编辑器"
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="使用 Markdown 开始写作..."
              className="w-full p-4 text-sm font-mono leading-relaxed rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none resize-y"
            />
          )}
          {previewMode !== 'write' && (
            <div className="p-5 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] max-h-[380px] overflow-y-auto">
              {content.trim() ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-xs text-[var(--md-on-surface-variant)]">
                  左侧输入 Markdown 后，此处实时渲染安全预览。
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Typecho Switches, Password Protection & Custom Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] space-y-3">
          <div className="text-xs font-semibold text-[var(--md-on-surface)]">
            文章权限与加密设置
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-[var(--md-on-surface)]">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="accent-[var(--md-primary)]"
              />
              <span>首页置顶文章</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowComment}
                onChange={(e) => setAllowComment(e.target.checked)}
                className="accent-[var(--md-primary)]"
              />
              <span>允许读者评论</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div>
              <label htmlFor="ed-pwd" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                访问密码（选填）
              </label>
              <input
                id="ed-pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={initialPost?.hasPassword ? '已加密（留空保持原密码）' : '留空为公开文章'}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
              />
            </div>
            <div>
              <label htmlFor="ed-hint" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                密码提示语
              </label>
              <input
                id="ed-hint"
                type="text"
                value={passwordHint}
                onChange={(e) => setPasswordHint(e.target.value)}
                placeholder="例如：输入暗号解锁"
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
              />
            </div>
          </div>

          {initialPost?.hasPassword && (
            <label className="inline-flex items-center gap-2 text-xs text-[var(--md-on-surface-variant)] cursor-pointer">
              <input
                type="checkbox"
                checked={clearPassword}
                onChange={(e) => setClearPassword(e.target.checked)}
              />
              <span>移除当前密码保护并设为公开</span>
            </label>
          )}
        </div>

        {/* Typecho Custom Fields KV Editor */}
        <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--md-on-surface)]">
              Typecho 自定义字段 (Custom Fields)
            </span>
            <button
              type="button"
              onClick={addCustomField}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增字段</span>
            </button>
          </div>

          {customFields.length === 0 ? (
            <p className="text-xs text-[var(--md-on-surface-variant)]">
              可附加拍摄器材、地点、参考来源等任意元数据字段。
            </p>
          ) : (
            <div className="space-y-2">
              {customFields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateCustomField(idx, { key: e.target.value })}
                    placeholder="字段名"
                    aria-label={`自定义字段名 ${idx + 1}`}
                    className="w-1/3 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                  />
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateCustomField(idx, { value: e.target.value })}
                    placeholder="字段值"
                    aria-label={`自定义字段值 ${idx + 1}`}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomField(idx)}
                    aria-label={`删除自定义字段 ${idx + 1}`}
                    className="p-1.5 rounded-lg hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
