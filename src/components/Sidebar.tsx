import {
  Archive,
  Code2,
  Database,
  FolderSearch2,
  Gauge,
  HardDrive,
  Puzzle,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { CATEGORIES, type CategoryIcon } from '../data/categories';
import { formatBytes } from '../lib/format';
import type { CategoryId, CleanItem, RuntimeInfo } from '../types';

const ICONS = {
  drive: HardDrive,
  code: Code2,
  archive: Archive,
  puzzle: Puzzle,
} satisfies Record<CategoryIcon, typeof HardDrive>;

interface SidebarProps {
  activeView: 'overview' | CategoryId;
  itemsByCategory: Record<CategoryId, CleanItem[]>;
  pendingCategories: Set<CategoryId>;
  hasScanned: boolean;
  runtime: RuntimeInfo | null;
  onNavigate(view: 'overview' | CategoryId): void;
  onOpenPermissions(): void;
}

export function Sidebar({
  activeView,
  itemsByCategory,
  pendingCategories,
  hasScanned,
  runtime,
  onNavigate,
  onOpenPermissions,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="window-drag-region" />
      <div className="brand">
        <div className="brand-mark">
          <ShieldCheck size={22} strokeWidth={1.8} />
        </div>
        <div>
          <strong>MACCLEANER</strong>
          <span>LOCAL CARE</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="清理导航">
        <span className="nav-label">工作台</span>
        <button
          type="button"
          className={`nav-button${activeView === 'overview' ? ' active' : ''}`}
          onClick={() => onNavigate('overview')}
        >
          <span className="nav-icon"><Gauge size={18} /></span>
          <span className="nav-copy">
            <strong>空间概览</strong>
            <small>总览与快速扫描</small>
          </span>
        </button>

        <span className="nav-label category-label">扫描分类</span>
        {CATEGORIES.map((category) => {
          const Icon = ICONS[category.icon];
          const total = itemsByCategory[category.id].reduce((sum, item) => sum + item.size, 0);
          const pending = pendingCategories.has(category.id);
          return (
            <button
              type="button"
              className={`nav-button category-nav${activeView === category.id ? ' active' : ''}`}
              onClick={() => onNavigate(category.id)}
              key={category.id}
              style={{ '--nav-accent': category.accent } as React.CSSProperties}
            >
              <span className="nav-icon"><Icon size={17} /></span>
              <span className="nav-copy">
                <strong>{category.title}</strong>
                <small>
                  {pending ? '扫描中…' : hasScanned ? formatBytes(total) : category.shortLabel}
                </small>
              </span>
              {pending && <span className="mini-loader" />}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />
      <section className="privacy-card">
        <div className="privacy-icon"><Database size={17} /></div>
        <div>
          <strong>数据留在本机</strong>
          <p>扫描和清理均由本地 Swift 核心执行。</p>
        </div>
      </section>
      <button type="button" className="permission-link" onClick={onOpenPermissions}>
        <FolderSearch2 size={17} />
        <span>完全磁盘访问</span>
        <Settings2 size={14} className="permission-arrow" />
      </button>
      <div className="sidebar-version">
        MacCleaner {runtime?.version ?? '1.1.0'}
      </div>
    </aside>
  );
}
