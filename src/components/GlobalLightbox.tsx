import { useCallback, useEffect, useState, type WheelEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { LightboxSlide } from '../types/blog';

interface GlobalLightboxProps {
  slides: LightboxSlide[];
  initialIndex: number;
  onClose: () => void;
}

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export function GlobalLightbox({ slides, initialIndex, onClose }: GlobalLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(0, initialIndex), Math.max(0, slides.length - 1))
  );
  const [zoom, setZoom] = useState(1);

  const slide = slides[currentIndex];
  const total = slides.length;

  const goPrev = useCallback(() => {
    setZoom(1);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setZoom(1);
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2))));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  useEffect(() => {
    setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, slides.length - 1)));
    setZoom(1);
  }, [initialIndex, slides]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft' && total > 1) {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight' && total > 1) {
        e.preventDefault();
        goNext();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [goNext, goPrev, onClose, resetZoom, total, zoomIn, zoomOut]);

  if (!slide) return null;

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  const handleDoubleClick = () => {
    setZoom((z) => (z > 1 ? 1 : 2));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={slide.title || '独立图片灯箱预览'}
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col text-white select-none"
      onClick={onClose}
    >
      {/* Top Action Bar */}
      <div
        className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs tabular-nums text-white/75 shrink-0">
            {currentIndex + 1} / {total}
          </span>
          {slide.title && (
            <>
              <span aria-hidden="true" className="text-white/30">
                ·
              </span>
              <span className="text-sm font-medium text-white truncate">{slide.title}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label="缩小图片"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs tabular-nums w-12 text-center text-white/85">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label="放大图片"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            aria-label="重置缩放"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <a
            href={slide.src}
            download={slide.title ? `${slide.title}.jpg` : 'kazeblog-image.jpg'}
            aria-label="下载原图"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭灯箱"
            className="ml-1 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Stage */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden p-4 sm:p-8"
        onWheel={handleWheel}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="上一张图片"
            className="absolute left-3 sm:left-6 z-10 inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={handleDoubleClick}
          className="fuwari-modal-enter max-w-full max-h-full flex items-center justify-center"
        >
          <img
            src={slide.src}
            alt={slide.title || slide.caption || '放大预览图'}
            referrerPolicy="no-referrer"
            draggable={false}
            style={{
              transform: `scale(${zoom})`,
              transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="max-h-[68vh] max-w-[88vw] object-contain rounded-xl shadow-2xl cursor-zoom-in"
          />
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="下一张图片"
            className="absolute right-3 sm:right-6 z-10 inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Caption & Filmstrip */}
      <div
        className="px-4 sm:px-6 py-4 border-t border-white/10 bg-black/55 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        {(slide.caption || slide.meta) && (
          <div className="max-w-4xl mx-auto flex flex-wrap items-baseline justify-between gap-2 text-xs sm:text-sm">
            <p className="text-white/90">{slide.caption || slide.title}</p>
            {slide.meta && (
              <span className="font-mono text-xs tabular-nums text-white/65">{slide.meta}</span>
            )}
          </div>
        )}

        {total > 1 && (
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-0.5">
            {slides.map((item, idx) => {
              const active = idx === currentIndex;
              return (
                <button
                  key={`${item.src}-${idx}`}
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setCurrentIndex(idx);
                  }}
                  aria-label={`切换到第 ${idx + 1} 张图片`}
                  className={`relative w-14 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    active
                      ? 'border-white scale-105 opacity-100'
                      : 'border-transparent opacity-50 hover:opacity-85'
                  }`}
                >
                  <img
                    src={item.src}
                    alt={item.title || `缩略图 ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
