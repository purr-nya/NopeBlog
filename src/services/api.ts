import type {
  AdminAuthState,
  BlogBootstrapData,
  CartItem,
  Category,
  Comment,
  FriendLink,
  HealthProbeResult,
  Moment,
  Order,
  OrderStatus,
  PaymentMethod,
  PersonalStatus,
  Post,
  ShopProduct,
  SiteConfig,
  StandalonePage,
  UserProfile,
} from '../types/blog';

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `请求失败 (${response.status})`);
  }
  return data as T;
}

export interface AdminOverviewData extends BlogBootstrapData {
  orders: Order[];
  usersCount: number;
}

export const blogApi = {
  getBootstrap: () => requestJson<BlogBootstrapData>('/api/bootstrap'),
  getHealth: () => requestJson<HealthProbeResult>('/api/health'),

  // Member Accounts
  registerUser: (payload: {
    username: string;
    displayName: string;
    email: string;
    password: string;
  }) =>
    requestJson<{ token: string; user: UserProfile; orders: Order[] }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  loginUser: (payload: { identifier: string; password: string }) =>
    requestJson<{ token: string; user: UserProfile; orders: Order[] }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: (userToken: string) =>
    requestJson<{ user: UserProfile; orders: Order[] }>('/api/auth/me', {}, userToken),

  updateProfile: (
    userToken: string,
    payload: { displayName?: string; bio?: string; avatarHue?: number; savedPostIds?: string[] }
  ) =>
    requestJson<{ user: UserProfile }>(
      '/api/auth/profile',
      { method: 'PUT', body: JSON.stringify(payload) },
      userToken
    ),

  logoutUser: (userToken: string) =>
    requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }, userToken),

  // Engagement (Toggleable Likes, Reposts, Comments)
  incrementPostView: (id: string) =>
    requestJson<{ views: number }>(`/api/posts/${encodeURIComponent(id)}/view`, {
      method: 'POST',
    }),

  likePost: (id: string, delta: 1 | -1, userToken?: string | null) =>
    requestJson<{ likes: number; liked: boolean }>(
      `/api/posts/${encodeURIComponent(id)}/like`,
      { method: 'POST', body: JSON.stringify({ delta }) },
      userToken
    ),

  unlockPost: (id: string, password: string) =>
    requestJson<{ content: string }>(`/api/posts/${encodeURIComponent(id)}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  likeMoment: (id: string, delta: 1 | -1, userToken?: string | null) =>
    requestJson<{ likes: number; liked: boolean }>(
      `/api/moments/${encodeURIComponent(id)}/like`,
      { method: 'POST', body: JSON.stringify({ delta }) },
      userToken
    ),

  repostMoment: (id: string, delta: 1 | -1, userToken?: string | null) =>
    requestJson<{ reposts: number; reposted: boolean }>(
      `/api/moments/${encodeURIComponent(id)}/repost`,
      { method: 'POST', body: JSON.stringify({ delta }) },
      userToken
    ),

  submitComment: (
    payload: {
      targetType: 'post' | 'moment' | 'page';
      targetId: string;
      parentId?: string | null;
      author: string;
      email?: string;
      url?: string;
      content: string;
    },
    token?: string | null
  ) =>
    requestJson<{ comment: Comment; flaggedSpam: boolean }>(
      '/api/comments',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    ),

  likeComment: (id: string, delta: 1 | -1, userToken?: string | null) =>
    requestJson<{ likes: number; liked: boolean }>(
      `/api/comments/${encodeURIComponent(id)}/like`,
      { method: 'POST', body: JSON.stringify({ delta }) },
      userToken
    ),

  deleteOwnComment: (id: string, token: string) =>
    requestJson<{ ok: boolean }>(
      `/api/comments/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token
    ),

  applyFriendLink: (payload: {
    name: string;
    url: string;
    avatar?: string;
    description: string;
  }) =>
    requestJson<{ friend: FriendLink; message: string }>('/api/friends/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Storefront & Payment Pipeline
  createOrder: (
    payload: {
      items: CartItem[];
      couponCode?: string;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      shippingAddress?: string;
      note?: string;
    },
    userToken?: string | null
  ) =>
    requestJson<{ order: Order }>(
      '/api/orders',
      { method: 'POST', body: JSON.stringify(payload) },
      userToken
    ),

  payOrder: (
    orderId: string,
    payload: {
      paymentMethod: PaymentMethod;
      customerEmail: string;
      cardHolder?: string;
      cardNumber?: string;
    },
    userToken?: string | null
  ) =>
    requestJson<{ order: Order; products: ShopProduct[] }>(
      `/api/orders/${encodeURIComponent(orderId)}/pay`,
      { method: 'POST', body: JSON.stringify(payload) },
      userToken
    ),

  refundOrder: (orderId: string, customerEmail: string, token?: string | null) =>
    requestJson<{ order: Order; products: ShopProduct[] }>(
      `/api/orders/${encodeURIComponent(orderId)}/refund`,
      { method: 'POST', body: JSON.stringify({ customerEmail }) },
      token
    ),

  lookupOrder: (orderNo: string, email: string) =>
    requestJson<{ order: Order }>(
      `/api/orders/lookup?orderNo=${encodeURIComponent(orderNo)}&email=${encodeURIComponent(email)}`
    ),

  // Admin Auth
  getAdminAuthState: (token?: string | null) =>
    requestJson<AdminAuthState>('/api/admin/auth-state', {}, token),

  claimAdmin: (password: string) =>
    requestJson<{ token: string }>('/api/admin/claim', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  loginAdmin: (password: string) =>
    requestJson<{ token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  logoutAdmin: (token: string) =>
    requestJson<{ ok: boolean }>('/api/admin/logout', { method: 'POST' }, token),

  // Admin CMS
  getAdminOverview: (token: string) =>
    requestJson<AdminOverviewData>('/api/admin/overview', {}, token),

  updateAdminOrder: (
    token: string,
    orderId: string,
    payload: { status?: OrderStatus; trackingNumber?: string }
  ) =>
    requestJson<{ order: Order }>(
      `/api/admin/orders/${encodeURIComponent(orderId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
      token
    ),

  createPost: (token: string, payload: Record<string, unknown>) =>
    requestJson<{ post: Post }>(
      '/api/admin/posts',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    ),

  updatePost: (token: string, id: string, payload: Record<string, unknown>) =>
    requestJson<{ post: Post }>(
      `/api/admin/posts/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token
    ),

  deletePost: (token: string, id: string) =>
    requestJson<{ ok: boolean }>(
      `/api/admin/posts/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token
    ),

  createPage: (token: string, payload: Record<string, unknown>) =>
    requestJson<{ page: StandalonePage }>(
      '/api/admin/pages',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    ),

  deletePage: (token: string, id: string) =>
    requestJson<{ ok: boolean }>(
      `/api/admin/pages/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token
    ),

  createMoment: (token: string, payload: Record<string, unknown>) =>
    requestJson<{ moment: Moment }>(
      '/api/admin/moments',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    ),

  deleteMoment: (token: string, id: string) =>
    requestJson<{ ok: boolean }>(
      `/api/admin/moments/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token
    ),

  updateCommentStatus: (token: string, id: string, status: Comment['status']) =>
    requestJson<{ comment: Comment }>(
      `/api/admin/comments/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      token
    ),

  deleteComment: (token: string, id: string) =>
    requestJson<{ ok: boolean }>(
      `/api/admin/comments/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token
    ),

  createCategory: (token: string, payload: { name: string; slug?: string; description?: string }) =>
    requestJson<{ category: Category }>(
      '/api/admin/categories',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    ),

  deleteCategory: (token: string, id: string) =>
    requestJson<{ ok: boolean }>(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token
    ),

  updateFriendStatus: (token: string, id: string, status: 'approved' | 'pending') =>
    requestJson<{ friend: FriendLink }>(
      `/api/admin/friends/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      token
    ),

  deleteFriend: (token: string, id: string) =>
    requestJson<{ ok: boolean }>(
      `/api/admin/friends/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token
    ),

  updatePersonalStatus: (token: string, payload: Partial<PersonalStatus>) =>
    requestJson<{ personalStatus: PersonalStatus }>(
      '/api/admin/status',
      { method: 'PUT', body: JSON.stringify(payload) },
      token
    ),

  updateSiteConfig: (token: string, payload: Partial<SiteConfig>) =>
    requestJson<{ config: SiteConfig }>(
      '/api/admin/config',
      { method: 'PUT', body: JSON.stringify(payload) },
      token
    ),

  downloadExport: async (token: string) => {
    const res = await fetch('/api/admin/export', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('导出失败');
    return res.blob();
  },
};
