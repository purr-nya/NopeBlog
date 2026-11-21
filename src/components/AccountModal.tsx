import { useEffect, useState, type FormEvent } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  Download,
  Heart,
  LogOut,
  Package,
  RotateCcw,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import type { Moment, Order, Post, UserProfile } from '../types/blog';
import { formatPriceCny } from '../utils/shopLogic';
import { formatShortDate } from '../utils/blogLogic';

type AuthTab = 'login' | 'register';
type ProfileTab = 'profile' | 'orders' | 'library';

interface AccountModalProps {
  open: boolean;
  initialTab?: AuthTab | ProfileTab;
  currentUser: UserProfile | null;
  userOrders: Order[];
  posts: Post[];
  moments: Moment[];
  savedPostIds: string[];
  likedPostIds: string[];
  likedMomentIds: string[];
  onClose: () => void;
  onLogin: (payload: { identifier: string; password: string }) => Promise<void>;
  onRegister: (payload: {
    username: string;
    displayName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  onUpdateProfile: (payload: {
    displayName: string;
    bio: string;
    avatarHue: number;
  }) => Promise<void>;
  onLogout: () => Promise<void>;
  onRefundOrder: (orderId: string, customerEmail: string) => Promise<void>;
  onOpenPost: (post: Post) => void;
  onOpenMoments: () => void;
}

const ORDER_STATUS_LABEL: Record<Order['status'], string> = {
  pending_payment: '待支付',
  paid: '已支付',
  shipped: '已发货',
  fulfilled: '已交付',
  refunded: '已退款',
};

export function AccountModal({
  open,
  initialTab,
  currentUser,
  userOrders,
  posts,
  moments,
  savedPostIds,
  likedPostIds,
  likedMomentIds,
  onClose,
  onLogin,
  onRegister,
  onUpdateProfile,
  onLogout,
  onRefundOrder,
  onOpenPost,
  onOpenMoments,
}: AccountModalProps) {
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [profileTab, setProfileTab] = useState<ProfileTab>('profile');

  // Auth form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Profile editor states
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editHue, setEditHue] = useState(250);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAuthError(null);
    setProfileNotice(null);
    if (currentUser) {
      setEditName(currentUser.displayName);
      setEditBio(currentUser.bio);
      setEditHue(currentUser.avatarHue);
      if (initialTab === 'orders' || initialTab === 'library' || initialTab === 'profile') {
        setProfileTab(initialTab);
      }
    } else if (initialTab === 'login' || initialTab === 'register') {
      setAuthTab(initialTab);
    }
  }, [open, currentUser, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setBusy(true);
    try {
      if (authTab === 'login') {
        if (!identifier.trim() || !password) {
          setAuthError('请填写用户名/邮箱与密码');
          return;
        }
        await onLogin({ identifier: identifier.trim(), password });
      } else {
        if (!username.trim() || !email.trim() || password.length < 6) {
          setAuthError('请填写用户名、有效邮箱，以及至少 6 位密码');
          return;
        }
        await onRegister({
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          email: email.trim(),
          password,
        });
      }
      setPassword('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    setBusy(true);
    try {
      await onUpdateProfile({
        displayName: editName.trim() || currentUser?.username || '',
        bio: editBio.trim(),
        avatarHue: editHue,
      });
      setProfileNotice('个人资料已保存并同步');
    } catch (err) {
      setProfileNotice(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLicense = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1800);
    } catch {
      setCopiedKey(null);
    }
  };

  const likedPosts = posts.filter((p) => likedPostIds.includes(p.id));
  const savedPosts = posts.filter((p) => savedPostIds.includes(p.id));
  const likedMoments = moments.filter((m) => likedMomentIds.includes(m.id));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentUser ? '会员个人中心' : '会员登录与注册'}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fuwari-modal-enter w-full max-w-2xl rounded-[var(--radius-card)] bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline-variant)] shadow-2xl overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[var(--md-outline-variant)]/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {currentUser ? (
              <span
                style={{ backgroundColor: `oklch(0.72 0.14 ${currentUser.avatarHue})` }}
                className="w-10 h-10 rounded-2xl text-white font-display font-bold text-base inline-flex items-center justify-center shrink-0"
              >
                {currentUser.displayName.slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <span className="w-10 h-10 rounded-2xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] inline-flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)] truncate">
                {currentUser ? currentUser.displayName : '晴风志会员通行证'}
              </h2>
              <p className="text-xs text-[var(--md-on-surface-variant)] truncate">
                {currentUser
                  ? `@${currentUser.username} · ${currentUser.email}`
                  : '同步点赞、收藏、评论身份与商店订单资产'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="关闭账号窗口"
            className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guest Auth View */}
        {!currentUser ? (
          <div className="p-6 sm:p-7 space-y-5">
            <div
              role="tablist"
              aria-label="账号认证方式"
              className="grid grid-cols-2 gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'login'}
                onClick={() => {
                  setAuthTab('login');
                  setAuthError(null);
                }}
                className={`py-2 text-sm font-medium rounded-[calc(var(--radius-control)-4px)] transition-colors cursor-pointer ${
                  authTab === 'login'
                    ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                登录账号
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'register'}
                onClick={() => {
                  setAuthTab('register');
                  setAuthError(null);
                }}
                className={`py-2 text-sm font-medium rounded-[calc(var(--radius-control)-4px)] transition-colors cursor-pointer ${
                  authTab === 'register'
                    ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                注册新会员
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authTab === 'login' ? (
                <div>
                  <label
                    htmlFor="acc-identifier"
                    className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                  >
                    用户名或邮箱
                  </label>
                  <input
                    id="acc-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="输入用户名或注册邮箱"
                    className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="acc-username"
                        className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                      >
                        用户名 *（3-24位字母数字）
                      </label>
                      <input
                        id="acc-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="如：kaze_reader"
                        className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="acc-display-name"
                        className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                      >
                        展示昵称
                      </label>
                      <input
                        id="acc-display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="如：林间旅人"
                        className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="acc-email"
                      className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                    >
                      电子邮箱 *（用于接收商店订单与数字授权）
                    </label>
                    <input
                      id="acc-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="reader@example.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="acc-password"
                  className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                >
                  密码 *（至少 6 位，服务端 scrypt 加盐存储）
                </label>
                <input
                  id="acc-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] focus:border-[var(--md-primary)] outline-none"
                />
              </div>

              {authError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 text-sm font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:opacity-92 disabled:opacity-60 transition-opacity cursor-pointer"
              >
                {busy
                  ? '处理中...'
                  : authTab === 'login'
                    ? '立即登录'
                    : '创建会员账号并登录'}
              </button>
            </form>

            <div className="pt-3 border-t border-[var(--md-outline-variant)]/60 flex items-center gap-2 text-xs text-[var(--md-on-surface-variant)]">
              <ShieldCheck className="w-4 h-4 text-[var(--md-primary)] shrink-0" />
              <span>会话令牌仅保存在浏览器内存中，关闭页面自动失效，不写入本地明文缓存。</span>
            </div>
          </div>
        ) : (
          /* Authenticated Member Center */
          <div className="p-6 sm:p-7 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="个人中心栏目"
                className="inline-flex items-center gap-1 p-1 rounded-[var(--radius-control)] bg-[var(--md-surface-container)]"
              >
                {(
                  [
                    { id: 'profile', label: '个人资料', icon: User },
                    { id: 'orders', label: `我的订单 (${userOrders.length})`, icon: Package },
                    {
                      id: 'library',
                      label: `点赞与收藏 (${likedPosts.length + savedPosts.length})`,
                      icon: Heart,
                    },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = profileTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setProfileTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] whitespace-nowrap transition-colors cursor-pointer ${
                        active
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

              <button
                type="button"
                onClick={() => void onLogout()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-control)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container)] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>退出登录</span>
              </button>
            </div>

            {/* Profile Tab */}
            {profileTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="prof-name"
                      className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                    >
                      展示昵称
                    </label>
                    <input
                      id="prof-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="prof-hue"
                      className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                    >
                      专属头像色相 ({editHue}°)
                    </label>
                    <div className="flex items-center gap-3 pt-1">
                      <span
                        style={{ backgroundColor: `oklch(0.72 0.14 ${editHue})` }}
                        className="w-8 h-8 rounded-xl text-white font-display font-bold text-xs inline-flex items-center justify-center shrink-0"
                      >
                        {(editName || currentUser.username).slice(0, 1).toUpperCase()}
                      </span>
                      <input
                        id="prof-hue"
                        type="range"
                        min={0}
                        max={359}
                        value={editHue}
                        onChange={(e) => setEditHue(Number(e.target.value))}
                        className="hue-slider flex-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="prof-bio"
                    className="block text-xs font-medium text-[var(--md-on-surface-variant)] mb-1.5"
                  >
                    个性签名
                  </label>
                  <textarea
                    id="prof-bio"
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="介绍一下你自己..."
                    className="w-full px-3.5 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] outline-none"
                  />
                </div>

                {profileNotice && (
                  <p className="text-xs font-medium text-[var(--md-primary)]">{profileNotice}</p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-primary)] text-[var(--md-on-primary)] cursor-pointer"
                  >
                    {busy ? '保存中...' : '保存个人资料'}
                  </button>
                </div>
              </form>
            )}

            {/* Orders & Digital Downloads Tab */}
            {profileTab === 'orders' && (
              <div className="space-y-4">
                {userOrders.length === 0 ? (
                  <div className="py-10 text-center text-sm text-[var(--md-on-surface-variant)]">
                    你还没有商店订单，去晴风小铺逛逛吧。
                  </div>
                ) : (
                  userOrders.map((order) => {
                    const isPaidOrFulfilled =
                      order.status === 'paid' ||
                      order.status === 'shipped' ||
                      order.status === 'fulfilled';
                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)]/70 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="font-mono text-[var(--md-on-surface)] tabular-nums">
                            {order.orderNo}
                            <span className="mx-2 text-[var(--md-on-surface-variant)]">·</span>
                            <span className="font-sans font-semibold text-[var(--md-primary)]">
                              {ORDER_STATUS_LABEL[order.status]}
                            </span>
                          </div>
                          <div className="text-[var(--md-on-surface-variant)] tabular-nums">
                            {formatShortDate(order.createdAt)} · 实付{' '}
                            <strong className="text-[var(--md-on-surface)]">
                              {formatPriceCny(order.totalCents)}
                            </strong>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div
                              key={`${order.id}-${item.productId}-${item.variantId}`}
                              className="flex flex-wrap items-center justify-between gap-3 py-2 border-t border-[var(--md-outline-variant)]/50"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[var(--md-on-surface)]">
                                  {item.title}{' '}
                                  <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">
                                    ({item.variantName} × {item.quantity})
                                  </span>
                                </div>
                                {item.digitalLicenseKey && isPaidOrFulfilled && (
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--md-primary)]">
                                    <span>授权码：{item.digitalLicenseKey}</span>
                                    <button
                                      type="button"
                                      onClick={() => void handleCopyLicense(item.digitalLicenseKey!)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-sans cursor-pointer"
                                    >
                                      {copiedKey === item.digitalLicenseKey ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span>
                                        {copiedKey === item.digitalLicenseKey ? '已复制' : '复制'}
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {item.type === 'digital' && isPaidOrFulfilled && (
                                <a
                                  href={`/api/orders/${encodeURIComponent(order.id)}/download/${encodeURIComponent(item.productId)}?email=${encodeURIComponent(order.customerEmail)}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--md-primary)] text-[var(--md-on-primary)] whitespace-nowrap shrink-0"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>下载授权清单</span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[var(--md-on-surface-variant)]">
                          <span>
                            {order.paymentReference
                              ? `支付流水：${order.paymentReference}`
                              : '等待支付完成'}
                            {order.trackingNumber ? ` · 物流单号：${order.trackingNumber}` : ''}
                          </span>
                          {isPaidOrFulfilled && (
                            <button
                              type="button"
                              disabled={refundingId === order.id}
                              onClick={async () => {
                                setRefundingId(order.id);
                                try {
                                  await onRefundOrder(order.id, order.customerEmail);
                                } finally {
                                  setRefundingId(null);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{refundingId === order.id ? '退款中...' : '申请退款'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Likes & Bookmarks Tab */}
            {profileTab === 'library' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--md-on-surface-variant)] mb-2 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-[var(--md-primary)]" />
                    <span>收藏文章 ({savedPosts.length})</span>
                  </h3>
                  {savedPosts.length === 0 ? (
                    <p className="text-xs text-[var(--md-on-surface-variant)]">暂无收藏文章</p>
                  ) : (
                    <div className="space-y-1.5">
                      {savedPosts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onOpenPost(p);
                            onClose();
                          }}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container)] text-sm text-[var(--md-on-surface)] transition-colors cursor-pointer"
                        >
                          {p.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-[var(--md-on-surface-variant)] mb-2 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[var(--md-primary)]" />
                    <span>赞过的文章 ({likedPosts.length}) · 赞过的说说 ({likedMoments.length})</span>
                  </h3>
                  <div className="space-y-1.5">
                    {likedPosts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onOpenPost(p);
                          onClose();
                        }}
                        className="w-full text-left px-3.5 py-2 rounded-xl bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container)] text-xs text-[var(--md-on-surface)] cursor-pointer"
                      >
                        [文章] {p.title}
                      </button>
                    ))}
                    {likedMoments.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onOpenMoments();
                          onClose();
                        }}
                        className="w-full text-left px-3.5 py-2 rounded-xl bg-[var(--md-surface-container-low)] hover:bg-[var(--md-surface-container)] text-xs text-[var(--md-on-surface)] line-clamp-1 cursor-pointer"
                      >
                        [说说] {m.content}
                      </button>
                    ))}
                    {likedPosts.length === 0 && likedMoments.length === 0 && (
                      <p className="text-xs text-[var(--md-on-surface-variant)]">还没有点过赞</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
