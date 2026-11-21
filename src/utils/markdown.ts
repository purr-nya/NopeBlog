export interface TocItem {
  id: string;
  level: number;
  text: string;
}

export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'em'; text: string }
  | { type: 'del'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string };

export type MarkdownBlock =
  | { type: 'heading'; level: number; id: string; text: string }
  | { type: 'paragraph'; tokens: InlineToken[] }
  | { type: 'code'; lang: string; content: string }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'callout'; variant: 'note' | 'tip' | 'warning'; title: string; content: string }
  | { type: 'list'; ordered: boolean; items: { checked?: boolean; tokens: InlineToken[] }[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'image'; alt: string; src: string }
  | { type: 'hr' };

export function sanitizeUrl(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '#';
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed.startsWith('//') ? '#' : trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return parsed.href;
    }
    return '#';
  } catch {
    return '#';
  }
}

export function slugifyHeading(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return base ? `sec-${base}-${index}` : `sec-${index}`;
}

export function parseInlineTokens(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex =
    /(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: input.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push({ type: 'code', text: token.slice(1, -1) });
    } else if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push({ type: 'strong', text: token.slice(2, -2) });
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      tokens.push({ type: 'del', text: token.slice(2, -2) });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push({ type: 'em', text: token.slice(1, -1) });
    } else if (match[2] !== undefined && match[3] !== undefined) {
      tokens.push({
        type: 'link',
        text: match[2],
        href: sanitizeUrl(match[3]),
      });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: 'text', text: input.slice(lastIndex) });
  }
  return tokens.length > 0 ? tokens : [{ type: 'text', text: input }];
}

export function parseMarkdown(markdown: string): { blocks: MarkdownBlock[]; toc: TocItem[] } {
  const lines = (markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  const toc: TocItem[] = [];

  let i = 0;
  let headingCounter = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: 'code', lang, content: codeLines.join('\n') });
      continue;
    }

    // Fuwari callout block :::note / :::tip / :::warning
    const calloutMatch = trimmed.match(/^:::(note|tip|warning)(?:\s+(.+))?$/);
    if (calloutMatch) {
      const variant = calloutMatch[1] as 'note' | 'tip' | 'warning';
      const defaultTitles = { note: '注记', tip: '提示', warning: '注意' };
      const title = calloutMatch[2]?.trim() || defaultTitles[variant];
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') {
        bodyLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: 'callout', variant, title, content: bodyLines.join('\n').trim() });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      headingCounter++;
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = slugifyHeading(text, headingCounter);
      blocks.push({ type: 'heading', level, id, text });
      if (level <= 3) {
        toc.push({ id, level, text });
      }
      i++;
      continue;
    }

    // Standalone image
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      blocks.push({
        type: 'image',
        alt: imgMatch[1].trim() || '文章配图',
        src: sanitizeUrl(imgMatch[2]),
      });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    // Table
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(lines[i + 1].trim())
    ) {
      const parseRow = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim());

      const headers = parseRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Unordered or Ordered List
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ulMatch || olMatch) {
      const ordered = Boolean(olMatch);
      const items: { checked?: boolean; tokens: InlineToken[] }[] = [];
      while (i < lines.length) {
        const cur = lines[i].trim();
        const m = ordered ? cur.match(/^\d+\.\s+(.+)$/) : cur.match(/^[-*+]\s+(.+)$/);
        if (!m) break;
        const itemText = m[1];
        const taskMatch = itemText.match(/^\[( |x|X)\]\s+(.+)$/);
        if (taskMatch) {
          items.push({
            checked: taskMatch[1].toLowerCase() === 'x',
            tokens: parseInlineTokens(taskMatch[2]),
          });
        } else {
          items.push({ tokens: parseInlineTokens(itemText) });
        }
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph (gather consecutive plain lines)
    const paraLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith(':::') &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'paragraph', tokens: parseInlineTokens(paraLines.join(' ')) });
  }

  return { blocks, toc };
}

export function countWords(text: string): number {
  const cleaned = (text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`~\[\]()!_-]/g, ' ')
    .trim();
  if (!cleaned) return 0;
  const cjkChars = cleaned.match(/[\u4e00-\u9fff\u3040-\u30ff]/g)?.length ?? 0;
  const latinWords = cleaned
    .replace(/[\u4e00-\u9fff\u3040-\u30ff]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return cjkChars + latinWords;
}

export function estimateReadingMinutes(text: string): number {
  const words = countWords(text);
  return Math.max(1, Math.ceil(words / 280));
}
