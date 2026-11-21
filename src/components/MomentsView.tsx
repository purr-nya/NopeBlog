import { useMemo, useState } from 'react';
import {
  CloudSun,
  Heart,
  Layers,
  List,
  MapPin,
  MessageCircle,
  Music,
} from 'lucide-react';
import type { Comment, Moment } from '../types/blog';
import { formatRelativeTime } from '../utils/blogLogic';
import { SwipeCardDeck, type SwipeDeckItem } from './SwipeCardDeck';
import { CommentSection } from './CommentSection';

interface MomentsViewProps {
  moments: Moment[];
  comments: Comment[];
  authorName: string;
  authorAvatar: string;
  savedMomentIds: string[];
  onLikeMoment: (id: string) => void;
  onToggleSaveMoment: (id: string) => void;
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

export function MomentsView({
  moments,
  comments,
  authorName,
  authorAvatar,
  savedMomentIds,
  onLikeMoment,
  onToggleSaveMoment,
  onSubmitComment,
}: MomentsViewProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'deck'>('timeline');
  const [selectedMood, setSelectedMood] = useState<string>('全部');
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Page Header & Mode Switcher */}
      <section className="m3-card p-6 sm:p-8">
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

      {/* Card Swipe Deck Mode */}
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
            filteredMoments.map((moment) => {
              const momentComments = comments.filter(
                (c) => c.targetType === 'moment' && c.targetId === moment.id
              );
              const isCommentsOpen = expandedCommentId === moment.id;

              return (
                <article key={moment.id} className="m3-card p-6 sm:p-7 space-y-4">
                  {/* Author & Clean Metadata */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={authorAvatar}
                        alt={authorName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-2xl object-cover border border-[var(--md-outline-variant)]"
                      />
                      <div>
                        <div className="font-display font-semibold text-sm text-[var(--md-on-surface)]">
                          {authorName}
                          <span className="ml-2 font-sans font-normal text-xs text-[var(--md-primary)]">
                            · {moment.mood}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--md-on-surface-variant)]">
                          <time className="tabular-nums">{formatRelativeTime(moment.createdAt)}</time>
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

                  {/* Moment Prose */}
                  <p className="text-[15.5px] leading-[1.8] text-[var(--md-on-surface)] whitespace-pre-wrap">
                    {moment.content}
                  </p>

                  {/* Optional Image Attachment */}
                  {moment.image && (
                    <div className="overflow-hidden rounded-[var(--radius-inner)] border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] max-w-xl">
                      <img
                        src={moment.image}
                        alt={`${moment.mood}随拍`}
                        referrerPolicy="no-referrer"
                        className="w-full max-h-[340px] object-cover"
                      />
                    </div>
                  )}

                  {/* Optional Music Note */}
                  {moment.musicTrack && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] text-xs text-[var(--md-on-surface-variant)]">
                      <Music className="w-3.5 h-3.5 text-[var(--md-primary)] shrink-0" />
                      <span>单曲循环：{moment.musicTrack}</span>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-[var(--md-outline-variant)]/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-[var(--md-on-surface-variant)]">
                      {moment.tags.length > 0 ? moment.tags.join(' / ') : '日常碎片'}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onLikeMoment(moment.id)}
                        aria-label={`给这条说说点赞，当前 ${moment.likes} 赞`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)] transition-colors cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5" />
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
                        onSubmitComment={onSubmitComment}
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
  );
}
