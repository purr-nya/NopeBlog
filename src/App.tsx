import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Grid2x2,
  Layers,
  LayoutList,
  Megaphone,
  Search,
} from 'lucide-react';
import type {
  BlogBootstrapData,
  CartItem,
  HomeLayoutMode,
  LightboxSlide,
  MomentsSkin,
  Order,
  Post,
  RadiusStyle,
  ShopProduct,
  ThemeMode,
  UserProfile,
} from './types/blog';
import { blogApi } from './services/api';
import { filterAndSortPosts, formatShortDate } from './utils/blogLogic';
import { applyThemeToDocument, clampHue, resolveEffectiveDark } from './utils/theme';
import { Header, type RouteView } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SwipeCardDeck, type SwipeDeckItem } from './components/SwipeCardDeck';
import { ArticleCard } from './components/ArticleCard';
import { PostDetailView } from './components/PostDetailView';
import { MomentsView } from './components/MomentsView';
import { ShopView } from './components/ShopView';
import { StatusView } from './components/StatusView';
import { ArchivesView } from './components/ArchivesView';
import { ExploreView, type ExploreTab } from './components/ExploreView';
import { SearchModal } from './components/SearchModal';
import { AdminPanel } from './components/AdminPanel';
import { GlobalLightbox } from './components/GlobalLightbox';
import { AccountModal } from './components/AccountModal';

const STORAGE_KEYS = {
  themeMode: 'kazeblog_theme_mode',
  hue: 'kazeblog_hue',
  radius: 'kazeblog_radius',
  savedPosts: 'kazeblog_saved_posts',
  savedMoments: 'kazeblog_saved_moments',
  likedPosts: 'kazeblog_liked_posts',
  likedMoments: 'kazeblog_liked_moments',
  likedComments: 'kazeblog_liked_comments',
  repostedMoments: 'kazeblog_reposted_moments',
  momentsSkin: 'kazeblog_moments_skin',
};

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [data, setData] = useState<BlogBootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Navigation & Fuwari Swup-like Transition State
  const [view, setView] = useState<RouteView>('home');
  const [isLeaving, setIsLeaving] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);
  const [exploreTab, setExploreTab] = useState<ExploreTab>('archives');
  const [explorePageSlug, setExplorePageSlug] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Independent Global Lightbox
  const [lightboxState, setLightboxState] = useState<{
    slides: LightboxSlide[];
    index: number;
  } | null>(null);

  // Moments Skin (Classic M3 Expressive vs Twitter/X Profile)
  const [momentsSkin, setMomentsSkin] = useState<MomentsSkin>(() =>
    readStored<MomentsSkin>(STORAGE_KEYS.momentsSkin, 'classic')
  );

  // Filters & Home Layout Mode
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [homeLayout, setHomeLayout] = useState<HomeLayoutMode>('feed');

  // Dynamic M3 Expressive Theme Preferences
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    readStored<ThemeMode>(STORAGE_KEYS.themeMode, 'light')
  );
  const [hue, setHue] = useState<number>(() =>
    clampHue(readStored<number>(STORAGE_KEYS.hue, 250))
  );
  const [radiusStyle, setRadiusStyle] = useState<RadiusStyle>(() =>
    readStored<RadiusStyle>(STORAGE_KEYS.radius, 'expressive')
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  // Non-sensitive local UI engagement tracking (synced with server when logged in)
  const [guestSavedPostIds, setGuestSavedPostIds] = useState<string[]>(() =>
    readStored<string[]>(STORAGE_KEYS.savedPosts, [])
  );
  const [savedMomentIds, setSavedMomentIds] = useState<string[]>(() =>
    readStored<string[]>(STORAGE_KEYS.savedMoments, [])
  );
  const [guestLikedPostIds, setGuestLikedPostIds] = useState<string[]>(() =>
    readStored<string[]>(STORAGE_KEYS.likedPosts, [])
  );
  const [guestLikedMomentIds, setGuestLikedMomentIds] = useState<string[]>(() =>
    readStored<string[]>(STORAGE_KEYS.likedMoments, [])
  );
  const [guestLikedCommentIds, setGuestLikedCommentIds] = useState<string[]>(() =>
    readStored<string[]>(STORAGE_KEYS.likedComments, [])
  );
  const [guestRepostedMomentIds, setGuestRepostedMomentIds] = useState<string[]>(() =>
    readStored<string[]>(STORAGE_KEYS.repostedMoments, [])
  );
  const [unlockedContents, setUnlockedContents] = useState<Record<string, string>>({});

  // Storefront Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Auth Sessions held strictly in React memory (NEVER persisted to localStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<
    'login' | 'register' | 'profile' | 'orders' | 'library'
  >('login');

  const savedPostIds = currentUser ? currentUser.savedPostIds : guestSavedPostIds;
  const likedPostIds = currentUser ? currentUser.likedPostIds : guestLikedPostIds;
  const likedMomentIds = currentUser ? currentUser.likedMomentIds : guestLikedMomentIds;
  const likedCommentIds = currentUser ? currentUser.likedCommentIds : guestLikedCommentIds;
  const repostedMomentIds = currentUser ? currentUser.repostedMomentIds : guestRepostedMomentIds;

  const openLightbox = useCallback((slides: LightboxSlide[], index = 0) => {
    if (slides.length === 0) return;
    setLightboxState({ slides, index });
  }, []);

  const navigateWithTransition = useCallback((action: () => void) => {
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    setIsLeaving(true);
    transitionTimerRef.current = window.setTimeout(() => {
      action();
      setIsLeaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 125);
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const loadBootstrap = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await blogApi.getBootstrap();
      setData(res);
      setHomeLayout((prev) => prev || res.config.homeLayout);
      if (typeof window !== 'undefined') {
        if (!window.localStorage.getItem(STORAGE_KEYS.hue)) {
          setHue(clampHue(res.config.defaultHue));
        }
        if (!window.localStorage.getItem(STORAGE_KEYS.radius)) {
          setRadiusStyle(res.config.radiusStyle);
        }
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '加载博客数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const effectiveDark = resolveEffectiveDark(themeMode, systemPrefersDark);
  useEffect(() => {
    applyThemeToDocument(hue, radiusStyle, effectiveDark);
  }, [hue, radiusStyle, effectiveDark]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleChangeThemeMode = (nextMode: ThemeMode, origin?: { x: number; y: number }) => {
    setThemeMode(nextMode);
    window.localStorage.setItem(STORAGE_KEYS.themeMode, JSON.stringify(nextMode));
    const nextDark = resolveEffectiveDark(nextMode, systemPrefersDark);
    applyThemeToDocument(hue, radiusStyle, nextDark, origin);
  };

  const handleChangeHue = (nextHue: number) => {
    const clamped = clampHue(nextHue);
    setHue(clamped);
    window.localStorage.setItem(STORAGE_KEYS.hue, JSON.stringify(clamped));
  };

  const handleChangeRadius = (nextRadius: RadiusStyle) => {
    setRadiusStyle(nextRadius);
    window.localStorage.setItem(STORAGE_KEYS.radius, JSON.stringify(nextRadius));
  };

  const handleChangeMomentsSkin = (nextSkin: MomentsSkin) => {
    setMomentsSkin(nextSkin);
    window.localStorage.setItem(STORAGE_KEYS.momentsSkin, JSON.stringify(nextSkin));
  };

  // --- Member Account Handlers ---
  const openAccountModal = (tab?: 'login' | 'register' | 'profile' | 'orders' | 'library') => {
    setAccountModalTab(tab || (currentUser ? 'profile' : 'login'));
    setAccountModalOpen(true);
  };

  const handleUserLogin = async (payload: { identifier: string; password: string }) => {
    const res = await blogApi.loginUser(payload);
    setUserToken(res.token);
    setCurrentUser(res.user);
    setUserOrders(res.orders);
    setAccountModalTab('profile');
  };

  const handleUserRegister = async (payload: {
    username: string;
    displayName: string;
    email: string;
    password: string;
  }) => {
    const res = await blogApi.registerUser(payload);
    setUserToken(res.token);
    setCurrentUser(res.user);
    setUserOrders(res.orders);
    setAccountModalTab('profile');
  };

  const handleUpdateUserProfile = async (payload: {
    displayName: string;
    bio: string;
    avatarHue: number;
  }) => {
    if (!userToken) return;
    const { user } = await blogApi.updateProfile(userToken, payload);
    setCurrentUser(user);
  };

  const handleUserLogout = async () => {
    if (userToken) {
      await blogApi.logoutUser(userToken).catch(() => {});
    }
    setUserToken(null);
    setCurrentUser(null);
    setUserOrders([]);
    setAccountModalOpen(false);
  };

  // --- Bookmarks & Toggleable Likes / Reposts ---
  const toggleSavePost = (id: string) => {
    if (currentUser && userToken) {
      const next = currentUser.savedPostIds.includes(id)
        ? currentUser.savedPostIds.filter((x) => x !== id)
        : [...currentUser.savedPostIds, id];
      setCurrentUser({ ...currentUser, savedPostIds: next });
      void blogApi.updateProfile(userToken, { savedPostIds: next }).catch(() => {});
      return;
    }
    setGuestSavedPostIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      window.localStorage.setItem(STORAGE_KEYS.savedPosts, JSON.stringify(next));
      return next;
    });
  };

  const toggleSaveMoment = (id: string) => {
    setSavedMomentIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      window.localStorage.setItem(STORAGE_KEYS.savedMoments, JSON.stringify(next));
      return next;
    });
  };

  const handleLikePost = async (id: string) => {
    const alreadyLiked = likedPostIds.includes(id);
    const delta: 1 | -1 = alreadyLiked ? -1 : 1;
    const { likes, liked } = await blogApi.likePost(id, delta, userToken);
    setData((prev) =>
      prev
        ? { ...prev, posts: prev.posts.map((p) => (p.id === id ? { ...p, likes } : p)) }
        : prev
    );
    if (currentUser) {
      const nextIds = liked
        ? Array.from(new Set([...currentUser.likedPostIds, id]))
        : currentUser.likedPostIds.filter((x) => x !== id);
      setCurrentUser({ ...currentUser, likedPostIds: nextIds });
    } else {
      setGuestLikedPostIds((prev) => {
        const next = liked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id);
        window.localStorage.setItem(STORAGE_KEYS.likedPosts, JSON.stringify(next));
        return next;
      });
    }
  };

  const handleLikeMoment = async (id: string) => {
    const alreadyLiked = likedMomentIds.includes(id);
    const delta: 1 | -1 = alreadyLiked ? -1 : 1;
    const { likes, liked } = await blogApi.likeMoment(id, delta, userToken);
    setData((prev) =>
      prev
        ? { ...prev, moments: prev.moments.map((m) => (m.id === id ? { ...m, likes } : m)) }
        : prev
    );
    if (currentUser) {
      const nextIds = liked
        ? Array.from(new Set([...currentUser.likedMomentIds, id]))
        : currentUser.likedMomentIds.filter((x) => x !== id);
      setCurrentUser({ ...currentUser, likedMomentIds: nextIds });
    } else {
      setGuestLikedMomentIds((prev) => {
        const next = liked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id);
        window.localStorage.setItem(STORAGE_KEYS.likedMoments, JSON.stringify(next));
        return next;
      });
    }
  };

  const handleRepostMoment = async (id: string) => {
    const alreadyReposted = repostedMomentIds.includes(id);
    const delta: 1 | -1 = alreadyReposted ? -1 : 1;
    const { reposts, reposted } = await blogApi.repostMoment(id, delta, userToken);
    setData((prev) =>
      prev
        ? { ...prev, moments: prev.moments.map((m) => (m.id === id ? { ...m, reposts } : m)) }
        : prev
    );
    if (currentUser) {
      const nextIds = reposted
        ? Array.from(new Set([...currentUser.repostedMomentIds, id]))
        : currentUser.repostedMomentIds.filter((x) => x !== id);
      setCurrentUser({ ...currentUser, repostedMomentIds: nextIds });
    } else {
      setGuestRepostedMomentIds((prev) => {
        const next = reposted ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id);
        window.localStorage.setItem(STORAGE_KEYS.repostedMoments, JSON.stringify(next));
        return next;
      });
    }
  };

  const handleLikeComment = async (id: string) => {
    const alreadyLiked = likedCommentIds.includes(id);
    const delta: 1 | -1 = alreadyLiked ? -1 : 1;
    const { likes, liked } = await blogApi.likeComment(id, delta, userToken);
    setData((prev) =>
      prev
        ? { ...prev, comments: prev.comments.map((c) => (c.id === id ? { ...c, likes } : c)) }
        : prev
    );
    if (currentUser) {
      const nextIds = liked
        ? Array.from(new Set([...currentUser.likedCommentIds, id]))
        : currentUser.likedCommentIds.filter((x) => x !== id);
      setCurrentUser({ ...currentUser, likedCommentIds: nextIds });
    } else {
      setGuestLikedCommentIds((prev) => {
        const next = liked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id);
        window.localStorage.setItem(STORAGE_KEYS.likedComments, JSON.stringify(next));
        return next;
      });
    }
  };

  const handleDeleteOwnComment = async (id: string) => {
    const activeToken = userToken || adminToken;
    if (!activeToken) return;
    await blogApi.deleteOwnComment(id, activeToken);
    setData((prev) =>
      prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== id) } : prev
    );
  };

  const openPost = (post: Post) => {
    navigateWithTransition(() => {
      setSelectedPostSlug(post.slug);
      setView('post');
    });
    void blogApi
      .incrementPostView(post.id)
      .then(({ views }) => {
        setData((prev) =>
          prev
            ? {
                ...prev,
                posts: prev.posts.map((p) => (p.id === post.id ? { ...p, views } : p)),
              }
            : prev
        );
      })
      .catch(() => {});
  };

  const handleUnlockPost = async (id: string, password: string) => {
    const { content } = await blogApi.unlockPost(id, password);
    setUnlockedContents((prev) => ({ ...prev, [id]: content }));
  };

  const handleSubmitComment = async (payload: {
    targetType: 'post' | 'moment' | 'page';
    targetId: string;
    parentId?: string | null;
    author: string;
    email?: string;
    url?: string;
    content: string;
  }) => {
    const res = await blogApi.submitComment(payload, adminToken || userToken);
    if (!res.flaggedSpam) {
      setData((prev) =>
        prev ? { ...prev, comments: [...prev.comments, res.comment] } : prev
      );
    }
    return { flaggedSpam: res.flaggedSpam };
  };

  // --- Storefront Cart & Order Callbacks ---
  const handleAddToCart = (productId: string, variantId: string, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === productId && i.variantId === variantId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { productId, variantId, quantity }];
    });
  };

  const handleUpdateCartQty = (productId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) =>
        prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
      );
      return;
    }
    setCartItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i
      )
    );
  };

  const handleRemoveCartItem = (productId: string, variantId: string) => {
    setCartItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  };

  const handleOrderCompleted = (order: Order, updatedProducts: ShopProduct[]) => {
    setData((prev) => (prev ? { ...prev, products: updatedProducts } : prev));
    if (currentUser && order.userId === currentUser.id) {
      setUserOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
    }
  };

  const handleOrderRefunded = (order: Order, updatedProducts: ShopProduct[]) => {
    setData((prev) => (prev ? { ...prev, products: updatedProducts } : prev));
    setUserOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
  };

  const handleRefundFromAccount = async (orderId: string, customerEmail: string) => {
    const { order, products: updatedProducts } = await blogApi.refundOrder(
      orderId,
      customerEmail,
      userToken
    );
    handleOrderRefunded(order, updatedProducts);
  };

  const visiblePosts = useMemo(() => {
    if (!data) return [];
    const base = filterAndSortPosts(data.posts, {
      categorySlug: activeCategory,
      tag: activeTag,
    });
    return showSavedOnly ? base.filter((p) => savedPostIds.includes(p.id)) : base;
  }, [data, activeCategory, activeTag, showSavedOnly, savedPostIds]);

  const featuredDeckItems: SwipeDeckItem[] = useMemo(() => {
    if (!data) return [];
    return filterAndSortPosts(data.posts).map((post) => {
      const cat = data.categories.find((c) => c.slug === post.categorySlug);
      return {
        id: post.id,
        title: post.title,
        subtitle: post.excerpt,
        metaLine: [
          post.pinned ? '置顶推荐' : null,
          cat?.name || post.categorySlug,
          formatShortDate(post.createdAt),
          `${post.views} 阅读`,
        ]
          .filter(Boolean)
          .join(' · '),
        image: post.coverImage,
        accentLabel: post.hasPassword ? '加密手记 · 点击解锁阅读' : post.tags.slice(0, 3).join(' / '),
      };
    });
  }, [data]);

  const activePost = useMemo(
    () => data?.posts.find((p) => p.slug === selectedPostSlug) || null,
    [data, selectedPostSlug]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--md-surface)] text-[var(--md-on-surface-variant)] text-sm">
        正在唤醒晴风志...
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--md-surface)] px-4">
        <p className="text-sm text-[var(--md-on-surface)]">{loadError || '数据加载异常'}</p>
        <button
          type="button"
          onClick={() => void loadBootstrap()}
          className="px-4 py-2 text-sm rounded-xl bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
        >
          重试连接
        </button>
      </div>
    );
  }

  const showSidebar = view !== 'admin' && view !== 'post' && view !== 'shop';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--md-surface)] text-[var(--md-on-surface)] transition-colors duration-200 overflow-x-clip">
      {/* Strict 3-Zone Top Bar */}
      <Header
        siteName={data.config.siteName}
        currentView={view}
        isDark={effectiveDark}
        currentUser={currentUser}
        onNavigate={(nextView) => {
          navigateWithTransition(() => {
            setView(nextView);
            if (nextView === 'home') {
              setSelectedPostSlug(null);
            }
          });
        }}
        onQuickToggleDark={(origin) =>
          handleChangeThemeMode(effectiveDark ? 'light' : 'dark', origin)
        }
        onOpenSearch={() => setSearchOpen(true)}
        onOpenAccount={() => openAccountModal()}
      />

      {/* Fuwari Atmospheric Hero Banner (Home View Only) */}
      {view === 'home' && data.config.showHeroBanner && (
        <section
          aria-label="站点横幅"
          className="relative overflow-hidden border-b border-[var(--md-outline-variant)]/60"
        >
          <div className="relative h-[280px] sm:h-[350px] lg:h-[400px] w-full">
            <img
              src={data.config.heroBanner}
              alt={data.config.siteName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/42 to-black/18"
            />
            <div className="absolute inset-0 mx-auto max-w-[1340px] px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-8 sm:pb-12">
              <div className="max-w-2xl text-white fuwari-onload">
                <p className="text-xs sm:text-sm font-medium tracking-wide text-white/80">
                  {data.config.tagline}
                </p>
                <h1 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight [text-wrap:balance]">
                  {data.config.heroTitle}
                </h1>
                <p className="mt-3 text-sm sm:text-[15.5px] leading-relaxed text-white/88 max-w-xl">
                  {data.config.heroSubtitle}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Shell */}
      <main className="flex-1 mx-auto w-full max-w-[1340px] px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
        <div
          className={
            showSidebar
              ? 'grid grid-cols-1 lg:grid-cols-12 gap-7 items-start'
              : 'w-full'
          }
        >
          {/* Sticky Fuwari Sidebar */}
          {showSidebar && (
            <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-22 order-2 lg:order-1">
              <Sidebar
                config={data.config}
                posts={data.posts}
                categories={data.categories}
                momentsCount={data.moments.length}
                personalStatus={data.personalStatus}
                currentUser={currentUser}
                userOrdersCount={userOrders.length}
                themeMode={themeMode}
                hue={hue}
                radiusStyle={radiusStyle}
                activeCategory={activeCategory}
                activeTag={activeTag}
                onChangeThemeMode={handleChangeThemeMode}
                onChangeHue={handleChangeHue}
                onChangeRadius={handleChangeRadius}
                onSelectCategory={(slug) => {
                  setActiveCategory(slug);
                  if (view !== 'home') {
                    navigateWithTransition(() => setView('home'));
                  }
                }}
                onSelectTag={(tag) => {
                  setActiveTag(tag);
                  if (view !== 'home') {
                    navigateWithTransition(() => setView('home'));
                  }
                }}
                onOpenSearch={() => setSearchOpen(true)}
                onOpenStatus={() => navigateWithTransition(() => setView('status'))}
                onOpenArchives={() =>
                  navigateWithTransition(() => {
                    setExploreTab('archives');
                    setExplorePageSlug(null);
                    setView('explore');
                  })
                }
                onOpenAccount={(tab) => openAccountModal(tab)}
              />
            </div>
          )}

          {/* Primary Content Column with Fuwari Swup-like Transition */}
          <div
            key={`${view}-${selectedPostSlug || ''}`}
            className={`${isLeaving ? 'm3-view-leaving' : 'm3-view-enter'} ${
              showSidebar ? 'lg:col-span-8 xl:col-span-9 order-1 lg:order-2' : 'w-full'
            }`}
          >
            {/* HOME VIEW */}
            {view === 'home' && (
              <div className="space-y-6">
                {data.config.announcement && (
                  <div className="px-5 py-3.5 rounded-[var(--radius-inner)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] text-xs sm:text-sm flex items-center gap-3 fuwari-onload">
                    <Megaphone className="w-4 h-4 shrink-0" />
                    <span>{data.config.announcement}</span>
                  </div>
                )}

                {homeLayout !== 'deck' && !activeCategory && !activeTag && !showSavedOnly && (
                  <div style={{ ['--stagger' as string]: 1 }} className="fuwari-onload">
                    <SwipeCardDeck
                      items={featuredDeckItems}
                      savedIds={savedPostIds}
                      onToggleSave={toggleSavePost}
                      onOpenItem={(id) => {
                        const found = data.posts.find((p) => p.id === id);
                        if (found) openPost(found);
                      }}
                    />
                  </div>
                )}

                {/* Stream Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                      {showSavedOnly
                        ? '已收藏灵感清单'
                        : activeCategory
                          ? `分类：${
                              data.categories.find((c) => c.slug === activeCategory)?.name ||
                              activeCategory
                            }`
                          : activeTag
                            ? `标签：${activeTag}`
                            : '最新文章'}
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-[var(--md-on-surface-variant)]">
                      ({visiblePosts.length})
                    </span>
                    {(activeCategory || activeTag || showSavedOnly) && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCategory(null);
                          setActiveTag(null);
                          setShowSavedOnly(false);
                        }}
                        className="text-xs text-[var(--md-primary)] hover:underline cursor-pointer"
                      >
                        显示全部
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSearchOpen(true)}
                      aria-label="打开全站搜索"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>搜索</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSavedOnly((v) => !v)}
                      aria-pressed={showSavedOnly}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-control)] transition-colors cursor-pointer ${
                        showSavedOnly
                          ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                          : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span className="tabular-nums">收藏 ({savedPostIds.length})</span>
                    </button>

                    <div
                      role="group"
                      aria-label="文章排版切换"
                      className="inline-flex items-center gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]"
                    >
                      {(
                        [
                          { id: 'feed', label: '列表', icon: LayoutList },
                          { id: 'bento', label: '双栏', icon: Grid2x2 },
                          { id: 'deck', label: '滑卡', icon: Layers },
                        ] as const
                      ).map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            aria-pressed={homeLayout === opt.id}
                            onClick={() => setHomeLayout(opt.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap cursor-pointer transition-colors ${
                              homeLayout === opt.id
                                ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {homeLayout === 'deck' ? (
                  <SwipeCardDeck
                    items={visiblePosts.map((post) => ({
                      id: post.id,
                      title: post.title,
                      subtitle: post.excerpt,
                      metaLine: `${
                        data.categories.find((c) => c.slug === post.categorySlug)?.name ||
                        post.categorySlug
                      } · ${formatShortDate(post.createdAt)} · ${post.views} 阅读`,
                      image: post.coverImage,
                      accentLabel: post.tags.join(' / '),
                    }))}
                    savedIds={savedPostIds}
                    onToggleSave={toggleSavePost}
                    onOpenItem={(id) => {
                      const found = data.posts.find((p) => p.id === id);
                      if (found) openPost(found);
                    }}
                    heading="沉浸式卡片滑览模式"
                    description="专注单张卡片体验，左右滑动探索全部筛选文章"
                  />
                ) : visiblePosts.length === 0 ? (
                  <div className="m3-card p-12 text-center space-y-3">
                    <p className="text-sm text-[var(--md-on-surface-variant)]">
                      当前筛选条件下没有文章。
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory(null);
                        setActiveTag(null);
                        setShowSavedOnly(false);
                      }}
                      className="px-4 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
                    >
                      查看全部文章
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      homeLayout === 'bento'
                        ? 'grid grid-cols-1 md:grid-cols-2 gap-5'
                        : 'space-y-5'
                    }
                  >
                    {visiblePosts.map((post, idx) => (
                      <ArticleCard
                        key={post.id}
                        post={post}
                        category={data.categories.find((c) => c.slug === post.categorySlug)}
                        density={data.config.density}
                        compactCard={homeLayout === 'bento'}
                        staggerIndex={idx + 1}
                        isSaved={savedPostIds.includes(post.id)}
                        isLiked={likedPostIds.includes(post.id)}
                        onOpen={openPost}
                        onToggleSave={toggleSavePost}
                        onLikePost={handleLikePost}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* POST DETAIL VIEW */}
            {view === 'post' && activePost && (
              <PostDetailView
                post={activePost}
                allPosts={data.posts}
                categories={data.categories}
                comments={data.comments}
                currentUser={currentUser}
                unlockedContent={unlockedContents[activePost.id]}
                isLiked={likedPostIds.includes(activePost.id)}
                isSaved={savedPostIds.includes(activePost.id)}
                likedCommentIds={likedCommentIds}
                onBack={() => navigateWithTransition(() => setView('home'))}
                onSelectPost={openPost}
                onLikePost={handleLikePost}
                onToggleSave={toggleSavePost}
                onUnlockPost={handleUnlockPost}
                onOpenLightbox={openLightbox}
                onSubmitComment={handleSubmitComment}
                onLikeComment={handleLikeComment}
                onDeleteComment={handleDeleteOwnComment}
              />
            )}

            {/* MOMENTS / SHUOSHUO VIEW (Dual Skin: Classic & Twitter/X Profile) */}
            {view === 'moments' && (
              <MomentsView
                config={data.config}
                moments={data.moments}
                comments={data.comments}
                currentUser={currentUser}
                skin={momentsSkin}
                likedMomentIds={likedMomentIds}
                repostedMomentIds={repostedMomentIds}
                savedMomentIds={savedMomentIds}
                likedCommentIds={likedCommentIds}
                onChangeSkin={handleChangeMomentsSkin}
                onLikeMoment={handleLikeMoment}
                onRepostMoment={handleRepostMoment}
                onToggleSaveMoment={toggleSaveMoment}
                onOpenLightbox={openLightbox}
                onSubmitComment={handleSubmitComment}
                onLikeComment={handleLikeComment}
                onDeleteComment={handleDeleteOwnComment}
              />
            )}

            {/* FULL STOREFRONT & PAYMENT PIPELINE */}
            {view === 'shop' && (
              <ShopView
                products={data.products}
                cartItems={cartItems}
                currentUser={currentUser}
                userToken={userToken}
                onAddToCart={handleAddToCart}
                onUpdateCartQty={handleUpdateCartQty}
                onRemoveCartItem={handleRemoveCartItem}
                onClearCart={() => setCartItems([])}
                onOrderCompleted={handleOrderCompleted}
                onOrderRefunded={handleOrderRefunded}
                onOpenLightbox={openLightbox}
                onOpenAccount={() => openAccountModal(currentUser ? 'orders' : 'login')}
              />
            )}

            {/* ARCHIVES VIEW (Direct fallback route) */}
            {view === 'archives' && (
              <ArchivesView
                posts={data.posts}
                categories={data.categories}
                initialCategory={activeCategory}
                initialTag={activeTag}
                onSelectPost={openPost}
              />
            )}

            {/* STATUS VIEW */}
            {view === 'status' && (
              <StatusView
                personalStatus={data.personalStatus}
                posts={data.posts}
                moments={data.moments}
                commentsCount={data.comments.length}
                pagesCount={data.pages.length}
              />
            )}

            {/* EXPLORE (ARCHIVES + FRIENDS + GALLERY + STANDALONE PAGES) */}
            {view === 'explore' && (
              <ExploreView
                initialTab={exploreTab}
                initialPageSlug={explorePageSlug}
                posts={data.posts}
                categories={data.categories}
                friends={data.friends}
                gallery={data.gallery}
                pages={data.pages}
                comments={data.comments}
                currentUser={currentUser}
                likedCommentIds={likedCommentIds}
                onSelectPost={openPost}
                onOpenLightbox={openLightbox}
                onSubmitComment={handleSubmitComment}
                onLikeComment={handleLikeComment}
                onDeleteComment={handleDeleteOwnComment}
              />
            )}

            {/* COMPLETE TYPECHO ADMIN BACKEND */}
            {view === 'admin' && (
              <AdminPanel
                token={adminToken}
                onTokenChange={setAdminToken}
                onDataMutated={loadBootstrap}
                onApplyLiveTheme={(patch) => {
                  if (patch.hue !== undefined) handleChangeHue(patch.hue);
                  if (patch.radiusStyle) handleChangeRadius(patch.radiusStyle);
                  if (patch.themeMode) handleChangeThemeMode(patch.themeMode);
                }}
              />
            )}
          </div>
        </div>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="mt-12 border-t border-[var(--md-outline-variant)]/80 bg-[var(--md-surface-container-lowest)]">
        <div className="mx-auto max-w-[1340px] px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--md-on-surface-variant)]">
          <div className="text-center sm:text-left">
            <span className="font-medium text-[var(--md-on-surface)]">
              {data.config.footerCopyright}
            </span>
            {data.config.icpText && <span className="ml-2">· {data.config.icpText}</span>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigateWithTransition(() => setView('shop'))}
              className="hover:text-[var(--md-primary)] transition-colors cursor-pointer"
            >
              晴风小铺
            </button>
            <button
              type="button"
              onClick={() =>
                navigateWithTransition(() => {
                  setExploreTab('archives');
                  setExplorePageSlug(null);
                  setView('explore');
                })
              }
              className="hover:text-[var(--md-primary)] transition-colors cursor-pointer"
            >
              文章归档
            </button>
            {data.pages.slice(0, 3).map((pg) => (
              <button
                key={pg.id}
                type="button"
                onClick={() =>
                  navigateWithTransition(() => {
                    setExploreTab('pages');
                    setExplorePageSlug(pg.slug);
                    setView('explore');
                  })
                }
                className="hover:text-[var(--md-primary)] transition-colors cursor-pointer"
              >
                {pg.title}
              </button>
            ))}
            <a
              href="/api/feed.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--md-primary)] transition-colors"
            >
              RSS 2.0
            </a>
          </div>
        </div>
      </footer>

      {/* Global Search Modal */}
      <SearchModal
        open={searchOpen}
        posts={data.posts}
        moments={data.moments}
        pages={data.pages}
        onClose={() => setSearchOpen(false)}
        onSelectPost={openPost}
        onSelectMoments={() => navigateWithTransition(() => setView('moments'))}
        onSelectPage={(slug) =>
          navigateWithTransition(() => {
            setExploreTab('pages');
            setExplorePageSlug(slug);
            setView('explore');
          })
        }
      />

      {/* Member Account & Profile Center Modal */}
      <AccountModal
        open={accountModalOpen}
        initialTab={accountModalTab}
        currentUser={currentUser}
        userOrders={userOrders}
        posts={data.posts}
        moments={data.moments}
        savedPostIds={savedPostIds}
        likedPostIds={likedPostIds}
        likedMomentIds={likedMomentIds}
        onClose={() => setAccountModalOpen(false)}
        onLogin={handleUserLogin}
        onRegister={handleUserRegister}
        onUpdateProfile={handleUpdateUserProfile}
        onLogout={handleUserLogout}
        onRefundOrder={handleRefundFromAccount}
        onOpenPost={openPost}
        onOpenMoments={() => navigateWithTransition(() => setView('moments'))}
      />

      {/* Independent Global Lightbox */}
      {lightboxState && (
        <GlobalLightbox
          slides={lightboxState.slides}
          initialIndex={lightboxState.index}
          onClose={() => setLightboxState(null)}
        />
      )}
    </div>
  );
}
