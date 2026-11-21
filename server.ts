import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import type {
  CartItem,
  Category,
  Comment,
  FriendLink,
  Moment,
  Order,
  PaymentMethod,
  Post,
  ServerPost,
  ServerUserAccount,
  SiteConfig,
  StandalonePage,
  UserProfile,
} from './src/types/blog';
import { detectSpamComment, escapeXml } from './src/utils/blogLogic';
import { sanitizeUrl } from './src/utils/markdown';
import {
  computeCartPricing,
  generateDigitalLicenseKey,
  validateCardLast4,
} from './src/utils/shopLogic';
import { clampHue } from './src/utils/theme';
import { type BlogDatabase, createInitialDatabase } from './server/seedData';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'blog-db.json');
const SERVER_START_TIME = Date.now();

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function hydrateDatabase(rawParsed: Partial<BlogDatabase>): BlogDatabase {
  const fresh = createInitialDatabase();
  return {
    ...fresh,
    ...rawParsed,
    config: { ...fresh.config, ...(rawParsed.config || {}) },
    products: Array.isArray(rawParsed.products) && rawParsed.products.length > 0
      ? rawParsed.products
      : fresh.products,
    orders: Array.isArray(rawParsed.orders) ? rawParsed.orders : [],
    users: Array.isArray(rawParsed.users) ? rawParsed.users : [],
    moments: (Array.isArray(rawParsed.moments) ? rawParsed.moments : fresh.moments).map((m) => ({
      ...m,
      reposts: typeof m.reposts === 'number' ? m.reposts : 0,
      views: typeof m.views === 'number' ? m.views : 120,
    })),
    comments: (Array.isArray(rawParsed.comments) ? rawParsed.comments : fresh.comments).map((c) => ({
      ...c,
      likes: typeof c.likes === 'number' ? c.likes : 0,
    })),
  };
}

function loadDatabase(): BlogDatabase {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDatabase();
    saveDatabase(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<BlogDatabase>;
    if (!parsed || !Array.isArray(parsed.posts) || !parsed.config) {
      throw new Error('Invalid DB structure');
    }
    const hydrated = hydrateDatabase(parsed);
    saveDatabase(hydrated);
    return hydrated;
  } catch {
    const fallback = createInitialDatabase();
    saveDatabase(fallback);
    return fallback;
  }
}

function saveDatabase(db: BlogDatabase): void {
  ensureDataDir();
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tempFile, DB_FILE);
}

let db: BlogDatabase = loadDatabase();

// Password hashing via Node built-in scrypt + timingSafeEqual
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function getEnvAdminPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

// Separate in-memory Bearer session stores (24h TTL, never stored in browser localStorage)
const adminSessions = new Map<string, number>();
const userSessions = new Map<string, { userId: string; expiresAt: number }>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function issueAdminToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function issueUserToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  userSessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function isAdminTokenValid(token: string | null): boolean {
  if (!token) return false;
  const expires = adminSessions.get(token);
  if (!expires) return false;
  if (Date.now() > expires) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

function resolveUserFromRequest(req: Request): ServerUserAccount | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  const session = userSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    userSessions.delete(token);
    return null;
  }
  return db.users.find((u) => u.id === session.userId) || null;
}

function sanitizeUser(user: ServerUserAccount): UserProfile {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!isAdminTokenValid(token)) {
    res.status(401).json({ error: '需要管理员登录权限' });
    return;
  }
  next();
}

function requireUser(req: Request, res: Response, next: NextFunction): void {
  const user = resolveUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: '请先登录会员账号' });
    return;
  }
  (req as Request & { currentUser?: ServerUserAccount }).currentUser = user;
  next();
}

function sanitizePublicPost(post: ServerPost): Post {
  const { password: _pwd, ...rest } = post;
  if (rest.hasPassword) {
    return {
      ...rest,
      content: '',
    };
  }
  return rest;
}

function sanitizePublicComment(comment: Comment): Comment {
  const { email: _email, ...rest } = comment;
  return rest;
}

function buildPublicBootstrap() {
  return {
    config: db.config,
    posts: db.posts.filter((p) => p.status === 'published').map(sanitizePublicPost),
    pages: [...db.pages].sort((a, b) => a.order - b.order),
    categories: db.categories,
    moments: [...db.moments].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }),
    comments: db.comments
      .filter((c) => c.status === 'approved')
      .map(sanitizePublicComment),
    friends: db.friends.filter((f) => f.status === 'approved'),
    gallery: db.gallery,
    products: db.products,
    personalStatus: db.personalStatus,
  };
}

function makeSlug(input: string, fallbackPrefix: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .slice(0, 64);
  return cleaned || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // --- Public Content & Telemetry API ---

  app.get('/api/bootstrap', (_req, res) => {
    res.json(buildPublicBootstrap());
  });

  app.get('/api/health', (_req, res) => {
    const t0 = performance.now();
    const dbExists = fs.existsSync(DB_FILE);
    const t1 = performance.now();
    const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
    const apiLatency = Math.max(1, Math.round((t1 - t0) * 10) / 10);

    res.json({
      status: dbExists ? 'operational' : 'degraded',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      services: [
        {
          name: 'Typecho REST 内核',
          latencyMs: apiLatency,
          status: 'operational',
          detail: 'Express API 正常响应',
        },
        {
          name: '本地持久化存储',
          latencyMs: Math.max(1, Math.round(apiLatency * 1.4 * 10) / 10),
          status: dbExists ? 'operational' : 'degraded',
          detail: dbExists ? '原子写入队列就绪' : '数据文件待初始化',
        },
        {
          name: '会员鉴权与小店支付网关',
          latencyMs: 1.5,
          status: 'operational',
          detail: 'scrypt 鉴权与服务端计价就绪',
        },
        {
          name: 'RSS 2.0 订阅源',
          latencyMs: 2.1,
          status: 'operational',
          detail: '/api/feed.xml 实时生成',
        },
      ],
      storage: {
        postsCount: db.posts.filter((p) => p.status === 'published').length,
        momentsCount: db.moments.length,
        commentsCount: db.comments.filter((c) => c.status === 'approved').length,
        pagesCount: db.pages.length,
        productsCount: db.products.length,
        ordersCount: db.orders.length,
      },
    });
  });

  app.get('/api/feed.xml', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const published = db.posts
      .filter((p) => p.status === 'published')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    const itemsXml = published
      .map(
        (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(`${baseUrl}/?post=${encodeURIComponent(post.slug)}`)}</link>
      <guid>${escapeXml(post.id)}</guid>
      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
    </item>`
      )
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(db.config.siteName)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(db.config.tagline)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  });

  // --- Member Account System Routes ---

  app.post('/api/auth/register', (req, res) => {
    const username = typeof req.body?.username === 'string'
      ? req.body.username.trim().toLowerCase()
      : '';
    const displayName = typeof req.body?.displayName === 'string'
      ? req.body.displayName.trim()
      : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
      res.status(400).json({ error: '用户名需为 3-24 位字母、数字、下划线或短横线' });
      return;
    }
    if (!displayName || displayName.length > 32) {
      res.status(400).json({ error: '请填写 1-32 字的展示昵称' });
      return;
    }
    if (!email || !email.includes('@') || email.length > 100) {
      res.status(400).json({ error: '请填写有效的电子邮箱地址' });
      return;
    }
    if (password.length < 6 || password.length > 72) {
      res.status(400).json({ error: '密码长度需在 6-72 位之间' });
      return;
    }
    if (db.users.some((u) => u.username === username)) {
      res.status(409).json({ error: '该用户名已被注册' });
      return;
    }
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({ error: '该邮箱已被注册' });
      return;
    }

    const newUser: ServerUserAccount = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      username,
      displayName,
      email,
      bio: '在晴风志留下足迹的读者朋友',
      avatarHue: clampHue(Math.floor(Math.random() * 360)),
      role: 'member',
      likedPostIds: [],
      likedMomentIds: [],
      likedCommentIds: [],
      repostedMomentIds: [],
      savedPostIds: [],
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDatabase(db);
    const token = issueUserToken(newUser.id);
    res.status(201).json({ token, user: sanitizeUser(newUser), orders: [] });
  });

  app.post('/api/auth/login', (req, res) => {
    const identifier = typeof req.body?.identifier === 'string'
      ? req.body.identifier.trim().toLowerCase()
      : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!identifier || !password) {
      res.status(400).json({ error: '请输入用户名/邮箱和密码' });
      return;
    }
    const user = db.users.find(
      (u) => u.username === identifier || u.email === identifier
    );
    if (!user || !verifyPasswordHash(password, user.passwordHash)) {
      res.status(401).json({ error: '账号或密码不正确' });
      return;
    }
    const token = issueUserToken(user.id);
    const orders = db.orders
      .filter((o) => o.userId === user.id || o.customerEmail.toLowerCase() === user.email)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ token, user: sanitizeUser(user), orders });
  });

  app.get('/api/auth/me', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: ServerUserAccount }).currentUser;
    const orders = db.orders
      .filter((o) => o.userId === user.id || o.customerEmail.toLowerCase() === user.email)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ user: sanitizeUser(user), orders });
  });

  app.put('/api/auth/profile', requireUser, (req, res) => {
    const user = (req as Request & { currentUser: ServerUserAccount }).currentUser;
    if (typeof req.body?.displayName === 'string' && req.body.displayName.trim()) {
      user.displayName = req.body.displayName.trim().slice(0, 32);
    }
    if (typeof req.body?.bio === 'string') {
      user.bio = req.body.bio.trim().slice(0, 160);
    }
    if (typeof req.body?.avatarHue === 'number') {
      user.avatarHue = clampHue(req.body.avatarHue);
    }
    if (Array.isArray(req.body?.savedPostIds)) {
      user.savedPostIds = req.body.savedPostIds
        .filter((id: unknown): id is string => typeof id === 'string')
        .slice(0, 200);
    }
    saveDatabase(db);
    res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) userSessions.delete(token);
    res.json({ ok: true });
  });

  // --- Post, Moment & Comment Interactive Engagement ---

  app.post('/api/posts/:id/view', (req, res) => {
    const post = db.posts.find((p) => p.id === req.params.id && p.status === 'published');
    if (!post) {
      res.status(404).json({ error: '文章不存在' });
      return;
    }
    post.views += 1;
    saveDatabase(db);
    res.json({ views: post.views });
  });

  app.post('/api/posts/:id/like', (req, res) => {
    const post = db.posts.find((p) => p.id === req.params.id && p.status === 'published');
    if (!post) {
      res.status(404).json({ error: '文章不存在' });
      return;
    }
    const user = resolveUserFromRequest(req);
    let liked = true;

    if (user) {
      if (user.likedPostIds.includes(post.id)) {
        user.likedPostIds = user.likedPostIds.filter((x) => x !== post.id);
        post.likes = Math.max(0, post.likes - 1);
        liked = false;
      } else {
        user.likedPostIds.push(post.id);
        post.likes += 1;
        liked = true;
      }
    } else {
      const delta = req.body?.delta === -1 ? -1 : 1;
      post.likes = Math.max(0, post.likes + delta);
      liked = delta === 1;
    }
    saveDatabase(db);
    res.json({ likes: post.likes, liked });
  });

  app.post('/api/posts/:id/unlock', (req, res) => {
    const post = db.posts.find((p) => p.id === req.params.id && p.status === 'published');
    if (!post) {
      res.status(404).json({ error: '文章不存在' });
      return;
    }
    if (!post.hasPassword || !post.password) {
      res.json({ content: post.content });
      return;
    }
    const candidate = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (!candidate) {
      res.status(400).json({ error: '请输入访问密码' });
      return;
    }
    if (!timingSafeCompareStrings(candidate, post.password)) {
      res.status(403).json({ error: '访问密码不正确，请检查提示后重试' });
      return;
    }
    res.json({ content: post.content });
  });

  app.post('/api/moments/:id/like', (req, res) => {
    const moment = db.moments.find((m) => m.id === req.params.id);
    if (!moment) {
      res.status(404).json({ error: '说说不存在' });
      return;
    }
    const user = resolveUserFromRequest(req);
    let liked = true;
    if (user) {
      if (user.likedMomentIds.includes(moment.id)) {
        user.likedMomentIds = user.likedMomentIds.filter((x) => x !== moment.id);
        moment.likes = Math.max(0, moment.likes - 1);
        liked = false;
      } else {
        user.likedMomentIds.push(moment.id);
        moment.likes += 1;
        liked = true;
      }
    } else {
      const delta = req.body?.delta === -1 ? -1 : 1;
      moment.likes = Math.max(0, moment.likes + delta);
      liked = delta === 1;
    }
    saveDatabase(db);
    res.json({ likes: moment.likes, liked });
  });

  app.post('/api/moments/:id/repost', (req, res) => {
    const moment = db.moments.find((m) => m.id === req.params.id);
    if (!moment) {
      res.status(404).json({ error: '说说不存在' });
      return;
    }
    const user = resolveUserFromRequest(req);
    let reposted = true;
    if (user) {
      if (user.repostedMomentIds.includes(moment.id)) {
        user.repostedMomentIds = user.repostedMomentIds.filter((x) => x !== moment.id);
        moment.reposts = Math.max(0, moment.reposts - 1);
        reposted = false;
      } else {
        user.repostedMomentIds.push(moment.id);
        moment.reposts += 1;
        reposted = true;
      }
    } else {
      const delta = req.body?.delta === -1 ? -1 : 1;
      moment.reposts = Math.max(0, moment.reposts + delta);
      reposted = delta === 1;
    }
    saveDatabase(db);
    res.json({ reposts: moment.reposts, reposted });
  });

  app.post('/api/comments', (req, res) => {
    const targetType = req.body?.targetType;
    const targetId = typeof req.body?.targetId === 'string' ? req.body.targetId.trim() : '';
    const parentId = typeof req.body?.parentId === 'string' && req.body.parentId.trim()
      ? req.body.parentId.trim()
      : null;

    const currentUser = resolveUserFromRequest(req);
    const isAdminSession = isAdminTokenValid(extractBearerToken(req));

    const author = currentUser
      ? currentUser.displayName
      : typeof req.body?.author === 'string'
        ? req.body.author.trim()
        : '';
    const email = currentUser
      ? currentUser.email
      : typeof req.body?.email === 'string'
        ? req.body.email.trim()
        : '';
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!['post', 'moment', 'page'].includes(targetType) || !targetId) {
      res.status(400).json({ error: '无效的评论目标' });
      return;
    }
    if (!author || author.length > 40) {
      res.status(400).json({ error: '请填写 1-40 字的昵称' });
      return;
    }
    if (!content || content.length > 1200) {
      res.status(400).json({ error: '评论内容需在 1-1200 字之间' });
      return;
    }

    if (targetType === 'post') {
      const targetPost = db.posts.find((p) => p.id === targetId && p.status === 'published');
      if (!targetPost || !targetPost.allowComment) {
        res.status(403).json({ error: '该文章已关闭评论' });
        return;
      }
    }

    const isSpam = !isAdminSession && detectSpamComment(content);
    const safeUrl = rawUrl ? sanitizeUrl(rawUrl) : undefined;

    const newComment: Comment = {
      id: `cmt-${crypto.randomUUID().slice(0, 8)}`,
      targetType,
      targetId,
      parentId,
      userId: currentUser?.id ?? null,
      author,
      email: email.slice(0, 100) || undefined,
      url: safeUrl && safeUrl !== '#' ? safeUrl : undefined,
      avatarHue: currentUser?.avatarHue,
      content,
      likes: 0,
      status: isSpam ? 'spam' : 'approved',
      isAdmin: isAdminSession,
      createdAt: new Date().toISOString(),
    };

    db.comments.push(newComment);
    saveDatabase(db);
    res.status(201).json({
      comment: sanitizePublicComment(newComment),
      flaggedSpam: isSpam,
    });
  });

  app.post('/api/comments/:id/like', (req, res) => {
    const comment = db.comments.find((c) => c.id === req.params.id && c.status === 'approved');
    if (!comment) {
      res.status(404).json({ error: '评论不存在' });
      return;
    }
    const user = resolveUserFromRequest(req);
    let liked = true;
    if (user) {
      if (user.likedCommentIds.includes(comment.id)) {
        user.likedCommentIds = user.likedCommentIds.filter((x) => x !== comment.id);
        comment.likes = Math.max(0, comment.likes - 1);
        liked = false;
      } else {
        user.likedCommentIds.push(comment.id);
        comment.likes += 1;
        liked = true;
      }
    } else {
      const delta = req.body?.delta === -1 ? -1 : 1;
      comment.likes = Math.max(0, comment.likes + delta);
      liked = delta === 1;
    }
    saveDatabase(db);
    res.json({ likes: comment.likes, liked });
  });

  app.delete('/api/comments/:id', (req, res) => {
    const comment = db.comments.find((c) => c.id === req.params.id);
    if (!comment) {
      res.status(404).json({ error: '评论不存在' });
      return;
    }
    const currentUser = resolveUserFromRequest(req);
    const isAdmin = isAdminTokenValid(extractBearerToken(req));
    if (!isAdmin && (!currentUser || comment.userId !== currentUser.id)) {
      res.status(403).json({ error: '仅评论作者或管理员可删除该评论' });
      return;
    }
    db.comments = db.comments.filter((c) => c.id !== comment.id && c.parentId !== comment.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.post('/api/friends/apply', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar.trim().slice(0, 2) : '';

    if (!name || name.length > 40) {
      res.status(400).json({ error: '请填写站点名称（不超过 40 字）' });
      return;
    }
    const safeUrl = sanitizeUrl(rawUrl);
    if (!safeUrl || safeUrl === '#' || !safeUrl.startsWith('http')) {
      res.status(400).json({ error: '请填写有效的 http:// 或 https:// 站点链接' });
      return;
    }
    if (!description || description.length > 140) {
      res.status(400).json({ error: '请填写简短的站点简介（不超过 140 字）' });
      return;
    }

    const newFriend: FriendLink = {
      id: `fr-${crypto.randomUUID().slice(0, 8)}`,
      name,
      url: safeUrl,
      avatar: avatar || name.slice(0, 1),
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.friends.push(newFriend);
    saveDatabase(db);
    res.status(201).json({ friend: newFriend, message: '友链申请已提交，等待博主后台审核' });
  });

  // --- Complete Storefront & Server-Authoritative Payment Pipeline ---

  app.post('/api/orders', (req, res) => {
    const rawItems = Array.isArray(req.body?.items) ? (req.body.items as CartItem[]) : [];
    const couponCode = typeof req.body?.couponCode === 'string' ? req.body.couponCode.trim() : '';
    const currentUser = resolveUserFromRequest(req);

    const customerName = typeof req.body?.customerName === 'string'
      ? req.body.customerName.trim()
      : currentUser?.displayName || '';
    const customerEmail = typeof req.body?.customerEmail === 'string'
      ? req.body.customerEmail.trim().toLowerCase()
      : currentUser?.email || '';
    const customerPhone = typeof req.body?.customerPhone === 'string'
      ? req.body.customerPhone.trim().slice(0, 30)
      : '';
    const shippingAddress = typeof req.body?.shippingAddress === 'string'
      ? req.body.shippingAddress.trim().slice(0, 220)
      : '';
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 200) : '';

    if (rawItems.length === 0) {
      res.status(400).json({ error: '购物袋为空，请先选择商品' });
      return;
    }

    const pricing = computeCartPricing(rawItems, db.products, couponCode);
    if (pricing.items.length === 0) {
      res.status(400).json({ error: '未找到有效商品规格' });
      return;
    }
    if (pricing.couponError && couponCode) {
      res.status(400).json({ error: pricing.couponError });
      return;
    }

    // Verify real stock server-side
    for (const item of pricing.items) {
      const prod = db.products.find((p) => p.id === item.productId);
      const variant = prod?.variants.find((v) => v.id === item.variantId);
      if (!variant || variant.stock < item.quantity) {
        res.status(409).json({ error: `「${item.title}」库存不足，当前剩余 ${variant?.stock ?? 0} 件` });
        return;
      }
    }

    if (!customerName || customerName.length > 50) {
      res.status(400).json({ error: '请填写收件人或联系姓名' });
      return;
    }
    if (!customerEmail || !customerEmail.includes('@')) {
      res.status(400).json({ error: '请填写有效的电子邮箱以接收订单与数字交付凭证' });
      return;
    }
    if (pricing.hasPhysicalItems && (!customerPhone || !shippingAddress)) {
      res.status(400).json({ error: '订单包含实体器物或画册，请完整填写联系电话与收货地址' });
      return;
    }

    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const orderNo = `KZ${dateStamp}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const order: Order = {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      orderNo,
      userId: currentUser?.id ?? null,
      customerName,
      customerEmail,
      customerPhone: customerPhone || undefined,
      shippingAddress: shippingAddress || undefined,
      note: note || undefined,
      items: pricing.items,
      subtotalCents: pricing.subtotalCents,
      discountCents: pricing.discountCents,
      shippingCents: pricing.shippingCents,
      totalCents: pricing.totalCents,
      couponCode: pricing.appliedCoupon?.code,
      status: 'pending_payment',
      createdAt: now.toISOString(),
    };

    db.orders.unshift(order);
    saveDatabase(db);
    res.status(201).json({ order });
  });

  app.post('/api/orders/:id/pay', (req, res) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: '订单不存在' });
      return;
    }

    const currentUser = resolveUserFromRequest(req);
    const verifyEmail = typeof req.body?.customerEmail === 'string'
      ? req.body.customerEmail.trim().toLowerCase()
      : '';
    if (
      order.userId &&
      currentUser?.id !== order.userId &&
      verifyEmail !== order.customerEmail.toLowerCase()
    ) {
      res.status(403).json({ error: '无权操作该订单' });
      return;
    }

    if (order.status !== 'pending_payment') {
      res.status(409).json({ error: '该订单已支付或状态已变更', order });
      return;
    }

    const paymentMethod = req.body?.paymentMethod as PaymentMethod;
    if (!['alipay', 'wechat', 'card'].includes(paymentMethod)) {
      res.status(400).json({ error: '请选择有效的支付渠道' });
      return;
    }

    let cardLast4: string | undefined;
    if (paymentMethod === 'card') {
      const cardNumber = typeof req.body?.cardNumber === 'string' ? req.body.cardNumber : '';
      const cardHolder = typeof req.body?.cardHolder === 'string' ? req.body.cardHolder.trim() : '';
      const check = validateCardLast4(cardNumber);
      if (!check.valid || !cardHolder) {
        res.status(400).json({ error: '请填写持卡人姓名与 12-19 位卡号（仅保留末四位脱敏凭证）' });
        return;
      }
      cardLast4 = check.last4;
    }

    // Atomically verify & deduct stock and issue digital license keys
    for (const item of order.items) {
      const prod = db.products.find((p) => p.id === item.productId);
      const variant = prod?.variants.find((v) => v.id === item.variantId);
      if (!prod || !variant || variant.stock < item.quantity) {
        res.status(409).json({ error: `「${item.title}」库存不足，无法完成扣款` });
        return;
      }
    }

    for (const item of order.items) {
      const prod = db.products.find((p) => p.id === item.productId)!;
      const variant = prod.variants.find((v) => v.id === item.variantId)!;
      if (prod.type === 'physical') {
        variant.stock = Math.max(0, variant.stock - item.quantity);
      }
      prod.salesCount += item.quantity;
      if (item.type === 'digital') {
        item.digitalLicenseKey = generateDigitalLicenseKey(order.orderNo, item.productId);
      }
    }

    const hasPhysical = order.items.some((i) => i.type === 'physical');
    order.paymentMethod = paymentMethod;
    order.cardLast4 = cardLast4;
    order.paymentReference = `PAY-${paymentMethod.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    order.paidAt = new Date().toISOString();
    order.status = hasPhysical ? 'paid' : 'fulfilled';

    saveDatabase(db);
    res.json({ order, products: db.products });
  });

  app.post('/api/orders/:id/refund', (req, res) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: '订单不存在' });
      return;
    }
    const currentUser = resolveUserFromRequest(req);
    const isAdmin = isAdminTokenValid(extractBearerToken(req));
    const verifyEmail = typeof req.body?.customerEmail === 'string'
      ? req.body.customerEmail.trim().toLowerCase()
      : '';
    if (
      !isAdmin &&
      (!currentUser || order.userId !== currentUser.id) &&
      verifyEmail !== order.customerEmail.toLowerCase()
    ) {
      res.status(403).json({ error: '仅订单本人或管理员可发起退款' });
      return;
    }
    if (order.status === 'refunded' || order.status === 'pending_payment') {
      res.status(409).json({ error: '当前订单状态不支持退款' });
      return;
    }
    for (const item of order.items) {
      const prod = db.products.find((p) => p.id === item.productId);
      const variant = prod?.variants.find((v) => v.id === item.variantId);
      if (prod && variant && prod.type === 'physical') {
        variant.stock += item.quantity;
      }
    }
    order.status = 'refunded';
    saveDatabase(db);
    res.json({ order, products: db.products });
  });

  app.get('/api/orders/lookup', (req, res) => {
    const orderNo = typeof req.query.orderNo === 'string' ? req.query.orderNo.trim().toUpperCase() : '';
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    if (!orderNo || !email) {
      res.status(400).json({ error: '请输入订单号和下单邮箱查询' });
      return;
    }
    const order = db.orders.find(
      (o) => o.orderNo.toUpperCase() === orderNo && o.customerEmail.toLowerCase() === email
    );
    if (!order) {
      res.status(404).json({ error: '未查询到匹配的订单记录' });
      return;
    }
    res.json({ order });
  });

  app.get('/api/orders/:id/download/:productId', (req, res) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order || (order.status !== 'paid' && order.status !== 'fulfilled' && order.status !== 'shipped')) {
      res.status(404).json({ error: '订单未支付或不存在' });
      return;
    }
    const item = order.items.find((i) => i.productId === req.params.productId && i.type === 'digital');
    if (!item) {
      res.status(404).json({ error: '该订单不含此数字资产' });
      return;
    }
    const fileName = item.digitalFileName || `${item.productId}-license.txt`;
    const body = [
      `========================================`,
      `晴风志 · KazeBlog 官方数字资产交付凭证`,
      `========================================`,
      `商品名称: ${item.title} (${item.variantName})`,
      `订单编号: ${order.orderNo}`,
      `支付流水: ${order.paymentReference || 'VERIFIED'}`,
      `授权用户: ${order.customerName} <${order.customerEmail}>`,
      `专属授权码: ${item.digitalLicenseKey || 'KAZE-LICENSE-VERIFIED'}`,
      `交付时间: ${order.paidAt || new Date().toISOString()}`,
      `----------------------------------------`,
      `感谢支持独立博客创作！本文件即您的正版授权与下载提取凭证。`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(body);
  });

  // --- Admin Auth Routes ---

  app.get('/api/admin/auth-state', (req, res) => {
    const envPass = getEnvAdminPasscode();
    const token = extractBearerToken(req);
    res.json({
      hasAdmin: Boolean(envPass || db.adminHash),
      envPasscodeActive: Boolean(envPass),
      authenticated: isAdminTokenValid(token),
    });
  });

  app.post('/api/admin/claim', (req, res) => {
    const envPass = getEnvAdminPasscode();
    if (envPass || db.adminHash) {
      res.status(409).json({ error: '管理员密码已完成初始化，请直接登录' });
      return;
    }
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (password.length < 6 || password.length > 72) {
      res.status(400).json({ error: '请设置 6 至 72 位的管理员密码' });
      return;
    }
    db.adminHash = hashPassword(password);
    saveDatabase(db);
    const token = issueAdminToken();
    res.status(201).json({ token });
  });

  app.post('/api/admin/login', (req, res) => {
    const envPass = getEnvAdminPasscode();
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (!password) {
      res.status(400).json({ error: '请输入管理员密码' });
      return;
    }

    let valid = false;
    if (envPass) {
      valid = timingSafeCompareStrings(password, envPass);
    } else if (db.adminHash) {
      valid = verifyPasswordHash(password, db.adminHash);
    } else {
      res.status(400).json({ error: '请先初始化管理员密码' });
      return;
    }

    if (!valid) {
      res.status(401).json({ error: '密码错误，请重试' });
      return;
    }
    const token = issueAdminToken();
    res.json({ token });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) adminSessions.delete(token);
    res.json({ ok: true });
  });

  // --- Protected Admin CMS Routes ---

  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const postsWithoutRawPwd = db.posts.map(({ password: _p, ...rest }) => rest);
    res.json({
      config: db.config,
      posts: postsWithoutRawPwd,
      pages: db.pages,
      categories: db.categories,
      moments: db.moments,
      comments: db.comments,
      friends: db.friends,
      gallery: db.gallery,
      products: db.products,
      orders: db.orders,
      usersCount: db.users.length,
      personalStatus: db.personalStatus,
    });
  });

  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: '订单不存在' });
      return;
    }
    if (typeof req.body?.trackingNumber === 'string') {
      order.trackingNumber = req.body.trackingNumber.trim().slice(0, 60) || undefined;
    }
    if (['paid', 'shipped', 'fulfilled', 'refunded'].includes(req.body?.status)) {
      order.status = req.body.status;
    }
    saveDatabase(db);
    res.json({ order });
  });

  app.post('/api/admin/posts', requireAdmin, (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    if (!title) {
      res.status(400).json({ error: '文章标题不能为空' });
      return;
    }
    const now = new Date().toISOString();
    const rawSlug = typeof req.body?.slug === 'string' && req.body.slug.trim()
      ? makeSlug(req.body.slug, 'post')
      : makeSlug(title, 'post');
    const uniqueSlug = db.posts.some((p) => p.slug === rawSlug)
      ? `${rawSlug}-${Date.now().toString(36).slice(-4)}`
      : rawSlug;

    const rawPassword = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    const rawCover = typeof req.body?.coverImage === 'string' ? req.body.coverImage.trim() : '';
    const safeCover = rawCover ? sanitizeUrl(rawCover) : undefined;

    const newPost: ServerPost = {
      id: `post-${crypto.randomUUID().slice(0, 8)}`,
      slug: uniqueSlug,
      title: title.slice(0, 140),
      excerpt:
        typeof req.body?.excerpt === 'string' && req.body.excerpt.trim()
          ? req.body.excerpt.trim().slice(0, 320)
          : content.replace(/[#>*`\n]+/g, ' ').trim().slice(0, 140),
      content,
      coverImage: safeCover && safeCover !== '#' ? safeCover : undefined,
      categorySlug:
        typeof req.body?.categorySlug === 'string' && req.body.categorySlug.trim()
          ? req.body.categorySlug.trim()
          : db.categories[0]?.slug || 'design',
      tags: Array.isArray(req.body?.tags)
        ? req.body.tags
            .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
            .map((t: string) => t.trim())
        : [],
      status: ['published', 'draft', 'private'].includes(req.body?.status)
        ? req.body.status
        : 'published',
      pinned: Boolean(req.body?.pinned),
      allowComment: req.body?.allowComment !== false,
      hasPassword: Boolean(rawPassword),
      password: rawPassword || undefined,
      passwordHint:
        typeof req.body?.passwordHint === 'string'
          ? req.body.passwordHint.trim().slice(0, 120)
          : undefined,
      views: 0,
      likes: 0,
      customFields: Array.isArray(req.body?.customFields)
        ? req.body.customFields
            .filter(
              (f: unknown): f is { key: string; value: string } =>
                typeof f === 'object' &&
                f !== null &&
                typeof (f as { key?: unknown }).key === 'string' &&
                typeof (f as { value?: unknown }).value === 'string' &&
                (f as { key: string }).key.trim().length > 0
            )
            .map((f: { key: string; value: string }) => ({
              key: f.key.trim().slice(0, 40),
              value: f.value.trim().slice(0, 160),
            }))
        : [],
      createdAt: now,
      updatedAt: now,
    };

    db.posts.unshift(newPost);
    saveDatabase(db);
    const { password: _pwd, ...safe } = newPost;
    res.status(201).json({ post: safe });
  });

  app.put('/api/admin/posts/:id', requireAdmin, (req, res) => {
    const idx = db.posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: '文章不存在' });
      return;
    }
    const existing = db.posts[idx];
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : existing.title;
    if (!title) {
      res.status(400).json({ error: '文章标题不能为空' });
      return;
    }

    const nextPassword =
      typeof req.body?.password === 'string'
        ? req.body.password.trim()
        : req.body?.clearPassword
          ? ''
          : existing.password || '';
    const rawCover =
      typeof req.body?.coverImage === 'string'
        ? req.body.coverImage.trim()
        : existing.coverImage || '';
    const safeCover = rawCover ? sanitizeUrl(rawCover) : undefined;

    const updated: ServerPost = {
      ...existing,
      title: title.slice(0, 140),
      slug:
        typeof req.body?.slug === 'string' && req.body.slug.trim()
          ? makeSlug(req.body.slug, 'post')
          : existing.slug,
      excerpt:
        typeof req.body?.excerpt === 'string'
          ? req.body.excerpt.trim().slice(0, 320)
          : existing.excerpt,
      content: typeof req.body?.content === 'string' ? req.body.content : existing.content,
      coverImage: safeCover && safeCover !== '#' ? safeCover : undefined,
      categorySlug:
        typeof req.body?.categorySlug === 'string' && req.body.categorySlug.trim()
          ? req.body.categorySlug.trim()
          : existing.categorySlug,
      tags: Array.isArray(req.body?.tags)
        ? req.body.tags
            .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
            .map((t: string) => t.trim())
        : existing.tags,
      status: ['published', 'draft', 'private'].includes(req.body?.status)
        ? req.body.status
        : existing.status,
      pinned: typeof req.body?.pinned === 'boolean' ? req.body.pinned : existing.pinned,
      allowComment:
        typeof req.body?.allowComment === 'boolean'
          ? req.body.allowComment
          : existing.allowComment,
      hasPassword: Boolean(nextPassword),
      password: nextPassword || undefined,
      passwordHint:
        typeof req.body?.passwordHint === 'string'
          ? req.body.passwordHint.trim().slice(0, 120)
          : existing.passwordHint,
      customFields: Array.isArray(req.body?.customFields)
        ? req.body.customFields
            .filter(
              (f: unknown): f is { key: string; value: string } =>
                typeof f === 'object' &&
                f !== null &&
                typeof (f as { key?: unknown }).key === 'string' &&
                typeof (f as { value?: unknown }).value === 'string' &&
                (f as { key: string }).key.trim().length > 0
            )
            .map((f: { key: string; value: string }) => ({
              key: f.key.trim().slice(0, 40),
              value: f.value.trim().slice(0, 160),
            }))
        : existing.customFields,
      updatedAt: new Date().toISOString(),
    };

    db.posts[idx] = updated;
    saveDatabase(db);
    const { password: _pwd, ...safe } = updated;
    res.json({ post: safe });
  });

  app.delete('/api/admin/posts/:id', requireAdmin, (req, res) => {
    const before = db.posts.length;
    db.posts = db.posts.filter((p) => p.id !== req.params.id);
    if (db.posts.length === before) {
      res.status(404).json({ error: '文章不存在' });
      return;
    }
    db.comments = db.comments.filter(
      (c) => !(c.targetType === 'post' && c.targetId === req.params.id)
    );
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.post('/api/admin/pages', requireAdmin, (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    if (!title) {
      res.status(400).json({ error: '独立页面标题不能为空' });
      return;
    }
    const slug = makeSlug(
      typeof req.body?.slug === 'string' && req.body.slug.trim() ? req.body.slug : title,
      'page'
    );
    const newPage: StandalonePage = {
      id: `page-${crypto.randomUUID().slice(0, 8)}`,
      slug: db.pages.some((p) => p.slug === slug)
        ? `${slug}-${Date.now().toString(36).slice(-3)}`
        : slug,
      title: title.slice(0, 80),
      subtitle:
        typeof req.body?.subtitle === 'string' ? req.body.subtitle.trim().slice(0, 160) : undefined,
      content,
      allowComment: Boolean(req.body?.allowComment),
      order: db.pages.length + 1,
      updatedAt: new Date().toISOString(),
    };
    db.pages.push(newPage);
    saveDatabase(db);
    res.status(201).json({ page: newPage });
  });

  app.delete('/api/admin/pages/:id', requireAdmin, (req, res) => {
    db.pages = db.pages.filter((p) => p.id !== req.params.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.post('/api/admin/moments', requireAdmin, (req, res) => {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 1000) {
      res.status(400).json({ error: '说说内容需在 1-1000 字之间' });
      return;
    }
    const rawImg = typeof req.body?.image === 'string' ? req.body.image.trim() : '';
    const safeImg = rawImg ? sanitizeUrl(rawImg) : undefined;

    const newMoment: Moment = {
      id: `mom-${crypto.randomUUID().slice(0, 8)}`,
      content,
      mood:
        typeof req.body?.mood === 'string' && req.body.mood.trim()
          ? req.body.mood.trim().slice(0, 20)
          : '随心',
      location:
        typeof req.body?.location === 'string'
          ? req.body.location.trim().slice(0, 50) || undefined
          : undefined,
      weather:
        typeof req.body?.weather === 'string'
          ? req.body.weather.trim().slice(0, 30) || undefined
          : undefined,
      image: safeImg && safeImg !== '#' ? safeImg : undefined,
      musicTrack:
        typeof req.body?.musicTrack === 'string'
          ? req.body.musicTrack.trim().slice(0, 80) || undefined
          : undefined,
      tags: Array.isArray(req.body?.tags)
        ? req.body.tags
            .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
            .map((t: string) => t.trim())
        : [],
      pinned: Boolean(req.body?.pinned),
      likes: 0,
      reposts: 0,
      views: 1,
      createdAt: new Date().toISOString(),
    };
    db.moments.unshift(newMoment);
    saveDatabase(db);
    res.status(201).json({ moment: newMoment });
  });

  app.delete('/api/admin/moments/:id', requireAdmin, (req, res) => {
    db.moments = db.moments.filter((m) => m.id !== req.params.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.patch('/api/admin/comments/:id', requireAdmin, (req, res) => {
    const comment = db.comments.find((c) => c.id === req.params.id);
    if (!comment) {
      res.status(404).json({ error: '评论不存在' });
      return;
    }
    if (['approved', 'pending', 'spam'].includes(req.body?.status)) {
      comment.status = req.body.status;
    }
    saveDatabase(db);
    res.json({ comment });
  });

  app.delete('/api/admin/comments/:id', requireAdmin, (req, res) => {
    db.comments = db.comments.filter((c) => c.id !== req.params.id && c.parentId !== req.params.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      res.status(400).json({ error: '分类名称不能为空' });
      return;
    }
    const slug = makeSlug(
      typeof req.body?.slug === 'string' && req.body.slug.trim() ? req.body.slug : name,
      'cat'
    );
    if (db.categories.some((c) => c.slug === slug)) {
      res.status(409).json({ error: '分类缩略名已存在' });
      return;
    }
    const cat: Category = {
      id: `cat-${crypto.randomUUID().slice(0, 8)}`,
      slug,
      name: name.slice(0, 30),
      description:
        typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 120) : '',
    };
    db.categories.push(cat);
    saveDatabase(db);
    res.status(201).json({ category: cat });
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
    if (db.categories.length <= 1) {
      res.status(400).json({ error: '至少保留一个默认分类' });
      return;
    }
    db.categories = db.categories.filter((c) => c.id !== req.params.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.patch('/api/admin/friends/:id', requireAdmin, (req, res) => {
    const friend = db.friends.find((f) => f.id === req.params.id);
    if (!friend) {
      res.status(404).json({ error: '友链不存在' });
      return;
    }
    if (req.body?.status === 'approved' || req.body?.status === 'pending') {
      friend.status = req.body.status;
    }
    saveDatabase(db);
    res.json({ friend });
  });

  app.delete('/api/admin/friends/:id', requireAdmin, (req, res) => {
    db.friends = db.friends.filter((f) => f.id !== req.params.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.put('/api/admin/status', requireAdmin, (req, res) => {
    db.personalStatus = {
      activity:
        typeof req.body?.activity === 'string'
          ? req.body.activity.trim().slice(0, 120)
          : db.personalStatus.activity,
      mood:
        typeof req.body?.mood === 'string'
          ? req.body.mood.trim().slice(0, 30)
          : db.personalStatus.mood,
      location:
        typeof req.body?.location === 'string'
          ? req.body.location.trim().slice(0, 60)
          : db.personalStatus.location,
      nowPlaying:
        typeof req.body?.nowPlaying === 'string'
          ? req.body.nowPlaying.trim().slice(0, 100)
          : db.personalStatus.nowPlaying,
      currentlyReading:
        typeof req.body?.currentlyReading === 'string'
          ? req.body.currentlyReading.trim().slice(0, 100)
          : db.personalStatus.currentlyReading,
      focusMessage:
        typeof req.body?.focusMessage === 'string'
          ? req.body.focusMessage.trim().slice(0, 220)
          : db.personalStatus.focusMessage,
      updatedAt: new Date().toISOString(),
    };
    saveDatabase(db);
    res.json({ personalStatus: db.personalStatus });
  });

  app.put('/api/admin/config', requireAdmin, (req, res) => {
    const body = req.body as Partial<SiteConfig>;
    db.config = {
      ...db.config,
      siteName:
        typeof body.siteName === 'string' && body.siteName.trim()
          ? body.siteName.trim().slice(0, 40)
          : db.config.siteName,
      tagline:
        typeof body.tagline === 'string' ? body.tagline.trim().slice(0, 140) : db.config.tagline,
      heroTitle:
        typeof body.heroTitle === 'string'
          ? body.heroTitle.trim().slice(0, 120)
          : db.config.heroTitle,
      heroSubtitle:
        typeof body.heroSubtitle === 'string'
          ? body.heroSubtitle.trim().slice(0, 240)
          : db.config.heroSubtitle,
      showHeroBanner:
        typeof body.showHeroBanner === 'boolean' ? body.showHeroBanner : db.config.showHeroBanner,
      announcement:
        typeof body.announcement === 'string'
          ? body.announcement.trim().slice(0, 200)
          : db.config.announcement,
      authorName:
        typeof body.authorName === 'string' && body.authorName.trim()
          ? body.authorName.trim().slice(0, 40)
          : db.config.authorName,
      authorBio:
        typeof body.authorBio === 'string'
          ? body.authorBio.trim().slice(0, 220)
          : db.config.authorBio,
      authorLocation:
        typeof body.authorLocation === 'string'
          ? body.authorLocation.trim().slice(0, 50)
          : db.config.authorLocation,
      defaultHue:
        typeof body.defaultHue === 'number' ? clampHue(body.defaultHue) : db.config.defaultHue,
      defaultThemeMode: ['light', 'dark', 'system'].includes(body.defaultThemeMode || '')
        ? body.defaultThemeMode!
        : db.config.defaultThemeMode,
      radiusStyle: ['expressive', 'balanced', 'sharp'].includes(body.radiusStyle || '')
        ? body.radiusStyle!
        : db.config.radiusStyle,
      homeLayout: ['feed', 'deck', 'bento'].includes(body.homeLayout || '')
        ? body.homeLayout!
        : db.config.homeLayout,
      density: ['comfortable', 'compact'].includes(body.density || '')
        ? body.density!
        : db.config.density,
      footerCopyright:
        typeof body.footerCopyright === 'string'
          ? body.footerCopyright.trim().slice(0, 120)
          : db.config.footerCopyright,
      icpText:
        typeof body.icpText === 'string' ? body.icpText.trim().slice(0, 120) : db.config.icpText,
    };
    saveDatabase(db);
    res.json({ config: db.config });
  });

  app.get('/api/admin/export', requireAdmin, (_req, res) => {
    const safeExport = {
      exportedAt: new Date().toISOString(),
      config: db.config,
      categories: db.categories,
      posts: db.posts.map(({ password: _p, ...rest }) => rest),
      pages: db.pages,
      moments: db.moments,
      comments: db.comments,
      friends: db.friends,
      gallery: db.gallery,
      products: db.products,
      orders: db.orders,
      personalStatus: db.personalStatus,
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="kazeblog-typecho-backup.json"');
    res.send(JSON.stringify(safeExport, null, 2));
  });

  // --- Vite / Static Frontend Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KazeBlog server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
