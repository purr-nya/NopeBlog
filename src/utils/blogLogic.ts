import type { Comment, Moment, Post } from '../types/blog';
import { countWords } from './markdown';

export interface PostFilterOptions {
  categorySlug?: string | null;
  tag?: string | null;
  query?: string;
  includeUnpublished?: boolean;
}

export function filterAndSortPosts(posts: Post[], options: PostFilterOptions = {}): Post[] {
  const q = (options.query || '').trim().toLowerCase();
  return posts
    .filter((p) => {
      if (!options.includeUnpublished && p.status !== 'published') return false;
      if (options.categorySlug && p.categorySlug !== options.categorySlug) return false;
      if (options.tag && !p.tags.includes(options.tag)) return false;
      if (q) {
        const haystack = `${p.title} ${p.excerpt} ${p.tags.join(' ')} ${p.slug}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export interface ArchiveYearGroup {
  year: number;
  posts: Post[];
}

export function groupPostsByYear(posts: Post[]): ArchiveYearGroup[] {
  const map = new Map<number, Post[]>();
  const sorted = [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  for (const post of sorted) {
    const year = new Date(post.createdAt).getFullYear();
    const list = map.get(year) ?? [];
    list.push(post);
    map.set(year, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, groupPosts]) => ({ year, posts: groupPosts }));
}

export function extractTagCounts(posts: Post[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (post.status !== 'published') continue;
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

export interface HeatmapCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export function buildActivityHeatmap(
  posts: Post[],
  moments: Moment[],
  referenceDate: Date = new Date(),
  days = 112
): HeatmapCell[] {
  const dateCounts = new Map<string, number>();
  const addDate = (iso: string, weight: number) => {
    const key = iso.slice(0, 10);
    dateCounts.set(key, (dateCounts.get(key) ?? 0) + weight);
  };

  for (const post of posts) {
    addDate(post.createdAt, 2);
  }
  for (const moment of moments) {
    addDate(moment.createdAt, 1);
  }

  const cells: HeatmapCell[] = [];
  const base = new Date(referenceDate);
  base.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset--) {
    const d = new Date(base);
    d.setDate(base.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    const count = dateCounts.get(key) ?? 0;
    const level: 0 | 1 | 2 | 3 | 4 =
      count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
    cells.push({ date: key, count, level });
  }
  return cells;
}

export function computeCorpusWordCount(posts: Post[], moments: Moment[]): number {
  const postWords = posts.reduce((sum, p) => sum + countWords(p.content || p.excerpt), 0);
  const momentWords = moments.reduce((sum, m) => sum + countWords(m.content), 0);
  return postWords + momentWords;
}

export interface CommentThreadNode {
  comment: Comment;
  replies: CommentThreadNode[];
}

export function buildCommentTree(comments: Comment[]): CommentThreadNode[] {
  const map = new Map<string, CommentThreadNode>();
  const roots: CommentThreadNode[] = [];
  const sorted = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const comment of sorted) {
    map.set(comment.id, { comment, replies: [] });
  }

  for (const comment of sorted) {
    const node = map.get(comment.id)!;
    if (comment.parentId && map.has(comment.parentId)) {
      map.get(comment.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

const SPAM_PATTERNS = [/casino/i, /viagra/i, /crypto\s*airdrop/i, /http:\/\/.*http:\/\/.*http:\/\//i];

export function detectSpamComment(content: string): boolean {
  return SPAM_PATTERNS.some((pattern) => pattern.test(content));
}

export function escapeXml(raw: string): string {
  return (raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatShortDate(iso);
}
