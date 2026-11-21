import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  MapPin,
  Music,
  RefreshCw,
  Server,
} from 'lucide-react';
import type { HealthProbeResult, Moment, PersonalStatus, Post } from '../types/blog';
import { blogApi } from '../services/api';
import {
  buildActivityHeatmap,
  computeCorpusWordCount,
  formatRelativeTime,
} from '../utils/blogLogic';

interface StatusViewProps {
  personalStatus: PersonalStatus;
  posts: Post[];
  moments: Moment[];
  commentsCount: number;
  pagesCount: number;
}

export function StatusView({
  personalStatus,
  posts,
  moments,
  commentsCount,
  pagesCount,
}: StatusViewProps) {
  const [health, setHealth] = useState<HealthProbeResult | null>(null);
  const [probing, setProbing] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);

  const runHealthProbe = async () => {
    setProbing(true);
    setProbeError(null);
    try {
      const data = await blogApi.getHealth();
      setHealth(data);
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : '服务探针请求失败');
    } finally {
      setProbing(false);
    }
  };

  useEffect(() => {
    void runHealthProbe();
  }, []);

  const heatmap = useMemo(
    () => buildActivityHeatmap(posts, moments, new Date(), 196),
    [posts, moments]
  );

  const totalWords = useMemo(() => computeCorpusWordCount(posts, moments), [posts, moments]);

  const heatmapTone = (level: 0 | 1 | 2 | 3 | 4) => {
    switch (level) {
      case 0:
        return 'bg-[var(--md-surface-container)]';
      case 1:
        return 'bg-[var(--md-primary-container)]';
      case 2:
        return 'bg-[var(--md-primary)]/55';
      case 3:
        return 'bg-[var(--md-primary)]/80';
      case 4:
        return 'bg-[var(--md-primary)]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Personal Real-Time Status Card */}
      <section className="m3-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--md-on-surface)]">
              博主实时状态与站点看板
            </h1>
            <p className="mt-2 text-sm text-[var(--md-on-surface-variant)]">
              同步更新此刻正在做的事、循环曲目、阅读书单，以及站点核心服务的实时运行指标。
            </p>
          </div>
          <div className="text-xs text-[var(--md-on-surface-variant)] tabular-nums">
            状态更新于 {formatRelativeTime(personalStatus.updatedAt)}
          </div>
        </div>

        {/* Highlight Personal Activity Banner */}
        <div className="p-6 rounded-[var(--radius-inner)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]">
          <div className="text-xs font-medium opacity-85">
            当前心境 · {personalStatus.mood}
          </div>
          <div className="mt-2 font-display text-xl sm:text-2xl font-bold leading-snug">
            {personalStatus.activity}
          </div>
          <p className="mt-2.5 text-sm opacity-90 leading-relaxed">
            {personalStatus.focusMessage}
          </p>
        </div>

        {/* Three Contextual Life Telemetry Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)]">
            <div className="flex items-center gap-2 text-xs text-[var(--md-on-surface-variant)]">
              <MapPin className="w-4 h-4 text-[var(--md-primary)]" />
              <span>所在位置</span>
            </div>
            <div className="mt-2 font-medium text-sm text-[var(--md-on-surface)]">
              {personalStatus.location}
            </div>
          </div>

          <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)]">
            <div className="flex items-center gap-2 text-xs text-[var(--md-on-surface-variant)]">
              <Music className="w-4 h-4 text-[var(--md-primary)]" />
              <span>正在循环</span>
            </div>
            <div className="mt-2 font-medium text-sm text-[var(--md-on-surface)]">
              {personalStatus.nowPlaying}
            </div>
          </div>

          <div className="p-4 rounded-[var(--radius-inner)] bg-[var(--md-surface-container-low)]">
            <div className="flex items-center gap-2 text-xs text-[var(--md-on-surface-variant)]">
              <BookOpen className="w-4 h-4 text-[var(--md-primary)]" />
              <span>案头在读</span>
            </div>
            <div className="mt-2 font-medium text-sm text-[var(--md-on-surface)]">
              {personalStatus.currentlyReading}
            </div>
          </div>
        </div>
      </section>

      {/* Corpus Statistics Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '已发布长文', value: `${posts.length} 篇` },
          { label: '说说碎片', value: `${moments.length} 条` },
          { label: '累计写作字数', value: `${totalWords.toLocaleString()} 字` },
          { label: '互动留言 / 独立页', value: `${commentsCount} / ${pagesCount}` },
        ].map((metric) => (
          <div key={metric.label} className="m3-card p-5">
            <div className="text-xs text-[var(--md-on-surface-variant)]">{metric.label}</div>
            <div className="mt-2 font-display text-2xl font-bold tabular-nums text-[var(--md-on-surface)]">
              {metric.value}
            </div>
          </div>
        ))}
      </section>

      {/* 28-Week Writing Activity Heatmap */}
      <section className="m3-card p-6 sm:p-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--md-primary)]" />
            <span>近 28 周创作热力图</span>
          </h2>
          <div className="text-xs text-[var(--md-on-surface-variant)]">
            统计维度：已发布文章与说说活跃度
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div
            role="img"
            aria-label="近 28 周文章与说说创作活跃热力图"
            className="grid grid-flow-col grid-rows-7 gap-1.5 w-full min-w-[620px]"
          >
            {heatmap.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date} · 活跃度 ${cell.count}`}
                className={`aspect-square w-full max-w-[20px] rounded-[4px] transition-colors ${heatmapTone(cell.level)}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 text-xs text-[var(--md-on-surface-variant)]">
          <span>少</span>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <span
              key={lvl}
              className={`inline-block w-3.5 h-3.5 rounded-[3px] ${heatmapTone(
                lvl as 0 | 1 | 2 | 3 | 4
              )}`}
            />
          ))}
          <span>多</span>
        </div>
      </section>

      {/* Live Service Telemetry Probe */}
      <section className="m3-card p-6 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--md-on-surface)] flex items-center gap-2">
              <Server className="w-5 h-5 text-[var(--md-primary)]" />
              <span>服务健康探针</span>
            </h2>
            {health && (
              <p className="mt-1 text-xs text-[var(--md-on-surface-variant)] tabular-nums">
                后端持续运行 {health.uptimeSeconds} 秒 · 最近检测 {formatRelativeTime(health.timestamp)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={runHealthProbe}
            disabled={probing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-[var(--radius-control)] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`} />
            <span>{probing ? '探测中...' : '重新探测'}</span>
          </button>
        </div>

        {probeError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {probeError}
          </p>
        )}

        {health ? (
          <div className="divide-y divide-[var(--md-outline-variant)]/70">
            {health.services.map((svc) => (
              <div
                key={svc.name}
                className="py-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-semibold text-[var(--md-on-surface)]">
                    {svc.name}
                  </div>
                  <div className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                    {svc.detail}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="font-mono tabular-nums text-[var(--md-on-surface-variant)]">
                    {svc.latencyMs} ms
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{svc.status === 'operational' ? '正常在线' : '降级运行'}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-sm text-[var(--md-on-surface-variant)]">
            正在向服务端发起健康检测...
          </div>
        )}
      </section>
    </div>
  );
}
