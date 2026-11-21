import { useMemo, useState } from 'react';
import { Check, Copy, Info, Lightbulb, AlertTriangle } from 'lucide-react';
import { parseMarkdown, type InlineToken } from '../utils/markdown';

interface MarkdownRendererProps {
  content: string;
  onOpenImage?: (src: string, alt: string) => void;
}

function InlineTokens({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((tok, idx) => {
        switch (tok.type) {
          case 'strong':
            return (
              <strong key={idx} className="font-semibold text-[var(--md-on-surface)]">
                {tok.text}
              </strong>
            );
          case 'em':
            return (
              <em key={idx} className="italic">
                {tok.text}
              </em>
            );
          case 'del':
            return (
              <del key={idx} className="line-through opacity-70">
                {tok.text}
              </del>
            );
          case 'code':
            return (
              <code
                key={idx}
                className="font-mono text-[0.875em] px-1.5 py-0.5 rounded-md bg-[var(--md-surface-container-high)] text-[var(--md-primary)]"
              >
                {tok.text}
              </code>
            );
          case 'link': {
            const isExternal = tok.href.startsWith('http');
            return (
              <a
                key={idx}
                href={tok.href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-[var(--md-primary)] underline decoration-[var(--md-primary)]/40 underline-offset-4 hover:decoration-[var(--md-primary)] transition-colors"
              >
                {tok.text}
              </a>
            );
          }
          default:
            return <span key={idx}>{tok.text}</span>;
        }
      })}
    </>
  );
}

function CodeBlock({ lang, content }: { lang: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="my-6 overflow-hidden rounded-[var(--radius-inner)] border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--md-outline-variant)] text-xs text-[var(--md-on-surface-variant)]">
        <span className="font-mono">{lang}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="复制代码"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[var(--md-primary)]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? '已复制' : '复制'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13.5px] leading-relaxed font-mono text-[var(--md-on-surface)]">
        <code>{content}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ content, onOpenImage }: MarkdownRendererProps) {
  const { blocks } = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="space-y-5 text-[15.5px] leading-[1.85] text-[var(--md-on-surface)]/92 max-w-[72ch]">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading': {
            const sizeClass =
              block.level === 1
                ? 'text-2xl sm:text-[1.75rem] font-bold mt-8 mb-3 tracking-tight'
                : block.level === 2
                  ? 'text-xl sm:text-[1.375rem] font-semibold mt-7 mb-2.5 tracking-tight'
                  : 'text-lg font-semibold mt-6 mb-2';
            const Tag = block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4';
            return (
              <Tag
                key={index}
                id={block.id}
                className={`font-display text-[var(--md-on-surface)] scroll-mt-24 [text-wrap:balance] ${sizeClass}`}
              >
                {block.text}
              </Tag>
            );
          }

          case 'paragraph':
            return (
              <p key={index} className="leading-[1.85]">
                <InlineTokens tokens={block.tokens} />
              </p>
            );

          case 'code':
            return <CodeBlock key={index} lang={block.lang} content={block.content} />;

          case 'blockquote':
            return (
              <blockquote
                key={index}
                className="my-6 px-6 py-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface-variant)] italic leading-[1.8]"
              >
                {block.lines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </blockquote>
            );

          case 'callout': {
            const toneClass =
              block.variant === 'tip'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                : block.variant === 'warning'
                  ? 'bg-[var(--md-tertiary-container)] text-[var(--md-on-tertiary-container)]'
                  : 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]';
            const Icon =
              block.variant === 'tip'
                ? Lightbulb
                : block.variant === 'warning'
                  ? AlertTriangle
                  : Info;
            return (
              <div
                key={index}
                className={`my-6 p-5 rounded-[var(--radius-inner)] ${toneClass}`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm mb-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{block.title}</span>
                </div>
                <p className="text-[14.5px] leading-[1.75] opacity-95 whitespace-pre-line">
                  {block.content}
                </p>
              </div>
            );
          }

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul';
            return (
              <ListTag
                key={index}
                className={`space-y-2 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
              >
                {block.items.map((item, idx) => (
                  <li key={idx} className="leading-[1.8]">
                    {typeof item.checked === 'boolean' ? (
                      <span className="inline-flex items-baseline gap-2">
                        <span className="font-mono text-xs text-[var(--md-primary)]">
                          {item.checked ? '[完成]' : '[待办]'}
                        </span>
                        <span className={item.checked ? 'line-through opacity-70' : ''}>
                          <InlineTokens tokens={item.tokens} />
                        </span>
                      </span>
                    ) : (
                      <InlineTokens tokens={item.tokens} />
                    )}
                  </li>
                ))}
              </ListTag>
            );
          }

          case 'table':
            return (
              <div
                key={index}
                className="my-6 overflow-x-auto rounded-[var(--radius-inner)] border border-[var(--md-outline-variant)]"
              >
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[var(--md-surface-container-low)]">
                    <tr>
                      {block.headers.map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 font-semibold text-[var(--md-on-surface)] border-b border-[var(--md-outline-variant)]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b last:border-b-0 border-[var(--md-outline-variant)]/60"
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-3 text-[var(--md-on-surface-variant)]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'image':
            return (
              <figure key={index} className="my-6">
                {onOpenImage ? (
                  <button
                    type="button"
                    onClick={() => onOpenImage(block.src, block.alt)}
                    aria-label={`在灯箱中放大查看图片：${block.alt || '文章插图'}`}
                    className="block w-full overflow-hidden rounded-[var(--radius-inner)] border border-[var(--md-outline-variant)] cursor-zoom-in group"
                  >
                    <img
                      src={block.src}
                      alt={block.alt}
                      referrerPolicy="no-referrer"
                      className="w-full object-cover max-h-[520px] transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </button>
                ) : (
                  <img
                    src={block.src}
                    alt={block.alt}
                    referrerPolicy="no-referrer"
                    className="w-full rounded-[var(--radius-inner)] object-cover max-h-[520px] border border-[var(--md-outline-variant)]"
                  />
                )}
                {block.alt && (
                  <figcaption className="mt-2 text-center text-xs text-[var(--md-on-surface-variant)]">
                    {block.alt}
                  </figcaption>
                )}
              </figure>
            );

          case 'hr':
            return <hr key={index} className="my-8 border-[var(--md-outline-variant)]" />;

          default:
            return null;
        }
      })}
    </div>
  );
}
