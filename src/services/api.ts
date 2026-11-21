import type {
  AdminAuthState,
  BlogBootstrapData,
  Category,
  Comment,
  FriendLink,
  HealthProbeResult,
  Moment,
  PersonalStatus,
  Post,
  SiteConfig,
  StandalonePage,
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

export const blogApi = {
  getBootstrap: () => requestJson<BlogBootstrapData>('/api/bootstrap'),
  getHealth: () => requestJson<HealthProbeResult>('/api/health'),

  incrementPostView: (id: string) =>
    requestJson<{ views: number }>(`/api/posts/${encodeURIComponent(id)}/view`, {
      method: 'POST',
    }),

  likePost: (id: string) =>
    requestJson<{ likes: number }>(`/api/posts/${encodeURIComponent(id)}/like`, {
      method: 'POST',
    }),

  unlockPost: (id: string, password: string) =>
    requestJson<{ content: string }>(`/api/posts/${encodeURIComponent(id)}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  likeMoment: (id: string) =>
    requestJson<{ likes: number }>(`/api/moments/${encodeURIComponent(id)}/like`, {
      method: 'POST',
    }),

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
    adminToken?: string | null
  ) =>
    requestJson<{ comment: Comment; flaggedSpam: boolean }>(
      '/api/comments',
      { method: 'POST', body: JSON.stringify(payload) },
      adminToken
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

  // Admin CRUD
  getAdminOverview: (token: string) =>
    requestJson<BlogBootstrapData>('/api/admin/overview', {}, token),

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

  updatePage: (token: string, id: string, payload: Record<string, unknown>) =>
    requestJson<{ page: StandalonePage }>(
      `/api/admin/pages/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
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
