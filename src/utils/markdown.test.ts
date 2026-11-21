import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countWords,
  estimateReadingMinutes,
  parseInlineTokens,
  parseMarkdown,
  sanitizeUrl,
} from './markdown';

test('sanitizeUrl allows safe protocols and blocks javascript/data XSS payloads', () => {
  assert.equal(sanitizeUrl('https://example.com/post'), 'https://example.com/post');
  assert.equal(sanitizeUrl('/archives'), '/archives');
  assert.equal(sanitizeUrl('javascript:alert(1)'), '#');
  assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '#');
  assert.equal(sanitizeUrl('//evil.example.com'), '#');
});

test('parseMarkdown extracts headings into TOC, code blocks, callouts, and tables', () => {
  const md = [
    '# 主标题',
    '',
    '一段带有 **加粗** 和 `inline` 以及 [安全链接](https://fuwari.vercel.app) 的正文。',
    '',
    ':::tip 设计灵感',
    '使用 OKLCH 色彩空间保持人眼感知亮度一致。',
    ':::',
    '',
    '## 代码示例',
    '```ts',
    'const hue = 250;',
    '```',
    '',
    '| 属性 | 说明 |',
    '| --- | --- |',
    '| Hue | 动态色相 |',
  ].join('\n');

  const { blocks, toc } = parseMarkdown(md);
  assert.equal(toc.length, 2);
  assert.equal(toc[0].text, '主标题');
  assert.equal(toc[1].level, 2);
  assert.equal(blocks.some((b) => b.type === 'callout' && b.variant === 'tip'), true);
  assert.equal(blocks.some((b) => b.type === 'code' && b.lang === 'ts'), true);
  assert.equal(blocks.some((b) => b.type === 'table' && b.rows.length === 1), true);
});

test('parseInlineTokens strips dangerous link protocols inside markdown links', () => {
  const tokens = parseInlineTokens('点击 [恶意链接](javascript:alert(1))');
  const link = tokens.find((t) => t.type === 'link');
  assert.ok(link && link.type === 'link');
  assert.equal(link.href, '#');
});

test('countWords and estimateReadingMinutes handle mixed CJK and English prose', () => {
  const words = countWords('晴风志是一个基于 Material Design 3 的博客系统');
  assert.ok(words >= 15);
  assert.equal(estimateReadingMinutes('短文测试'), 1);
});
