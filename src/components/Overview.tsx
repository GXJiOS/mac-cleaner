import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Code2,
  HardDrive,
  Pause,
  Puzzle,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CATEGORIES, type CategoryIcon } from '../data/categories';
import { formatBytes, formatCount } from '../lib/format';
import type { AppPhase, CategoryId, CleanItem } from '../types';

const ICONS = {
  drive: HardDrive,
  code: Code2,
  archive: Archive,
  puzzle: Puzzle,
} satisfies Record<CategoryIcon, typeof HardDrive>;

interface OverviewProps {
  phase: AppPhase;
  hasScanned: boolean;
  itemsByCategory: Record<CategoryId, CleanItem[]>;
  pendingCategories: Set<CategoryId>;
  totalSize: number;
  selectedSize: number;
  itemCount: number;
  onStartScan(): void;
  onCancelScan(): void;
  onOpenCategory(category: CategoryId): void;
}

export function Overview({
  phase,
  hasScanned,
  itemsByCategory,
  pendingCategories,
  totalSize,
  selectedSize,
  itemCount,
  onStartScan,
  onCancelScan,
  onOpenCategory,
}: OverviewProps) {
  const scanning = phase === 'scanning';
  const completedCategories = CATEGORIES.length - pendingCategories.size;
  const progress = scanning ? Math.max(8, (completedCategories / CATEGORIES.length) * 100) : 100;

  return (
    <div className="overview-view">
      <section className={`hero-panel glass-panel${scanning ? ' scanning' : ''}`}>
        <div className="hero-content">
          <div className="eyebrow"><Sparkles size={13} /> SMART CLEANUP ENGINE</div>
          <h1>
            让 Mac 保持<br />
            <em>轻盈与从容。</em>
          </h1>
          <p>
            本地扫描缓存、开发构建产物、大文件与应用残留。所有清理项目只会移入废纸篓，随时可以恢复。
          </p>
          <div className="hero-actions">
            {scanning ? (
              <button type="button" className="primary-button stop" onClick={onCancelScan}>
                <Pause size={17} fill="currentColor" /> 停止扫描
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={onStartScan} disabled={phase !== 'idle'}>
                <ScanSearch size={18} /> {hasScanned ? '重新扫描' : '开始智能扫描'}
              </button>
            )}
            <span className="safe-caption"><ShieldCheck size={15} /> 双层路径校验</span>
          </div>
        </div>

        <div className="scanner-visual" aria-label={scanning ? '正在扫描' : '扫描就绪'}>
          <span className="scan-orbit orbit-a" />
          <span className="scan-orbit orbit-b" />
          <span className="scan-orbit orbit-c" />
          <span className="scan-sweep" />
          <div className="scanner-core">
            {scanning ? <Radar size={42} /> : hasScanned ? <CheckCircle2 size={42} /> : <HardDrive size={42} />}
            <strong>{scanning ? `${Math.round(progress)}%` : hasScanned ? formatBytes(totalSize) : 'READY'}</strong>
            <small>{scanning ? '分析本地空间' : hasScanned ? '扫描发现' : '等待开始'}</small>
          </div>
          <div className="scan-progress"><i style={{ width: `${progress}%` }} /></div>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card glass-panel">
          <span>本轮发现</span>
          <strong>{hasScanned || scanning ? formatCount(itemCount) : '—'}</strong>
          <small>个可审阅项目</small>
        </article>
        <article className="metric-card glass-panel featured">
          <span>可释放空间</span>
          <strong>{hasScanned || scanning ? formatBytes(totalSize) : '—'}</strong>
          <small>扫描结果总量</small>
        </article>
        <article className="metric-card glass-panel">
          <span>已安全选中</span>
          <strong>{hasScanned || scanning ? formatBytes(selectedSize) : '—'}</strong>
          <small>谨慎项目保持未选</small>
        </article>
      </section>

      <section className="category-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SPACE MAP</span>
            <h2>空间分布</h2>
          </div>
          <p>逐项审阅后再决定清理内容</p>
        </div>

        <div className="category-grid">
          {CATEGORIES.map((category) => {
            const Icon = ICONS[category.icon];
            const items = itemsByCategory[category.id];
            const size = items.reduce((sum, item) => sum + item.size, 0);
            const pending = pendingCategories.has(category.id);
            return (
              <button
                type="button"
                className="category-card glass-panel"
                key={category.id}
                onClick={() => onOpenCategory(category.id)}
                style={{
                  '--category-accent': category.accent,
                  '--category-glow': category.glow,
                } as React.CSSProperties}
              >
                <span className="category-icon"><Icon size={22} /></span>
                <span className="category-copy">
                  <small>{category.shortLabel}</small>
                  <strong>{category.title}</strong>
                  <em>{pending ? '正在分析…' : hasScanned ? `${formatCount(items.length)} 项` : category.subtitle}</em>
                </span>
                <span className="category-size">{hasScanned || scanning ? formatBytes(size) : '—'}</span>
                <ArrowRight size={17} className="category-arrow" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
