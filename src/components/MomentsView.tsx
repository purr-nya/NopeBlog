import { useMemo, useState } from 'react';
import {
  CloudSun,
  Heart,
  Layers,
  List,
  MapPin,
  MessageCircle,
  Music,
  Repeat2,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type {
  Comment,
  LightboxSlide,
  Moment,
  MomentsSkin,
  SiteConfig,
  UserProfile,
} from '../types/blog';
import { formatRelativeTime } from '../utils/blogLogic';
import { SwipeCardDeck, type SwipeDeckItem } from './SwipeCardDeck';
import { CommentSection } from './CommentSection';
import { TwitterMomentsSkin } from './TwitterMomentsSkin';

interface MomentsViewProps {
  config: SiteConfig;
  moments: Moment[];
  comments: Comment[];
  currentUser: UserProfile | null;
  skin: MomentsSkin;
  likedMomentIds: string[];
  repostedMomentIds: string[];
  savedMomentIds: string[];
  likedCommentIds: string[];
  onChangeSkin: (skin: MomentsSkin) => void;
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

export function MomentsView({
  config,
  moments,
  comments,
  currentUser,
  skin,
  likedMomentIds,
  repostedMomentIds,
  savedMomentIds,
  likedCommentIds,
  onChangeSkin,
  onLikeMoment,
  onRepostMoment,
  onToggleSaveMoment,
  onOpenLightbox,
  onSubmitComment,
  onLikeComment,
  onDeleteComment,
}: MomentsViewProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'deck'>('timeline');
  const [selectedMood, setSelectedMood] = useState<string>('全部');
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [poppingLikeId, setPoppingLikeId] = useState<string | null>(null);

  const moods = useMemo(() => {
    const unique = Array.from(new Set(moments.map((m) => m.mood)));
    return ['全部', ...unique];
  }, [moments]);

  const filteredMoments = useMemo(
    () =>
      selectedMood === '全部'
        ? moments
        : moments.filter((m) => m.mood === selectedMood),
    [moments, selectedMood]
  );

  const momentMediaSlides: LightboxSlide[] = useMemo(
    () =>
      filteredMoments
        .filter((m) => Boolean(m.image))
        .map((m) => ({
          src: m.image!,
          title: `${config.authorName} · ${m.mood}`,
          caption: m.content,
          meta: [m.location, m.weather, formatRelativeTime(m.createdAt)]
            .filter(Boolean)
            .join(' · '),
        })),
    [config.authorName, filteredMoments]
  );

  const deckItems: SwipeDeckItem[] = useMemo(
    () =>
      filteredMoments.map((m) => ({
        id: m.id,
        title: `${m.mood} · ${m.location || '随记时刻'}`,
        subtitle: m.content,
        metaLine: [formatRelativeTime(m.createdAt), m.weather, m.musicTrack]
          .filter(Boolean)
          .join(' · '),
        image: m.image,
        accentLabel: `点赞 ${m.likes} · ${m.tags.join(' / ')}`,
      })),
    [filteredMoments]
  );

  const handleClassicLike = (id: string) => {
    setPoppingLikeId(id);
    setTimeout(() => setPoppingLikeId((cur) => (cur === id ? null : cur)), 340);
    onLikeMoment(id);
  };

  return (
    <div className="space-y-6">
      {/* Skin Switcher Bar */}
      <section className="m3-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 fuwari-onload">
        <div className="flex items-center gap-2.5 text-sm">
          <Sparkles className="w-4 h-4 text-[var(--md-primary)] shrink-0" />
          <span className="font-display font-semibold text-[var(--md-on-surface)]">
            说说页面皮肤
          </span>
          <span className="hidden sm:inline text-xs text-[var(--md-on-surface-variant)]">
            随时切换晴风 Expressive 卡片流或 Twitter / X 个人主页形态
          </span>
        </div>

        <div
          role="group"
          aria-label="说说页面皮肤切换"
          className="inline-flex items-center gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]"
        >
          <button
            type="button"
            aria-pressed={skin === 'classic'}
            onClick={() => onChangeSkin('classic')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap transition-colors cursor-pointer ${
              skin === 'classic'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>晴风卡片</span>
          </button>
          <button
            type="button"
            aria-pressed={skin === 'twitter'}
            onClick={() => onChangeSkin('twitter')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap transition-colors cursor-pointer ${
              skin === 'twitter'
                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
            }`}
          >
            <UserRound className="w-3.5 h-3.5" />
            <span>Twitter 主页</span>
          </button>
        </div>
      </section>

      {/* Skin 2: Authentic Twitter / X Profile Page */}
      {skin === 'twitter' ? (
        <TwitterMomentsSkin
          config={config}
          moments={moments}
          comments={comments}
          currentUser={currentUser}
          likedMomentIds={likedMomentIds}
          repostedMomentIds={repostedMomentIds}
          savedMomentIds={savedMomentIds}
          likedCommentIds={likedCommentIds}
          onLikeMoment={onLikeMoment}
          onRepostMoment={onRepostMoment}
          onToggleSaveMoment={onToggleSaveMoment}
          onOpenLightbox={onOpenLightbox}
          onSubmitComment={onSubmitComment}
          onLikeComment={onLikeComment}
          onDeleteComment={onDeleteComment}
        />
      ) : (
        /* Skin 1: Classic M3 Expressive Cards + Swipe Card Deck */
        <div className="space-y-6">
          <section className="m3-card p-6 sm:p-8 fuwari-onload">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--md-on-surface)]">
                  说说与碎碎念
                </h1>
                <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
                  记录尚未写成完整长文的灵感火花、街头瞬间、音乐单曲与咖啡时光。
                </p>
              </div>

              <div
                role="group"
                aria-label="说说浏览模式"
                className="inline-flex items-center gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === 'timeline'}
                  onClick={() => setViewMode('timeline')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap transition-colors cursor-pointer ${
                    viewMode === 'timeline'
                      ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                      : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>时间流</span>
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'deck'}
                  onClick={() => setViewMode('deck')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap transition-colors cursor-pointer ${
                    viewMode === 'deck'
                      ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                      : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>卡片滑览</span>
                </button>
              </div>
            </div>

            {/* Mood Filter Bar */}
            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              {moods.map((mood) => {
                const active = selectedMood === mood;
                return (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setSelectedMood(mood)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                        : 'bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
                    }`}
                  >
                    {mood}
                  </button>
                );
              })}
            </div>
          </section>

          {viewMode === 'deck' ? (
            <SwipeCardDeck
              items={deckItems}
              savedIds={savedMomentIds}
              onToggleSave={onToggleSaveMoment}
              onOpenItem={(id) => {
                setViewMode('timeline');
                setExpandedCommentId(id);
              }}
              heading="说说卡片翻阅"
              description="左右滑动浏览每一条生活碎片，右滑可加入灵感收藏"
              actionLabel="展开评论"
            />
          ) : (
            <div className="space-y-5">
              {filteredMoments.length === 0 ? (
                <div className="m3-card p-10 text-center text-sm text-[var(--md-on-surface-variant)]">
                  该心境下暂时还没有发布说说。
                </div>
              ) : (
                filteredMoments.map((moment, idx) => {
                  const momentComments = comments.filter(
                    (c) => c.targetType === 'moment' && c.targetId === moment.id
                  );
                  const isCommentsOpen = expandedCommentId === moment.id;
                  const isLiked = likedMomentIds.includes(moment.id);
                  const isReposted = repostedMomentIds.includes(moment.id);

                  return (
                    <article
                      key={moment.id}
                      style={{ ['--stagger' as string]: Math.min(idx + 1, 8) }}
                      className="m3-card fuwari-onload p-6 sm:p-7 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={config.authorAvatar}
                            alt={config.authorName}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-2xl object-cover border border-[var(--md-outline-variant)]"
                          />
                          <div>
                            <div className="font-display font-semibold text-sm text-[var(--md-on-surface)]">
                              {config.authorName}
                              <span className="ml-2 font-sans font-normal text-xs text-[var(--md-primary)]">
                                · {moment.mood}
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--md-on-surface-variant)]">
                              <time className="tabular-nums">
                                {formatRelativeTime(moment.createdAt)}
                              </time>
                              {moment.location && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {moment.location}
                                  </span>
                                </>
                              )}
                              {moment.weather && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1">
                                    <CloudSun className="w-3 h-3" />
                                    {moment.weather}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-[15.5px] leading-[1.8] text-[var(--md-on-surface)] whitespace-pre-wrap">
                        {moment.content}
                      </p>

                      {moment.image && (
                        <button
                          type="button"
                          onClick={() => {
                            const slideIdx = momentMediaSlides.findIndex(
                              (s) => s.src === moment.image
                            );
                            onOpenLightbox(momentMediaSlides, slideIdx >= 0 ? slideIdx : 0);
                          }}
                          aria-label={`在灯箱中查看 ${moment.mood} 配图`}
                          className="block overflow-hidden rounded-[var(--radius-inner)] border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] max-w-xl cursor-zoom-in group"
                        >
                          <img
                            src={moment.image}
                            alt={`${moment.mood}随拍`}
                            referrerPolicy="no-referrer"
                            className="w-full max-h-[340px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                        </button>
                      )}

                      {moment.musicTrack && (
                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] text-xs text-[var(--md-on-surface-variant)]">
                          <Music className="w-3.5 h-3.5 text-[var(--md-primary)] shrink-0" />
                          <span>单曲循环：{moment.musicTrack}</span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-[var(--md-outline-variant)]/60 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-[var(--md-on-surface-variant)]">
                          {moment.tags.length > 0 ? moment.tags.join(' / ') : '日常碎片'}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onRepostMoment(moment.id)}
                            aria-pressed={isReposted}
                            aria-label={`转发说说，当前 ${moment.reposts} 次`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-control)] transition-colors cursor-pointer ${
                              isReposted
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
                            }`}
                          >
                            <Repeat2 className="w-3.5 h-3.5" />
                            <span className="tabular-nums">{moment.reposts}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleClassicLike(moment.id)}
                            aria-pressed={isLiked}
                            aria-label={`给这条说说点赞，当前 ${moment.likes} 赞`}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-[var(--radius-control)] transition-colors cursor-pointer ${
                              isLiked
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)]'
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''} ${
                                poppingLikeId === moment.id ? 'animate-heart-pop' : ''
                              }`}
                            />
                            <span className="tabular-nums">{moment.likes}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedCommentId(isCommentsOpen ? null : moment.id)
                            }
                            aria-expanded={isCommentsOpen}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="tabular-nums">评论 {momentComments.length}</span>
                          </button>
                        </div>
                      </div>

                      {isCommentsOpen && (
                        <div className="pt-2">
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
                    </article>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
