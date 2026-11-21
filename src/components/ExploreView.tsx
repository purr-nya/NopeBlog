import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Archive,
  Camera,
  ExternalLink,
  FileText,
  Send,
  Users,
} from 'lucide-react';
import type {
  Category,
  Comment,
  FriendLink,
  GalleryItem,
  LightboxSlide,
  Post,
  StandalonePage,
  UserProfile,
} from '../types/blog';
import { blogApi } from '../services/api';
import { sanitizeUrl } from '../utils/markdown';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CommentSection } from './CommentSection';
import { ArchivesView } from './ArchivesView';

export type ExploreTab = 'archives' | 'friends' | 'gallery' | 'pages';

interface ExploreViewProps {
  initialTab?: ExploreTab;
  initialPageSlug?: string | null;
  posts: Post[];
  categories: Category[];
  friends: FriendLink[];
  gallery: GalleryItem[];
  pages: StandalonePage[];
  comments: Comment[];
  currentUser: UserProfile | null;
  likedCommentIds: string[];
  onSelectPost: (post: Post) => void;
  onOpenLightbox: (slides: LightboxSlide[], index: number) => void;
  onSubmitComment: (payload: {
    targetType: 'post' | 'moment' | 'page';
    targetId: string;
    parentId?: string | null;
    author: string;
    email?: string;
    url?: string;
    content: string;
  }) => Promise<{ flaggedSpam: boolean }>;
  onLikeComment: (id: string) => void;
  onDeleteComment: (id: string) => Promise<void>;
}

export function ExploreView({
  initialTab = 'archives',
  initialPageSlug = null,
  posts,
  categories,
  friends,
  gallery,
  pages,
  comments,
  currentUser,
  likedCommentIds,
  onSelectPost,
  onOpenLightbox,
  onSubmitComment,
  onLikeComment,
  onDeleteComment,
}: ExploreViewProps) {
  const [activeTab, setActiveTab] = useState<ExploreTab>(
    initialPageSlug ? 'pages' : initialTab
  );
  const [activePageSlug, setActivePageSlug] = useState<string>(
    initialPageSlug || pages[0]?.slug || 'about'
  );

  // Sync external navigation into Explore tabs
  useEffect(() => {
    if (initialPageSlug) {
      setActiveTab('pages');
      setActivePageSlug(initialPageSlug);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, initialPageSlug]);

  // Friend link application form
  const [friendName, setFriendName] = useState('');
  const [friendUrl, setFriendUrl] = useState('');
  const [friendDesc, setFriendDesc] = useState('');
  const [friendSubmitting, setFriendSubmitting] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);

  const activePage = pages.find((p) => p.slug === activePageSlug) || pages[0];

  const gallerySlides: LightboxSlide[] = useMemo(
    () =>
      gallery.map((item) => ({
        src: item.image,
        title: item.title,
        caption: item.caption,
        meta: `${item.camera} · ${item.lens} · ${item.exif} · ${item.location} (${item.takenAt})`,
      })),
    [gallery]
  );

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
      <section className="m3-card p-6 sm:p-8 fuwari-onload">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--md-on-surface)]">
              探索与专题档案
            </h1>
            <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
              时间归档轴、邻里友链、光影画廊与 Typecho 独立页面均汇聚于此。
            </p>
          </div>

          <div
            role="tablist"
            aria-label="探索页面切换"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]"
          >
            {(
              [
                { id: 'archives', label: '文章归档', icon: Archive },
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
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap transition-colors cursor-pointer ${
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

      {/* Tab 0: Integrated Archives Timeline */}
      {activeTab === 'archives' && (
        <ArchivesView
          posts={posts}
          categories={categories}
          initialCategory={null}
          initialTag={null}
          onSelectPost={onSelectPost}
        />
      )}

      {/* Tab 1: Friends Directory + Self Application */}
      {activeTab === 'friends' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map((friend, idx) => (
              <a
                key={friend.id}
                href={sanitizeUrl(friend.url)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ['--stagger' as string]: Math.min(idx, 8) }}
                className="m3-card m3-card-interactive fuwari-onload p-5 flex items-start gap-4 group"
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
                  <label
                    htmlFor="fr-name"
                    className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                  >
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
                  <label
                    htmlFor="fr-url"
                    className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                  >
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
                <label
                  htmlFor="fr-desc"
                  className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                >
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

      {/* Tab 2: Photography Gallery -> Global Lightbox */}
      {activeTab === 'gallery' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {gallery.map((item, idx) => (
            <figure
              key={item.id}
              style={{ ['--stagger' as string]: Math.min(idx, 8) }}
              className={`m3-card m3-card-interactive fuwari-onload overflow-hidden group ${
                idx === 0 ? 'md:col-span-2' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onOpenLightbox(gallerySlides, idx)}
                aria-label={`在独立灯箱中查看：${item.title}`}
                className="block w-full text-left cursor-zoom-in"
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
              <article className="m3-card p-6 sm:p-10 fuwari-onload">
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
                <MarkdownRenderer
                  content={activePage.content}
                  onOpenImage={(src, alt) =>
                    onOpenLightbox([{ src, title: alt || activePage.title, caption: alt }], 0)
                  }
                />
              </article>

              {activePage.allowComment && (
                <CommentSection
                  targetType="page"
                  targetId={activePage.id}
                  comments={comments}
                  currentUser={currentUser}
                  likedCommentIds={likedCommentIds}
                  onSubmitComment={onSubmitComment}
                  onLikeComment={onLikeComment}
                  onDeleteComment={onDeleteComment}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
