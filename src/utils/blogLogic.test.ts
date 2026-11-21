import test from 'node:test';
import assert from 'node:assert/strict';
import type { Comment, Moment, Post } from '../types/blog';
import {
  buildActivityHeatmap,
  buildCommentTree,
  detectSpamComment,
  escapeXml,
  filterAndSortPosts,
  groupPostsByYear,
} from './blogLogic';

const samplePosts: Post[] = [
  {
    id: '1',
    slug: 'pinned-post',
    title: '置顶设计指南',
    excerpt: 'Material Design 3 Expressive',
    content: '正文内容',
    categorySlug: 'design',
    tags: ['M3', 'Fuwari'],
    status: 'published',
    pinned: true,
    allowComment: true,
    hasPassword: false,
    views: 100,
    likes: 12,
    customFields: [],
    createdAt: '2025-11-10T08:00:00.000Z',
    updatedAt: '2025-11-10T08:00:00.000Z',
  },
  {
    id: '2',
    slug: 'newer-post',
    title: '最新的京都雨夜',
    excerpt: '胶片散步记录',
    content: '正文内容',
    categorySlug: 'life',
    tags: ['摄影'],
    status: 'published',
    pinned: false,
    allowComment: true,
    hasPassword: false,
    views: 80,
    likes: 9,
    customFields: [],
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: '3',
    slug: 'draft-post',
    title: '未发布草稿',
    excerpt: '草稿',
    content: '草稿',
    categorySlug: 'design',
    tags: ['M3'],
    status: 'draft',
    pinned: false,
    allowComment: true,
    hasPassword: false,
    views: 0,
    likes: 0,
    customFields: [],
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
];

test('filterAndSortPosts excludes drafts by default and sorts pinned posts first', () => {
  const result = filterAndSortPosts(samplePosts);
  assert.equal(result.length, 2);
  assert.equal(result[0].slug, 'pinned-post');
  assert.equal(result[1].slug, 'newer-post');
});

test('groupPostsByYear buckets posts in descending chronological year order', () => {
  const groups = groupPostsByYear(samplePosts.slice(0, 2));
  assert.equal(groups.length, 2);
  assert.equal(groups[0].year, 2026);
  assert.equal(groups[1].year, 2025);
});

test('buildCommentTree nests child replies under their parent comment', () => {
  const comments: Comment[] = [
    {
      id: 'c1',
      targetType: 'post',
      targetId: '1',
      parentId: null,
      author: '读者甲',
      content: '写得太棒了',
      likes: 2,
      status: 'approved',
      isAdmin: false,
      createdAt: '2026-11-01T10:00:00.000Z',
    },
    {
      id: 'c2',
      targetType: 'post',
      targetId: '1',
      parentId: 'c1',
      author: '林晴风',
      content: '谢谢喜欢！',
      likes: 1,
      status: 'approved',
      isAdmin: true,
      createdAt: '2026-11-01T11:00:00.000Z',
    },
  ];
  const tree = buildCommentTree(comments);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].replies.length, 1);
  assert.equal(tree[0].replies[0].comment.author, '林晴风');
});

test('buildActivityHeatmap counts posts and moments into bounded levels', () => {
  const moments: Moment[] = [
    {
      id: 'm1',
      content: '早安咖啡',
      mood: '宁静',
      tags: ['日常'],
      likes: 3,
      reposts: 1,
      views: 42,
      createdAt: '2026-11-18T08:00:00.000Z',
    },
  ];
  const cells = buildActivityHeatmap(samplePosts, moments, new Date('2026-11-20T00:00:00.000Z'), 14);
  assert.equal(cells.length, 14);
  const hit = cells.find((c) => c.date === '2026-11-18');
  assert.ok(hit && hit.count === 1 && hit.level === 1);
});

test('detectSpamComment flags spam and escapeXml escapes XML entities', () => {
  assert.equal(detectSpamComment('Win big at online casino now!'), true);
  assert.equal(detectSpamComment('非常喜欢这篇关于 OKLCH 色彩系统的解析'), false);
  assert.equal(escapeXml('<title>&"Kaze"</title>'), '&lt;title&gt;&amp;&quot;Kaze&quot;&lt;/title&gt;');
});
