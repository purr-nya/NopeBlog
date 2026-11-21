import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  BarChart2,
  Bookmark,
  Calendar,
  Check,
  Heart,
  Link2,
  MapPin,
  MessageCircle,
  Music,
  Pin,
  Repeat2,
  Share2,
} from 'lucide-react';
import type {
  Comment,
  LightboxSlide,
  Moment,
  SiteConfig,
  UserProfile,
} from '../types/blog';
import { formatRelativeTime } from '../utils/blogLogic';
import { CommentSection } from './CommentSection';

type TwitterTab = 'posts' | 'media' | 'pinned' | 'likes';

interface TwitterMomentsSkinProps {
  config: SiteConfig;
  moments: Moment[];
  comments: Comment[];
  currentUser: UserProfile | null;
  likedMomentIds: string[];
  repostedMomentIds: string[];
  savedMomentIds: string[];
  likedCommentIds: string[];
  onLikeMoment: (id: string) => void;
  onRepostMoment: (id: string) => void;
  onToggleSaveMoment: (id: string) => void;
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

export function TwitterMomentsSkin({
  config,
  moments,
  comments,
  currentUser,
  likedMomentIds,
  repostedMomentIds,
  savedMomentIds,
  likedCommentIds,
  onLikeMoment,
  onRepostMoment,
  onToggleSaveMoment,
  onOpenLightbox,
  onSubmitComment,
  onLikeComment,
  onDeleteComment,
}: TwitterMomentsSkinProps) {
  const [activeTab, setActiveTab] = useState<TwitterTab>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);
  const [poppingLikeId, setPoppingLikeId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sortedMoments = useMemo(() => {
    const pinned = moments.filter((m) => m.pinned);
    const rest = moments.filter((m) => !m.pinned);
    return [...pinned, ...rest];
  }, [moments]);

  const tabMoments = useMemo(() => {
    switch (activeTab) {
      case 'media':
        return sortedMoments.filter((m) => Boolean(m.image));
      case 'pinned':
        return sortedMoments.filter((m) => Boolean(m.pinned) || m.likes >= 30);
      case 'likes':
        return sortedMoments.filter((m) => likedMomentIds.includes(m.id));
      default:
        return sortedMoments;
    }
  }, [activeTab, likedMomentIds, sortedMoments]);

  const allMediaSlides: LightboxSlide[] = useMemo(
    () =>
      sortedMoments
        .filter((m) => Boolean(m.image))
        .map((m) => ({
          src: m.image!,
          title: `${config.authorName} · ${m.mood}`,
          caption: m.content,
          meta: [m.location, m.weather, formatRelativeTime(m.createdAt)]
            .filter(Boolean)
            .join(' · '),
        })),
    [config.authorName, sortedMoments]
  );

  const followerDisplay = config.authorFollowers + (isFollowing ? 1 : 0);
  const displayHandle = config.authorHandle.startsWith('@')
    ? config.authorHandle
    : `@${config.authorHandle}`;

  const handleCopyShare = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId((cur) => (cur === key ? null : cur)), 1600);
    } catch {
      setCopiedId(null);
    }
  };

  const handleLikeClick = (id: string) => {
    setPoppingLikeId(id);
    setTimeout(() => setPoppingLikeId((cur) => (cur === id ? null : cur)), 340);
    onLikeMoment(id);
  };

  return (
    <div className="m3-card overflow-hidden fuwari-onload">
      {/* 3:1 Twitter/X Profile Header Banner */}
      <div className="relative w-full aspect-[3/1] min-h-[140px] max-h-[250px] bg-[var(--md-surface-container-high)] overflow-hidden">
        <button
          type="button"
          onClick={() =>
            onOpenLightbox(
              [
                {
                  src: config.heroBanner,
                  title: `${config.authorName} 主页横幅`,
                  caption: config.tagline,
                },
              ],
              0
            )
          }
          aria-label="放大查看主页封面图"
          className="block w-full h-full cursor-zoom-in"
        >
          <img
            src={config.heroBanner}
            alt={`${config.authorName} 主页横幅`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </button>
      </div>

      {/* Overlapping Circular Avatar + Top-Right Action Bar */}
      <div className="px-4 sm:px-6">
        <div className="flex items-end justify-between gap-3 -mt-12 sm:-mt-16 mb-3 relative z-10">
          <button
            type="button"
            onClick={() =>
              onOpenLightbox(
                [
                  {
                    src: config.authorAvatar,
                    title: config.authorName,
                    caption: config.authorBio,
                  },
                ],
                0
              )
            }
            aria-label="放大查看博主头像"
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[var(--md-surface-container-lowest)] bg-[var(--md-surface-container-high)] shadow-sm shrink-0 cursor-zoom-in"
          >
            <img
              src={config.authorAvatar}
              alt={config.authorName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </button>

          <div className="flex items-center gap-2 pb-1">
            <button
              type="button"
              onClick={() =>
                void handleCopyShare('profile', `${config.siteName} ${config.authorHandle}`)
              }
              aria-label="复制主页名片"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container)] transition-colors cursor-pointer"
            >
              {copiedId === 'profile' ? (
                <Check className="w-4 h-4 text-[var(--md-primary)]" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsFollowing((v) => !v)}
              aria-pressed={isFollowing}
              className={`px-5 py-2 text-sm font-bold rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isFollowing
                  ? 'border border-[var(--md-outline-variant)] bg-transparent text-[var(--md-on-surface)] hover:border-red-500/60 hover:text-red-500'
                  : 'bg-[var(--md-on-surface)] text-[var(--md-surface)] hover:opacity-90'
              }`}
            >
              {isFollowing ? '正在关注' : '关注'}
            </button>
          </div>
        </div>

        {/* Identity, Bio, Metadata & Counts */}
        <div className="space-y-2.5 pb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-display text-xl sm:text-[22px] font-bold text-[var(--md-on-surface)] leading-tight">
                {config.authorName}
              </h2>
              <BadgeCheck
                aria-label="认证博主"
                className="w-5 h-5 text-sky-500 shrink-0"
              />
            </div>
            <div className="text-sm text-[var(--md-on-surface-variant)]">
              {displayHandle}
            </div>
          </div>

          <p className="text-[14.5px] leading-relaxed text-[var(--md-on-surface)] max-w-2xl">
            {config.authorBio}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[var(--md-on-surface-variant)]">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {config.authorLocation}
            </span>
            <span className="inline-flex items-center gap-1 text-[var(--md-primary)]">
              <Link2 className="w-3.5 h-3.5" />
              kazeblog.local
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {config.authorJoinedDate}
            </span>
          </div>

          <div className="flex items-center gap-5 pt-1 text-sm">
            <span className="text-[var(--md-on-surface-variant)]">
              <strong className="font-bold text-[var(--md-on-surface)] tabular-nums">
                {config.authorFollowing}
              </strong>{' '}
              正在关注
            </span>
            <span className="text-[var(--md-on-surface-variant)]">
              <strong className="font-bold text-[var(--md-on-surface)] tabular-nums">
                {followerDisplay.toLocaleString()}
              </strong>{' '}
              关注者
            </span>
            <span className="text-[var(--md-on-surface-variant)]">
              <strong className="font-bold text-[var(--md-on-surface)] tabular-nums">
                {moments.length}
              </strong>{' '}
              条推文
            </span>
          </div>
        </div>
      </div>

      {/* Authentic 4-Tab Underline Navigation */}
      <div
        role="tablist"
        aria-label="Twitter 主页时间线分类"
        className="grid grid-cols-4 border-b border-[var(--md-outline-variant)]/80"
      >
        {(
          [
            { id: 'posts', label: '推文' },
            { id: 'media', label: '带图媒体' },
            { id: 'pinned', label: '精选置顶' },
            { id: 'likes', label: '喜欢' },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`relative py-3.5 text-xs sm:text-sm font-semibold transition-colors hover:bg-[var(--md-surface-container-low)] cursor-pointer ${
                active
                  ? 'text-[var(--md-on-surface)]'
                  : 'text-[var(--md-on-surface-variant)]'
              }`}
            >
              <span>{tab.label}</span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] rounded-full bg-[var(--md-primary)]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Single-Column Hairline-Divided Feed */}
      <div className="divide-y divide-[var(--md-outline-variant)]/70">
        {tabMoments.length === 0 ? (
          <div className="py-14 px-6 text-center text-sm text-[var(--md-on-surface-variant)]">
            {activeTab === 'likes'
              ? '你还没有点亮过任何推文的红心，点击下方的心形按钮即可收藏到这里。'
              : '该分类下暂时没有内容。'}
          </div>
        ) : (
          tabMoments.map((moment) => {
            const isLiked = likedMomentIds.includes(moment.id);
            const isReposted = repostedMomentIds.includes(moment.id);
            const isSaved = savedMomentIds.includes(moment.id);
            const replyCount = comments.filter(
              (c) => c.targetType === 'moment' && c.targetId === moment.id
            ).length;
            const isReplyOpen = expandedReplyId === moment.id;

            return (
              <article
                key={moment.id}
                className="px-4 sm:px-6 py-4 hover:bg-[var(--md-surface-container-low)]/55 transition-colors"
              >
                {moment.pinned && activeTab === 'posts' && (
                  <div className="mb-1.5 ml-9 flex items-center gap-1.5 text-xs font-medium text-[var(--md-on-surface-variant)]">
                    <Pin className="w-3.5 h-3.5" />
                    <span>已置顶</span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Left Avatar Column */}
                  <img
                    src={config.authorAvatar}
                    alt={config.authorName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--md-outline-variant)]/70"
                  />

                  {/* Right Content Column */}
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {/* Inline Header */}
                    <div className="flex flex-wrap items-center gap-x-1.5 text-[14px] leading-snug">
                      <span className="font-bold text-[var(--md-on-surface)]">
                        {config.authorName}
                      </span>
                      <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />
                      <span className="text-[var(--md-on-surface-variant)] text-[13px]">
                        {displayHandle}
                      </span>
                      <span aria-hidden="true" className="text-[var(--md-on-surface-variant)]">
                        ·
                      </span>
                      <time className="text-[13px] text-[var(--md-on-surface-variant)] tabular-nums">
                        {formatRelativeTime(moment.createdAt)}
                      </time>
                      <span aria-hidden="true" className="text-[var(--md-on-surface-variant)]">
                        ·
                      </span>
                      <span className="text-[12.5px] text-[var(--md-primary)]">{moment.mood}</span>
                    </div>

                    {/* Tweet Prose + Deduplicated Hashtags */}
                    <p className="text-[15px] leading-[1.65] text-[var(--md-on-surface)] whitespace-pre-wrap">
                      {moment.content}
                    </p>

                    {(() => {
                      const extraTags = moment.tags.filter(
                        (tag) => !moment.content.includes(`#${tag}`)
                      );
                      if (extraTags.length === 0) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13.5px] text-[var(--md-primary)]">
                          {extraTags.map((tag) => (
                            <span key={tag}>#{tag}</span>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Optional Clickable Media Attachment -> Global Lightbox */}
                    {moment.image && (
                      <button
                        type="button"
                        onClick={() => {
                          const idx = allMediaSlides.findIndex((s) => s.src === moment.image);
                          onOpenLightbox(allMediaSlides, idx >= 0 ? idx : 0);
                        }}
                        aria-label={`放大查看 ${moment.mood} 配图`}
                        className="block w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] cursor-zoom-in group"
                      >
                        <img
                          src={moment.image}
                          alt={`${moment.mood}随拍`}
                          referrerPolicy="no-referrer"
                          className="w-full max-h-[340px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      </button>
                    )}

                    {/* Optional Music + Location Line */}
                    {(moment.musicTrack || moment.location) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--md-on-surface-variant)]">
                        {moment.musicTrack && (
                          <span className="inline-flex items-center gap-1">
                            <Music className="w-3.5 h-3.5 text-[var(--md-primary)]" />
                            {moment.musicTrack}
                          </span>
                        )}
                        {moment.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {moment.location}
                            {moment.weather ? ` · ${moment.weather}` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Authentic 5-Slot Twitter/X Action Bar */}
                    <div className="pt-1 flex items-center justify-between max-w-lg text-xs text-[var(--md-on-surface-variant)]">
                      {/* 1. Reply */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedReplyId(isReplyOpen ? null : moment.id)
                        }
                        aria-expanded={isReplyOpen}
                        aria-label={`回复推文，当前 ${replyCount} 条评论`}
                        className={`inline-flex items-center gap-1.5 py-1 pr-2 rounded-full hover:text-sky-500 transition-colors cursor-pointer ${
                          isReplyOpen ? 'text-sky-500' : ''
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="tabular-nums">{replyCount}</span>
                      </button>

                      {/* 2. Repost */}
                      <button
                        type="button"
                        onClick={() => onRepostMoment(moment.id)}
                        aria-pressed={isReposted}
                        aria-label={`转发推文，当前 ${moment.reposts} 次转发`}
                        className={`inline-flex items-center gap-1.5 py-1 px-2 rounded-full hover:text-emerald-500 transition-colors cursor-pointer ${
                          isReposted ? 'text-emerald-500 font-semibold' : ''
                        }`}
                      >
                        <Repeat2 className="w-4 h-4" />
                        <span className="tabular-nums">{moment.reposts}</span>
                      </button>

                      {/* 3. Like */}
                      <button
                        type="button"
                        onClick={() => handleLikeClick(moment.id)}
                        aria-pressed={isLiked}
                        aria-label={`喜欢推文，当前 ${moment.likes} 赞`}
                        className={`inline-flex items-center gap-1.5 py-1 px-2 rounded-full hover:text-rose-500 transition-colors cursor-pointer ${
                          isLiked ? 'text-rose-500 font-semibold' : ''
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${isLiked ? 'fill-current' : ''} ${
                            poppingLikeId === moment.id ? 'animate-heart-pop' : ''
                          }`}
                        />
                        <span className="tabular-nums">{moment.likes}</span>
                      </button>

                      {/* 4. Views */}
                      <span
                        aria-label={`浏览量 ${moment.views}`}
                        className="inline-flex items-center gap-1.5 py-1 px-2 tabular-nums"
                      >
                        <BarChart2 className="w-4 h-4" />
                        <span>{moment.views}</span>
                      </span>

                      {/* 5. Bookmark & Share */}
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleSaveMoment(moment.id)}
                          aria-pressed={isSaved}
                          aria-label={isSaved ? '取消书签收藏' : '加入书签收藏'}
                          className={`p-1.5 rounded-full hover:text-[var(--md-primary)] transition-colors cursor-pointer ${
                            isSaved ? 'text-[var(--md-primary)]' : ''
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopyShare(moment.id, moment.content)}
                          aria-label="复制推文文案"
                          className="p-1.5 rounded-full hover:text-[var(--md-primary)] transition-colors cursor-pointer"
                        >
                          {copiedId === moment.id ? (
                            <Check className="w-4 h-4 text-[var(--md-primary)]" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Inline Reply Thread Drawer */}
                    {isReplyOpen && (
                      <div className="pt-3">
                        <CommentSection
                          targetType="moment"
                          targetId={moment.id}
                          comments={comments}
                          currentUser={currentUser}
                          likedCommentIds={likedCommentIds}
                          onSubmitComment={onSubmitComment}
                          onLikeComment={onLikeComment}
                          onDeleteComment={onDeleteComment}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
