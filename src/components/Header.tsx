import { useState, type MouseEvent } from 'react';
import { Menu, Moon, Search, Sun, User, X } from 'lucide-react';
import type { UserProfile } from '../types/blog';

export type RouteView =
  | 'home'
  | 'post'
  | 'moments'
  | 'shop'
  | 'archives'
  | 'status'
  | 'explore'
  | 'admin';

interface HeaderProps {
  siteName: string;
  currentView: RouteView;
  isDark: boolean;
  currentUser: UserProfile | null;
  onNavigate: (view: RouteView) => void;
  onQuickToggleDark: (origin?: { x: number; y: number }) => void;
  onOpenSearch: () => void;
  onOpenAccount: () => void;
}

const NAV_ITEMS: { id: RouteView; label: string }[] = [
  { id: 'home', label: '首页' },
  { id: 'moments', label: '说说' },
  { id: 'shop', label: '商店' },
  { id: 'status', label: '状态' },
  { id: 'explore', label: '探索' },
];

export function Header({
  siteName,
  currentView,
  isDark,
  currentUser,
  onNavigate,
  onQuickToggleDark,
  onOpenSearch,
  onOpenAccount,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelect = (view: RouteView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const handleMobileTheme = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onQuickToggleDark({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--md-outline-variant)]/80 bg-[var(--md-surface)]/85 backdrop-blur-xl transition-colors">
      <div className="mx-auto max-w-[1340px] h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleSelect('home');
          }}
          className="font-display text-xl font-bold tracking-tight text-[var(--md-on-surface)] hover:text-[var(--md-primary)] transition-colors whitespace-nowrap shrink-0"
        >
          {siteName}
        </a>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav aria-label="主导航" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const active =
              currentView === item.id ||
              (currentView === 'post' && item.id === 'home') ||
              (currentView === 'archives' && item.id === 'explore');
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect(item.id);
                }}
                aria-current={active ? 'page' : undefined}
                className={`relative py-1 text-[14.5px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'text-[var(--md-primary)]'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[21px] h-[2.5px] rounded-full bg-[var(--md-primary)]"
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action (+ Mobile Menu Button on small screens) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect('admin')}
            className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-control)] whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              currentView === 'admin'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                : 'bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92'
            }`}
          >
            后台管理
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-[var(--radius-control)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container)] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="移动端导航"
          className="md:hidden border-t border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] px-4 py-3 space-y-3"
        >
          <div className="flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-[var(--radius-control)] whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                      : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="pt-2 border-t border-[var(--md-outline-variant)]/60 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleMobileTheme}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] cursor-pointer"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDark ? '浅色' : '深色'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSearch();
              }}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>搜索</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAccount();
              }}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{currentUser ? currentUser.displayName : '会员账号'}</span>
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
