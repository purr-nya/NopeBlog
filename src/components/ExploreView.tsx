import { useState, type FormEvent } from 'react';
import {
  Camera,
  ExternalLink,
  FileText,
  Send,
  Users,
  X,
} from 'lucide-react';
import type { Comment, FriendLink, GalleryItem, StandalonePage } from '../types/blog';
import { blogApi } from '../services/api';
import { sanitizeUrl } from '../utils/markdown';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CommentSection } from './CommentSection';

export type ExploreTab = 'friends' | 'gallery' | 'pages';

interface ExploreViewProps {
  initialTab?: ExploreTab;
  initialPageSlug?: string | null;
  friends: FriendLink[];
  gallery: GalleryItem[];
  pages: StandalonePage[];
  comments: Comment[];
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

export function ExploreView({
  initialTab = 'friends',
  initialPageSlug = null,
  friends,
  gallery,
  pages,
  comments,
  onSubmitComment,
}: ExploreViewProps) {
  const [activeTab, setActiveTab] = useState<ExploreTab>(
    initialPageSlug ? 'pages' : initialTab
  );
  const [activePageSlug, setActivePageSlug] = useState<string>(
    initialPageSlug || pages[0]?.slug || 'about'
  );
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  // Friend link application form
  const [friendName, setFriendName] = useState('');
  const [friendUrl, setFriendUrl] = useState('');
  const [friendDesc, setFriendDesc] = useState('');
  const [friendSubmitting, setFriendSubmitting] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);

  const activePage = pages.find((p) => p.slug === activePageSlug) || pages[0];

  const handleFriendApply = async (e: FormEvent) => {
    e.preventDefault();
    setFriendError(null);
    setFriendSuccess(null);
    if (!friendName.trim() || !friendUrl.trim() || !friendDesc.trim()) {
      setFriendError('请完整填写站点名称、链接地址与简介');
      return;
    }
    setFriendSubmitting(true);
    try {
      const res = await blogApi.applyFriendLink({
        name: friendName.trim(),
        url: friendUrl.trim(),
        description: friendDesc.trim(),
      });
      setFriendSuccess(res.message);
      setFriendName('');
      setFriendUrl('');
      setFriendDesc('');
    } catch (err) {
      setFriendError(err instanceof Error ? err.message : '提交申请失败');
    } finally {
      setFriendSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Segmented Sub-Page Navigation */}
      <section className="m3-card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--md-on-surface)]">
              探索与更多页面
            </h1>
            <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
              浏览邻里友链、摄影光影画廊，以及通过 Typecho 独立页面创建的专题档案。
            </p>
          </div>

          <div
            role="tablist"
            aria-label="探索页面切换"
            className="inline-flex items-center gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]"
          >
            {(
              [
                { id: 'friends', label: '邻里友链', icon: Users },
                { id: 'gallery', label: '光影画廊', icon: Camera },
                { id: 'pages', label: '独立页面与关于', icon: FileText },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                      : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tab 1: Friends Directory + Self Application */}
      {activeTab === 'friends' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map((friend) => (
              <a
                key={friend.id}
                href={sanitizeUrl(friend.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="m3-card p-5 flex items-start gap-4 hover:border-[var(--md-primary)]/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-display font-bold text-lg inline-flex items-center justify-center shrink-0">
                  {friend.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display font-semibold text-base text-[var(--md-on-surface)] group-hover:text-[var(--md-primary)] truncate">
                      {friend.name}
                    </h2>
                    <ExternalLink className="w-4 h-4 text-[var(--md-on-surface-variant)] shrink-0" />
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-[var(--md-on-surface-variant)] line-clamp-2 leading-relaxed">
                    {friend.description}
                  </p>
                </div>
              </a>
            ))}
          </section>

          {/* Self-Service Friend Link Application */}
          <section className="m3-card p-6 sm:p-8 space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                申请交换友链
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[var(--md-on-surface-variant)]">
                提交你的独立博客信息后，将进入后台友链审核列表，博主通过后即刻展示在上方邻里名录。
              </p>
            </div>

            <form onSubmit={handleFriendApply} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fr-name" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5">
                    站点名称 *
                  </label>
                  <input
                    id="fr-name"
                    type="text"
                    value={friendName}
                    onChange={(e) => setFriendName(e.target.value)}
                    placeholder="例如：微风日志"
                    className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="fr-url" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5">
                    站点链接 *
                  </label>
                  <input
                    id="fr-url"
                    type="url"
                    value={friendUrl}
                    onChange={(e) => setFriendUrl(e.target.value)}
                    placeholder="https://yourblog.example"
                    className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fr-desc" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5">
                  一句话简介 *
                </label>
                <input
                  id="fr-desc"
                  type="text"
                  value={friendDesc}
                  onChange={(e) => setFriendDesc(e.target.value)}
                  placeholder="介绍你的写作主题或兴趣方向"
                  className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                />
              </div>

              {friendError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {friendError}
                </p>
              )}
              {friendSuccess && (
                <p className="text-xs font-medium text-[var(--md-primary)]">{friendSuccess}</p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={friendSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{friendSubmitting ? '提交中...' : '提交友链申请'}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Tab 2: Photography Gallery with EXIF & Fullscreen Lightbox */}
      {activeTab === 'gallery' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {gallery.map((item, idx) => (
            <figure
              key={item.id}
              className={`m3-card overflow-hidden group ${idx === 0 ? 'md:col-span-2' : ''}`}
            >
              <button
                type="button"
                onClick={() => setLightboxItem(item)}
                className="block w-full text-left cursor-pointer"
              >
                <div
                  className={`relative overflow-hidden bg-[var(--md-surface-container-high)] ${
                    idx === 0 ? 'h-72 sm:h-96' : 'h-60'
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <figcaption className="p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                      {item.title}
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-[var(--md-on-surface-variant)]">
                      {item.camera} · {item.exif}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--md-on-surface-variant)]">
                    {item.caption}
                  </p>
                  <div className="mt-2 text-xs text-[var(--md-on-surface-variant)]">
                    {item.location} · {item.takenAt}
                  </div>
                </figcaption>
              </button>
            </figure>
          ))}
        </section>
      )}

      {/* Tab 3: Typecho Standalone Pages */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {pages.map((pg) => {
              const selected = activePage?.id === pg.id;
              return (
                <button
                  key={pg.id}
                  type="button"
                  onClick={() => setActivePageSlug(pg.slug)}
                  className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-control)] whitespace-nowrap transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                      : 'bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                  }`}
                >
                  {pg.title}
                </button>
              );
            })}
          </div>

          {activePage && (
            <>
              <article className="m3-card p-6 sm:p-10">
                <div className="text-xs text-[var(--md-on-surface-variant)]">
                  独立页面 · /{activePage.slug}
                </div>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[var(--md-on-surface)]">
                  {activePage.title}
                </h2>
                {activePage.subtitle && (
                  <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
                    {activePage.subtitle}
                  </p>
                )}
                <hr className="my-6 border-[var(--md-outline-variant)]/70" />
                <MarkdownRenderer content={activePage.content} />
              </article>

              {activePage.allowComment && (
                <CommentSection
                  targetType="page"
                  targetId={activePage.id}
                  comments={comments}
                  onSubmitComment={onSubmitComment}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Fullscreen Photography Lightbox */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.title}
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full bg-[var(--md-surface-container-lowest)] rounded-[var(--radius-card)] overflow-hidden border border-[var(--md-outline-variant)]"
          >
            <div className="relative bg-black">
              <img
                src={lightboxItem.image}
                alt={lightboxItem.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[70vh] object-contain mx-auto"
              />
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                aria-label="关闭大图预览"
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/70 text-white inline-flex items-center justify-center hover:bg-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                  {lightboxItem.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--md-on-surface-variant)]">
                  {lightboxItem.caption}
                </p>
              </div>
              <div className="text-right font-mono text-xs tabular-nums text-[var(--md-on-surface-variant)]">
                <div>{lightboxItem.camera} · {lightboxItem.lens}</div>
                <div className="mt-0.5">{lightboxItem.exif} · {lightboxItem.location}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
