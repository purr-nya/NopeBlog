import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  Check,
  Download,
  FileText,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Palette,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type {
  AdminAuthState,
  BlogBootstrapData,
  DensityMode,
  HomeLayoutMode,
  Post,
  RadiusStyle,
  ThemeMode,
} from '../types/blog';
import { blogApi } from '../services/api';
import { computeCorpusWordCount, formatShortDate } from '../utils/blogLogic';
import { HUE_PRESETS } from '../utils/theme';
import { AdminPostEditor } from './AdminPostEditor';

type AdminTab =
  | 'dashboard'
  | 'posts'
  | 'pages'
  | 'moments'
  | 'comments'
  | 'taxonomy'
  | 'status'
  | 'customize';

interface AdminPanelProps {
  token: string | null;
  onTokenChange: (token: string | null) => void;
  onDataMutated: () => Promise<void>;
  onApplyLiveTheme: (patch: { hue?: number; radiusStyle?: RadiusStyle; themeMode?: ThemeMode }) => void;
}

export function AdminPanel({
  token,
  onTokenChange,
  onDataMutated,
  onApplyLiveTheme,
}: AdminPanelProps) {
  const [authState, setAuthState] = useState<AdminAuthState | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [adminData, setAdminData] = useState<BlogBootstrapData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Post Editor state
  const [editingPost, setEditingPost] = useState<Post | null | 'new'>(null);

  // Standalone Page creation state
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageSubtitle, setPageSubtitle] = useState('');
  const [pageContent, setPageContent] = useState('');

  // Moment composer state
  const [momentContent, setMomentContent] = useState('');
  const [momentMood, setMomentMood] = useState('灵感迸发');
  const [momentLocation, setMomentLocation] = useState('杭州 · 西溪书房');
  const [momentWeather, setMomentWeather] = useState('晴 · 17°C');
  const [momentMusic, setMomentMusic] = useState('');
  const [momentTags, setMomentTags] = useState('日常, 灵感');
  const [momentImage, setMomentImage] = useState('');

  // Category creation state
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Status form state
  const [statusForm, setStatusForm] = useState({
    activity: '',
    mood: '',
    location: '',
    nowPlaying: '',
    currentlyReading: '',
    focusMessage: '',
  });

  // Site Config form state
  const [configForm, setConfigForm] = useState({
    siteName: '',
    tagline: '',
    heroTitle: '',
    heroSubtitle: '',
    showHeroBanner: true,
    announcement: '',
    authorName: '',
    authorBio: '',
    authorLocation: '',
    defaultHue: 250,
    defaultThemeMode: 'light' as ThemeMode,
    radiusStyle: 'expressive' as RadiusStyle,
    homeLayout: 'feed' as HomeLayoutMode,
    density: 'comfortable' as DensityMode,
    footerCopyright: '',
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2600);
  };

  const refreshAuthState = async (activeToken = token) => {
    const state = await blogApi.getAdminAuthState(activeToken);
    setAuthState(state);
    if (!state.authenticated && activeToken) {
      onTokenChange(null);
    }
  };

  const loadOverview = async (activeToken: string) => {
    setLoadingOverview(true);
    try {
      const data = await blogApi.getAdminOverview(activeToken);
      setAdminData(data);
      setStatusForm({
        activity: data.personalStatus.activity,
        mood: data.personalStatus.mood,
        location: data.personalStatus.location,
        nowPlaying: data.personalStatus.nowPlaying,
        currentlyReading: data.personalStatus.currentlyReading,
        focusMessage: data.personalStatus.focusMessage,
      });
      setConfigForm({
        siteName: data.config.siteName,
        tagline: data.config.tagline,
        heroTitle: data.config.heroTitle,
        heroSubtitle: data.config.heroSubtitle,
        showHeroBanner: data.config.showHeroBanner,
        announcement: data.config.announcement,
        authorName: data.config.authorName,
        authorBio: data.config.authorBio,
        authorLocation: data.config.authorLocation,
        defaultHue: data.config.defaultHue,
        defaultThemeMode: data.config.defaultThemeMode,
        radiusStyle: data.config.radiusStyle,
        homeLayout: data.config.homeLayout,
        density: data.config.density,
        footerCopyright: data.config.footerCopyright,
      });
    } catch {
      onTokenChange(null);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    void refreshAuthState(token);
  }, [token]);

  useEffect(() => {
    if (token && authState?.authenticated) {
      void loadOverview(token);
    }
  }, [token, authState?.authenticated]);

  const handleClaim = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passwordInput.trim().length < 6) {
      setAuthError('请设置至少 6 位的管理员密码');
      return;
    }
    if (passwordInput !== confirmInput) {
      setAuthError('两次输入的密码不一致');
      return;
    }
    setAuthBusy(true);
    try {
      const res = await blogApi.claimAdmin(passwordInput.trim());
      onTokenChange(res.token);
      setPasswordInput('');
      setConfirmInput('');
      await refreshAuthState(res.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '初始化失败');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!passwordInput.trim()) {
      setAuthError('请输入管理员密码');
      return;
    }
    setAuthBusy(true);
    try {
      const res = await blogApi.loginAdmin(passwordInput.trim());
      onTokenChange(res.token);
      setPasswordInput('');
      await refreshAuthState(res.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await blogApi.logoutAdmin(token).catch(() => {});
    }
    onTokenChange(null);
    setAdminData(null);
  };

  // --- Admin Auth Gate (First-Run Claim OR Login) ---
  if (!authState || !authState.authenticated || !token) {
    const needsClaim = authState && !authState.hasAdmin;

    return (
      <div className="max-w-md mx-auto my-8 sm:my-14 m3-card p-7 sm:p-9 space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] inline-flex items-center justify-center">
            {needsClaim ? <ShieldCheck className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--md-on-surface)]">
            {needsClaim ? '初始化 Typecho 管理员密码' : '登录晴风志后台'}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] leading-relaxed">
            {needsClaim
              ? '首次进入后台，请设置一个管理员密码。密码将使用 scrypt 加盐哈希保存于服务端。'
              : authState?.envPasscodeActive
                ? '当前由服务端环境变量 ADMIN_PASSCODE 托管管理员口令。'
                : '请输入你已设置的管理员密码进入完整 CMS 控制台。'}
          </p>
        </div>

        <form onSubmit={needsClaim ? handleClaim : handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-pwd" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5">
              {needsClaim ? '设置管理员密码（至少 6 位）' : '管理员密码'}
            </label>
            <input
              id="admin-pwd"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="输入密码..."
              className="w-full px-4 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
            />
          </div>

          {needsClaim && (
            <div>
              <label htmlFor="admin-pwd-confirm" className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5">
                确认管理员密码
              </label>
              <input
                id="admin-pwd-confirm"
                type="password"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="再次输入密码..."
                className="w-full px-4 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
              />
            </div>
          )}

          {authError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={authBusy}
            className="w-full py-2.5 text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 transition-opacity cursor-pointer"
          >
            {authBusy ? '验证中...' : needsClaim ? '完成初始化并进入后台' : '登录后台'}
          </button>
        </form>
      </div>
    );
  }

  // --- Authenticated CMS Actions ---
  const syncAfterMutation = async (message: string) => {
    await Promise.all([loadOverview(token), onDataMutated()]);
    notify(message);
  };

  const handleSavePost = async (payload: Record<string, unknown>, existingId?: string) => {
    if (existingId) {
      await blogApi.updatePost(token, existingId, payload);
      await syncAfterMutation('文章已更新并同步到前台');
    } else {
      await blogApi.createPost(token, payload);
      await syncAfterMutation('新文章已发布');
    }
    setEditingPost(null);
  };

  const handleCreateMoment = async (e: FormEvent) => {
    e.preventDefault();
    if (!momentContent.trim()) return;
    await blogApi.createMoment(token, {
      content: momentContent.trim(),
      mood: momentMood.trim(),
      location: momentLocation.trim(),
      weather: momentWeather.trim(),
      musicTrack: momentMusic.trim(),
      image: momentImage.trim(),
      tags: momentTags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setMomentContent('');
    setMomentMusic('');
    setMomentImage('');
    await syncAfterMutation('说说已发布');
  };

  const handleCreatePage = async (e: FormEvent) => {
    e.preventDefault();
    if (!pageTitle.trim()) return;
    await blogApi.createPage(token, {
      title: pageTitle.trim(),
      slug: pageSlug.trim() || undefined,
      subtitle: pageSubtitle.trim(),
      content: pageContent,
      allowComment: true,
    });
    setPageTitle('');
    setPageSlug('');
    setPageSubtitle('');
    setPageContent('');
    await syncAfterMutation('独立页面已创建');
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await blogApi.createCategory(token, {
      name: catName.trim(),
      slug: catSlug.trim() || undefined,
      description: catDesc.trim(),
    });
    setCatName('');
    setCatSlug('');
    setCatDesc('');
    await syncAfterMutation('新分类已添加');
  };

  const handleSaveStatus = async (e: FormEvent) => {
    e.preventDefault();
    await blogApi.updatePersonalStatus(token, statusForm);
    await syncAfterMutation('个人实时状态已更新');
  };

  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    await blogApi.updateSiteConfig(token, configForm);
    onApplyLiveTheme({
      hue: configForm.defaultHue,
      radiusStyle: configForm.radiusStyle,
      themeMode: configForm.defaultThemeMode,
    });
    await syncAfterMutation('站点自定义配置已持久化');
  };

  const handleDownloadBackup = async () => {
    const blob = await blogApi.downloadExport(token);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kazeblog-typecho-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    notify('已导出全站 JSON 备份文件');
  };

  const pendingCommentsCount =
    adminData?.comments.filter((c) => c.status !== 'approved').length ?? 0;
  const pendingFriendsCount =
    adminData?.friends.filter((f) => f.status === 'pending').length ?? 0;

  const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
    { id: 'dashboard', label: '控制台概览', icon: LayoutDashboard },
    { id: 'posts', label: '文章管理', icon: FileText, count: adminData?.posts.length },
    { id: 'pages', label: '独立页面', icon: FolderKanban, count: adminData?.pages.length },
    { id: 'moments', label: '说说发布', icon: MessageSquarePlus, count: adminData?.moments.length },
    { id: 'comments', label: '评论审核', icon: MessageCircle, count: pendingCommentsCount || undefined },
    { id: 'taxonomy', label: '分类与友链', icon: ShieldCheck, count: pendingFriendsCount || undefined },
    { id: 'status', label: '个人状态', icon: Activity },
    { id: 'customize', label: '外观与定制', icon: Palette },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Admin Navigation Rail */}
      <aside className="lg:col-span-3 m3-card p-4 space-y-2 lg:sticky lg:top-24">
        <div className="px-3 py-2">
          <div className="font-display text-base font-bold text-[var(--md-on-surface)]">
            Typecho 控制台
          </div>
          <div className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
            全功能内容与外观管理后台
          </div>
        </div>

        <nav aria-label="后台功能菜单" className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setEditingPost(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-[var(--radius-control)] transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                    : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-low)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </span>
                {item.count !== undefined && (
                  <span className="font-mono text-xs tabular-nums opacity-80">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-3 mt-3 border-t border-[var(--md-outline-variant)] space-y-1.5">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container)] cursor-pointer"
          >
            <Download className="w-4 h-4 text-[var(--md-primary)]" />
            <span>导出 JSON 全站备份</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium rounded-[var(--radius-control)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-low)] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* Admin Main Workspace */}
      <div className="lg:col-span-9 space-y-5">
        {toast && (
          <div
            role="status"
            className="px-4 py-3 rounded-[var(--radius-control)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] text-sm font-medium"
          >
            {toast}
          </div>
        )}

        {loadingOverview || !adminData ? (
          <div className="m3-card p-10 text-center text-sm text-[var(--md-on-surface-variant)]">
            正在加载控制台数据...
          </div>
        ) : (
          <>
            {/* Tab 1: Dashboard Overview */}
            {activeTab === 'dashboard' && (
              <div className="space-y-5">
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: '文章总数', value: adminData.posts.length },
                    { label: '说说动态', value: adminData.moments.length },
                    { label: '评论总数', value: adminData.comments.length },
                    {
                      label: '全站字数',
                      value: computeCorpusWordCount(adminData.posts, adminData.moments).toLocaleString(),
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="m3-card p-5">
                      <div className="text-xs text-[var(--md-on-surface-variant)]">{stat.label}</div>
                      <div className="mt-2 font-display text-2xl font-bold tabular-nums text-[var(--md-on-surface)]">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </section>

                <section className="m3-card p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                      快捷创作入口
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('posts');
                          setEditingPost('new');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>撰写新文章</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('moments')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] cursor-pointer"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>发一条说说</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('customize')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] cursor-pointer"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <span>定制主题外观</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)]">
                      <div className="text-xs font-semibold text-[var(--md-on-surface)] mb-2">
                        待处理事项
                      </div>
                      <ul className="space-y-1.5 text-xs text-[var(--md-on-surface-variant)]">
                        <li>待审核/疑似垃圾评论：{pendingCommentsCount} 条</li>
                        <li>待审核友链申请：{pendingFriendsCount} 条</li>
                        <li>当前首页展示模式：{adminData.config.homeLayout}</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)]">
                      <div className="text-xs font-semibold text-[var(--md-on-surface)] mb-2">
                        当前实时状态
                      </div>
                      <p className="text-xs text-[var(--md-on-surface)]">
                        {adminData.personalStatus.mood} · {adminData.personalStatus.activity}
                      </p>
                      <p className="text-xs text-[var(--md-on-surface-variant)] mt-1">
                        {adminData.personalStatus.nowPlaying}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Tab 2: Posts Management + Markdown Editor */}
            {activeTab === 'posts' && (
              <section className="m3-card p-6">
                {editingPost !== null ? (
                  <AdminPostEditor
                    initialPost={editingPost === 'new' ? null : editingPost}
                    categories={adminData.categories}
                    onSave={handleSavePost}
                    onCancel={() => setEditingPost(null)}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                        文章管理 ({adminData.posts.length})
                      </h2>
                      <button
                        type="button"
                        onClick={() => setEditingPost('new')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>撰写新文章</span>
                      </button>
                    </div>

                    <div className="divide-y divide-[var(--md-outline-variant)]/70">
                      {adminData.posts.map((post) => (
                        <div
                          key={post.id}
                          className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-[var(--md-on-surface)] truncate">
                              {post.pinned ? '[置顶] ' : ''}
                              {post.hasPassword ? '[加密] ' : ''}
                              {post.title}
                            </div>
                            <div className="text-xs text-[var(--md-on-surface-variant)] mt-0.5 tabular-nums">
                              状态：{post.status} · 分类：{post.categorySlug} · {formatShortDate(post.createdAt)} · 阅读 {post.views}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingPost(post)}
                              aria-label={`编辑文章 ${post.title}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>编辑</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await blogApi.deletePost(token, post.id);
                                await syncAfterMutation('文章已删除');
                              }}
                              aria-label={`删除文章 ${post.title}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>删除</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Tab 3: Typecho Standalone Pages */}
            {activeTab === 'pages' && (
              <div className="space-y-5">
                <section className="m3-card p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                    新建 Typecho 独立页面
                  </h2>
                  <form onSubmit={handleCreatePage} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={pageTitle}
                        onChange={(e) => setPageTitle(e.target.value)}
                        placeholder="独立页面标题（如：书影音清单）"
                        aria-label="独立页面标题"
                        className="px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                      <input
                        type="text"
                        value={pageSlug}
                        onChange={(e) => setPageSlug(e.target.value)}
                        placeholder="页面路径缩略名（如：books）"
                        aria-label="独立页面缩略名"
                        className="px-3.5 py-2 text-sm font-mono rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      value={pageSubtitle}
                      onChange={(e) => setPageSubtitle(e.target.value)}
                      placeholder="页面副标题描述（选填）"
                      aria-label="独立页面副标题"
                      className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                    <textarea
                      rows={5}
                      value={pageContent}
                      onChange={(e) => setPageContent(e.target.value)}
                      placeholder="独立页面 Markdown 正文..."
                      aria-label="独立页面正文"
                      className="w-full p-3.5 text-sm font-mono rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
                      >
                        创建独立页面
                      </button>
                    </div>
                  </form>
                </section>

                <section className="m3-card p-6 space-y-3">
                  <h3 className="font-display text-base font-bold text-[var(--md-on-surface)]">
                    已有独立页面 ({adminData.pages.length})
                  </h3>
                  <div className="divide-y divide-[var(--md-outline-variant)]/70">
                    {adminData.pages.map((pg) => (
                      <div key={pg.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-[var(--md-on-surface)]">
                            {pg.title} <span className="font-mono text-xs opacity-60">/{pg.slug}</span>
                          </div>
                          {pg.subtitle && (
                            <div className="text-xs text-[var(--md-on-surface-variant)]">{pg.subtitle}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await blogApi.deletePage(token, pg.id);
                            await syncAfterMutation('独立页面已删除');
                          }}
                          aria-label={`删除独立页面 ${pg.title}`}
                          className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Tab 4: Moments (说说) Composer & List */}
            {activeTab === 'moments' && (
              <div className="space-y-5">
                <section className="m3-card p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                    发布新说说
                  </h2>
                  <form onSubmit={handleCreateMoment} className="space-y-3">
                    <textarea
                      rows={3}
                      value={momentContent}
                      onChange={(e) => setMomentContent(e.target.value)}
                      placeholder="此刻在想什么？记录一条带心情与声音的日常碎片..."
                      aria-label="新说说内容"
                      className="w-full p-3.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={momentMood}
                        onChange={(e) => setMomentMood(e.target.value)}
                        placeholder="心情（如：灵感迸发）"
                        aria-label="说说心情"
                        className="px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                      <input
                        type="text"
                        value={momentLocation}
                        onChange={(e) => setMomentLocation(e.target.value)}
                        placeholder="地点（选填）"
                        aria-label="说说地点"
                        className="px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                      <input
                        type="text"
                        value={momentWeather}
                        onChange={(e) => setMomentWeather(e.target.value)}
                        placeholder="天气（选填）"
                        aria-label="说说天气"
                        className="px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={momentMusic}
                        onChange={(e) => setMomentMusic(e.target.value)}
                        placeholder="配乐单曲（选填）"
                        aria-label="说说配乐"
                        className="px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                      <input
                        type="text"
                        value={momentTags}
                        onChange={(e) => setMomentTags(e.target.value)}
                        placeholder="标签（逗号分隔）"
                        aria-label="说说标签"
                        className="px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                      <select
                        value={momentImage}
                        onChange={(e) => setMomentImage(e.target.value)}
                        aria-label="选择说说配图"
                        className="px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      >
                        <option value="">不附带配图</option>
                        <option value="/src/assets/images/cover_desk_setup_1795201622816.jpg">橡木书桌</option>
                        <option value="/src/assets/images/cover_tokyo_walk_1795201621571.jpg">京都雨夜</option>
                        <option value="/src/assets/images/cover_m3_design_1795201622507.jpg">M3 几何静物</option>
                        <option value="/src/assets/images/cover_mountain_mist_1795201633310.jpg">拂晓湖雾</option>
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
                      >
                        立即发布说说
                      </button>
                    </div>
                  </form>
                </section>

                <section className="m3-card p-6 space-y-3">
                  <h3 className="font-display text-base font-bold text-[var(--md-on-surface)]">
                    已发布说说 ({adminData.moments.length})
                  </h3>
                  <div className="divide-y divide-[var(--md-outline-variant)]/70">
                    {adminData.moments.map((m) => (
                      <div key={m.id} className="py-3 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-xs text-[var(--md-primary)]">
                            {m.mood} · {formatShortDate(m.createdAt)} · 点赞 {m.likes}
                          </div>
                          <p className="mt-1 text-sm text-[var(--md-on-surface)]">{m.content}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await blogApi.deleteMoment(token, m.id);
                            await syncAfterMutation('说说已删除');
                          }}
                          aria-label={`删除说说 ${m.id}`}
                          className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0 cursor-pointer"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Tab 5: Comment Moderation Queue */}
            {activeTab === 'comments' && (
              <section className="m3-card p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                  评论管理与审核队列 ({adminData.comments.length})
                </h2>
                <div className="divide-y divide-[var(--md-outline-variant)]/70">
                  {adminData.comments.map((cmt) => (
                    <div key={cmt.id} className="py-4 flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-[var(--md-on-surface-variant)]">
                          <span className="font-semibold text-[var(--md-on-surface)]">{cmt.author}</span>
                          {' · '}
                          <span>目标：{cmt.targetType}</span>
                          {' · '}
                          <span className="font-medium text-[var(--md-primary)]">
                            状态：{cmt.status === 'approved' ? '已公开' : cmt.status === 'pending' ? '待审核' : '疑似垃圾'}
                          </span>
                          {' · '}
                          <span className="tabular-nums">{formatShortDate(cmt.createdAt)}</span>
                        </div>
                        <p className="mt-1.5 text-sm text-[var(--md-on-surface)]">{cmt.content}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {cmt.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await blogApi.updateCommentStatus(token, cmt.id, 'approved');
                              await syncAfterMutation('评论已审核通过');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>通过</span>
                          </button>
                        )}
                        {cmt.status !== 'spam' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await blogApi.updateCommentStatus(token, cmt.id, 'spam');
                              await syncAfterMutation('评论已标记为垃圾');
                            }}
                            className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] cursor-pointer"
                          >
                            标为垃圾
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await blogApi.deleteComment(token, cmt.id);
                            await syncAfterMutation('评论已删除');
                          }}
                          className="px-2.5 py-1.5 text-xs rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tab 6: Categories & Friends Moderation */}
            {activeTab === 'taxonomy' && (
              <div className="space-y-5">
                <section className="m3-card p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                    文章分类管理
                  </h2>
                  <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <input
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="新分类名称"
                      aria-label="新分类名称"
                      className="px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                    <input
                      type="text"
                      value={catSlug}
                      onChange={(e) => setCatSlug(e.target.value)}
                      placeholder="缩略名 (slug)"
                      aria-label="新分类缩略名"
                      className="px-3 py-2 text-xs font-mono rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                    <input
                      type="text"
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="分类简介"
                      aria-label="新分类简介"
                      className="px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
                    >
                      新增分类
                    </button>
                  </form>

                  <div className="divide-y divide-[var(--md-outline-variant)]/70">
                    {adminData.categories.map((cat) => (
                      <div key={cat.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-[var(--md-on-surface)]">
                            {cat.name} <span className="font-mono text-xs opacity-60">/{cat.slug}</span>
                          </div>
                          <div className="text-xs text-[var(--md-on-surface-variant)]">{cat.description}</div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await blogApi.deleteCategory(token, cat.id);
                            await syncAfterMutation('分类已移除');
                          }}
                          className="px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="m3-card p-6 space-y-4">
                  <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                    友链审核与名录 ({adminData.friends.length})
                  </h2>
                  <div className="divide-y divide-[var(--md-outline-variant)]/70">
                    {adminData.friends.map((fr) => (
                      <div key={fr.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-[var(--md-on-surface)]">
                            {fr.name}{' '}
                            <span className="text-xs text-[var(--md-primary)]">
                              · {fr.status === 'approved' ? '已展示' : '待审核'}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--md-on-surface-variant)]">
                            {fr.url} — {fr.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {fr.status === 'pending' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await blogApi.updateFriendStatus(token, fr.id, 'approved');
                                await syncAfterMutation('友链已通过审核并上线');
                              }}
                              className="px-3 py-1.5 text-xs rounded-lg bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] cursor-pointer"
                            >
                              审核通过
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              await blogApi.deleteFriend(token, fr.id);
                              await syncAfterMutation('友链已删除');
                            }}
                            className="px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Tab 7: Personal Status Updater */}
            {activeTab === 'status' && (
              <section className="m3-card p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                  更新博主实时状态
                </h2>
                <form onSubmit={handleSaveStatus} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="st-mood" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                        当前心境
                      </label>
                      <input
                        id="st-mood"
                        type="text"
                        value={statusForm.mood}
                        onChange={(e) => setStatusForm((p) => ({ ...p, mood: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="st-loc" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                        所在位置
                      </label>
                      <input
                        id="st-loc"
                        type="text"
                        value={statusForm.location}
                        onChange={(e) => setStatusForm((p) => ({ ...p, location: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="st-act" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                      正在做的事
                    </label>
                    <input
                      id="st-act"
                      type="text"
                      value={statusForm.activity}
                      onChange={(e) => setStatusForm((p) => ({ ...p, activity: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="st-music" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                        正在循环的音乐
                      </label>
                      <input
                        id="st-music"
                        type="text"
                        value={statusForm.nowPlaying}
                        onChange={(e) => setStatusForm((p) => ({ ...p, nowPlaying: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="st-book" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                        案头在读的书
                      </label>
                      <input
                        id="st-book"
                        type="text"
                        value={statusForm.currentlyReading}
                        onChange={(e) =>
                          setStatusForm((p) => ({ ...p, currentlyReading: e.target.value }))
                        }
                        className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="st-focus" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                      近期专注计划
                    </label>
                    <textarea
                      id="st-focus"
                      rows={3}
                      value={statusForm.focusMessage}
                      onChange={(e) =>
                        setStatusForm((p) => ({ ...p, focusMessage: e.target.value }))
                      }
                      className="w-full p-3.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
                    >
                      保存实时状态
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Tab 8: Full Appearance & Site Customizer */}
            {activeTab === 'customize' && (
              <section className="m3-card p-6 space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)]">
                    外观与全站自定义系统
                  </h2>
                  <p className="mt-1 text-xs text-[var(--md-on-surface-variant)]">
                    修改默认 OKLCH 主题色、圆角语言、首页排版模式、横幅文案与博主资料，保存后即时生效。
                  </p>
                </div>

                <form onSubmit={handleSaveConfig} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="cfg-name" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                        博客名称
                      </label>
                      <input
                        id="cfg-name"
                        type="text"
                        value={configForm.siteName}
                        onChange={(e) => setConfigForm((p) => ({ ...p, siteName: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="cfg-author" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                        博主昵称
                      </label>
                      <input
                        id="cfg-author"
                        type="text"
                        value={configForm.authorName}
                        onChange={(e) => setConfigForm((p) => ({ ...p, authorName: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cfg-hero" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                      首页 Hero 主标题
                    </label>
                    <input
                      id="cfg-hero"
                      type="text"
                      value={configForm.heroTitle}
                      onChange={(e) => setConfigForm((p) => ({ ...p, heroTitle: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="cfg-ann" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                      顶部站点公告（留空隐藏）
                    </label>
                    <input
                      id="cfg-ann"
                      type="text"
                      value={configForm.announcement}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, announcement: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                  </div>

                  {/* Theme Visual Controls */}
                  <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--md-on-surface)]">
                        默认 OKLCH 主题色相 ({configForm.defaultHue}°)
                      </span>
                      <div className="flex items-center gap-1.5">
                        {HUE_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setConfigForm((p) => ({ ...p, defaultHue: preset.hue }));
                              onApplyLiveTheme({ hue: preset.hue });
                            }}
                            className="px-2 py-1 text-[11px] rounded-md bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] border border-[var(--md-outline-variant)] cursor-pointer"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={359}
                      value={configForm.defaultHue}
                      onChange={(e) => {
                        const nextHue = Number(e.target.value);
                        setConfigForm((p) => ({ ...p, defaultHue: nextHue }));
                        onApplyLiveTheme({ hue: nextHue });
                      }}
                      aria-label="站点默认主题色相"
                      className="hue-slider w-full cursor-pointer"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="cfg-radius" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                          圆角风格
                        </label>
                        <select
                          id="cfg-radius"
                          value={configForm.radiusStyle}
                          onChange={(e) => {
                            const val = e.target.value as RadiusStyle;
                            setConfigForm((p) => ({ ...p, radiusStyle: val }));
                            onApplyLiveTheme({ radiusStyle: val });
                          }}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                        >
                          <option value="expressive">M3 Expressive 灵动大圆角</option>
                          <option value="balanced">Balanced 平衡圆角</option>
                          <option value="sharp">Sharp 编辑风锐利</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="cfg-layout" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                          默认首页排版
                        </label>
                        <select
                          id="cfg-layout"
                          value={configForm.homeLayout}
                          onChange={(e) =>
                            setConfigForm((p) => ({
                              ...p,
                              homeLayout: e.target.value as HomeLayoutMode,
                            }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                        >
                          <option value="feed">Fuwari 经典文章流</option>
                          <option value="deck">沉浸卡片滑动模式</option>
                          <option value="bento">杂志双栏 Bento 网格</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="cfg-density" className="block text-xs text-[var(--md-on-surface-variant)] mb-1">
                          卡片密度
                        </label>
                        <select
                          id="cfg-density"
                          value={configForm.density}
                          onChange={(e) =>
                            setConfigForm((p) => ({
                              ...p,
                              density: e.target.value as DensityMode,
                            }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                        >
                          <option value="comfortable">舒展留白</option>
                          <option value="compact">紧凑高密</option>
                        </select>
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs text-[var(--md-on-surface)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configForm.showHeroBanner}
                        onChange={(e) =>
                          setConfigForm((p) => ({ ...p, showHeroBanner: e.target.checked }))
                        }
                        className="accent-[var(--md-primary)]"
                      />
                      <span>在首页顶部显示 Fuwari 氛围摄影横幅</span>
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
                    >
                      保存全部自定义配置
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
