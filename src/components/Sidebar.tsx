import type { MouseEvent } from 'react';
import {
  MapPin,
  Moon,
  Monitor,
  Palette,
  Rss,
  Search,
  Sun,
} from 'lucide-react';
import type {
  Category,
  PersonalStatus,
  Post,
  RadiusStyle,
  SiteConfig,
  ThemeMode,
} from '../types/blog';
import { HUE_PRESETS } from '../utils/theme';
import { extractTagCounts } from '../utils/blogLogic';

interface SidebarProps {
  config: SiteConfig;
  posts: Post[];
  categories: Category[];
  momentsCount: number;
  personalStatus: PersonalStatus;
  themeMode: ThemeMode;
  hue: number;
  radiusStyle: RadiusStyle;
  activeCategory: string | null;
  activeTag: string | null;
  onChangeThemeMode: (mode: ThemeMode, origin?: { x: number; y: number }) => void;
  onChangeHue: (hue: number) => void;
  onChangeRadius: (style: RadiusStyle) => void;
  onSelectCategory: (slug: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onOpenSearch: () => void;
  onOpenStatus: () => void;
}

export function Sidebar({
  config,
  posts,
  categories,
  momentsCount,
  personalStatus,
  themeMode,
  hue,
  radiusStyle,
  activeCategory,
  activeTag,
  onChangeThemeMode,
  onChangeHue,
  onChangeRadius,
  onSelectCategory,
  onSelectTag,
  onOpenSearch,
  onOpenStatus,
}: SidebarProps) {
  const tags = extractTagCounts(posts);

  const handleModeClick = (mode: ThemeMode, e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onChangeThemeMode(mode, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  return (
    <aside className="space-y-5">
      {/* Author Profile Card (Fuwari Signature) */}
      <section className="m3-card p-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-[20px] overflow-hidden shrink-0 bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)]">
            <img
              src={config.authorAvatar}
              alt={`${config.authorName}的头像`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)] truncate">
              {config.authorName}
            </h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--md-on-surface-variant)]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{config.authorLocation}</span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--md-on-surface-variant)]">
          {config.authorBio}
        </p>

        {/* Quick Live Status Link */}
        <button
          type="button"
          onClick={onOpenStatus}
          className="mt-4 w-full text-left p-3 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container)] transition-colors cursor-pointer"
        >
          <div className="text-[11.5px] font-medium text-[var(--md-primary)]">
            此刻状态 · {personalStatus.mood}
          </div>
          <div className="mt-0.5 text-xs text-[var(--md-on-surface)] line-clamp-1">
            {personalStatus.activity}
          </div>
        </button>

        {/* Corpus Metrics Row */}
        <div className="mt-4 pt-4 border-t border-[var(--md-outline-variant)]/70 grid grid-cols-3 text-center">
          <div>
            <div className="font-display text-lg font-bold tabular-nums text-[var(--md-on-surface)]">
              {posts.length}
            </div>
            <div className="text-xs text-[var(--md-on-surface-variant)]">文章</div>
          </div>
          <div>
            <div className="font-display text-lg font-bold tabular-nums text-[var(--md-on-surface)]">
              {momentsCount}
            </div>
            <div className="text-xs text-[var(--md-on-surface-variant)]">说说</div>
          </div>
          <div>
            <div className="font-display text-lg font-bold tabular-nums text-[var(--md-on-surface)]">
              {categories.length}
            </div>
            <div className="text-xs text-[var(--md-on-surface-variant)]">分类</div>
          </div>
        </div>

        {/* Search & RSS Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>全站搜索</span>
          </button>
          <a
            href="/api/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors whitespace-nowrap shrink-0"
          >
            <Rss className="w-3.5 h-3.5" />
            <span>RSS 订阅</span>
          </a>
        </div>
      </section>

      {/* M3 Expressive Dynamic Appearance Studio */}
      <section className="m3-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-[var(--md-on-surface)] flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--md-primary)]" />
            <span>外观与动态色调</span>
          </h3>
          <span className="font-mono text-xs tabular-nums text-[var(--md-on-surface-variant)]">
            {hue}°
          </span>
        </div>

        {/* Dark / Light / System Segmented Switch */}
        <div
          role="group"
          aria-label="色彩模式切换"
          className="grid grid-cols-3 gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]"
        >
          {(
            [
              { id: 'light', label: '浅色', icon: Sun },
              { id: 'dark', label: '深色', icon: Moon },
              { id: 'system', label: '跟随', icon: Monitor },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon;
            const active = themeMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={(e) => handleModeClick(opt.id, e)}
                className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  active
                    ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-xs'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* OKLCH Dynamic Hue Slider */}
        <div>
          <label htmlFor="m3-hue-slider" className="sr-only">
            动态主题色相角度
          </label>
          <input
            id="m3-hue-slider"
            type="range"
            min={0}
            max={359}
            value={hue}
            onChange={(e) => onChangeHue(Number(e.target.value))}
            className="hue-slider w-full cursor-pointer"
          />
          <div className="mt-2.5 flex items-center justify-between gap-1.5">
            {HUE_PRESETS.map((preset) => {
              const isSelected = Math.abs(hue - preset.hue) <= 4;
              return (
                <button
                  key={preset.name}
                  type="button"
                  title={`${preset.name} (${preset.hue}°)`}
                  aria-label={`切换主题色为${preset.name}`}
                  onClick={() => onChangeHue(preset.hue)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer border ${
                    isSelected
                      ? 'border-[var(--md-primary)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                      : 'border-transparent bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container)]'
                  }`}
                >
                  {preset.name.slice(0, 2)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Corner Radius Style Switch */}
        <div className="pt-2 border-t border-[var(--md-outline-variant)]/60">
          <div className="text-xs text-[var(--md-on-surface-variant)] mb-2">容器形态圆角</div>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]">
            {(
              [
                { id: 'expressive', label: '灵动' },
                { id: 'balanced', label: '平衡' },
                { id: 'sharp', label: '锐利' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={radiusStyle === opt.id}
                onClick={() => onChangeRadius(opt.id)}
                className={`py-1.5 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap transition-all cursor-pointer ${
                  radiusStyle === opt.id
                    ? 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] shadow-xs'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Typecho Categories */}
      <section className="m3-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold text-[var(--md-on-surface)]">
            文章分类
          </h3>
          {activeCategory && (
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className="text-xs text-[var(--md-primary)] hover:underline cursor-pointer"
            >
              重置
            </button>
          )}
        </div>
        <ul className="space-y-1">
          {categories.map((cat) => {
            const count = posts.filter((p) => p.categorySlug === cat.slug).length;
            const active = activeCategory === cat.slug;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(active ? null : cat.slug)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-[var(--radius-control)] transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-medium'
                      : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-low)] hover:text-[var(--md-on-surface)]'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="font-mono text-xs tabular-nums opacity-75">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Typecho Tag Directory (Clean Interactive Filter Controls) */}
      <section className="m3-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold text-[var(--md-on-surface)]">
            标签索引
          </h3>
          {activeTag && (
            <button
              type="button"
              onClick={() => onSelectTag(null)}
              className="text-xs text-[var(--md-primary)] hover:underline cursor-pointer"
            >
              清除
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(({ tag, count }) => {
            const active = activeTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectTag(active ? null : tag)}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] font-medium'
                    : 'bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                {tag} <span className="opacity-65 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
