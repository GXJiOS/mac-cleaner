import {
  AlertTriangle,
  Check,
  ExternalLink,
  FileQuestion,
  FolderOpen,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CategoryMeta } from '../data/categories';
import { compactPath, formatBytes, formatCount } from '../lib/format';
import type { CleanItem } from '../types';

const DISPLAY_LIMIT = 500;

interface ResultPanelProps {
  category: CategoryMeta;
  items: CleanItem[];
  selectedIDs: Set<string>;
  pending: boolean;
  hasScanned: boolean;
  onToggle(id: string, selected: boolean): void;
  onSelectAll(selected: boolean): void;
  onReveal(id: string): void;
}

export function ResultPanel({
  category,
  items,
  selectedIDs,
  pending,
  hasScanned,
  onToggle,
  onSelectAll,
  onReveal,
}: ResultPanelProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      `${item.name} ${item.detail} ${item.path}`.toLocaleLowerCase().includes(keyword),
    );
  }, [items, query]);
  const visible = filtered.slice(0, DISPLAY_LIMIT);
  const totalSize = items.reduce((sum, item) => sum + item.size, 0);
  const selectedCount = items.filter((item) => selectedIDs.has(item.id)).length;
  const allSelected = items.length > 0 && selectedCount === items.length;

  return (
    <div className="results-view">
      <section
        className="result-hero glass-panel"
        style={{ '--category-accent': category.accent, '--category-glow': category.glow } as React.CSSProperties}
      >
        <div>
          <span className="eyebrow">{category.shortLabel}</span>
          <h1>{category.title}</h1>
          <p>{category.subtitle}</p>
        </div>
        <div className="result-total">
          <span>{pending ? '正在扫描' : '发现空间'}</span>
          <strong>{pending ? '…' : formatBytes(totalSize)}</strong>
          <small>{formatCount(items.length)} 个项目</small>
        </div>
      </section>

      {(category.id === 'largeFiles' || category.id === 'appLeftovers') && (
        <div className="caution-banner">
          <AlertTriangle size={18} />
          <div>
            <strong>此分类需要手动判断</strong>
            <span>项目默认不勾选，请确认用途后再移入废纸篓。</span>
          </div>
        </div>
      )}

      <section className="result-list-panel glass-panel">
        <header className="result-toolbar">
          <button
            type="button"
            className={`select-all${allSelected ? ' checked' : ''}`}
            onClick={() => onSelectAll(!allSelected)}
            disabled={items.length === 0}
          >
            <span className="fake-checkbox">{allSelected && <Check size={13} />}</span>
            {allSelected ? '取消全选' : '全选本类'}
          </button>
          <span className="selected-summary">已选 {formatCount(selectedCount)} / {formatCount(items.length)}</span>
          <label className="search-box">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索名称或路径"
            />
          </label>
        </header>

        <div className="table-head">
          <span>项目</span>
          <span>安全级别</span>
          <span>占用空间</span>
          <span />
        </div>

        <div className="result-scroll">
          {pending && items.length === 0 ? (
            <div className="list-empty scanning-empty">
              <span className="large-loader" />
              <strong>正在分析 {category.title}</strong>
              <p>扫描过程完全在本机完成</p>
            </div>
          ) : !hasScanned && items.length === 0 ? (
            <div className="list-empty">
              <FileQuestion size={38} />
              <strong>还未进行扫描</strong>
              <p>返回空间概览并开始智能扫描</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="list-empty">
              <ShieldCheck size={38} />
              <strong>{query ? '没有匹配项目' : '此分类很干净'}</strong>
              <p>{query ? '尝试更换搜索关键词' : '没有发现可清理内容'}</p>
            </div>
          ) : (
            visible.map((item) => {
              const selected = selectedIDs.has(item.id);
              return (
                <div className={`result-row${selected ? ' selected' : ''}`} key={item.id}>
                  <button
                    type="button"
                    className={`row-checkbox${selected ? ' checked' : ''}`}
                    aria-label={`${selected ? '取消选择' : '选择'} ${item.name}`}
                    onClick={() => onToggle(item.id, !selected)}
                  >
                    {selected && <Check size={13} />}
                  </button>
                  <div className="item-icon"><FolderOpen size={17} /></div>
                  <div className="item-copy">
                    <strong title={item.name}>{item.name}</strong>
                    <span title={item.path}>{item.detail} · {compactPath(item.path)}</span>
                  </div>
                  <span className={`safety-pill ${item.safety}`}>
                    {item.safety === 'safe' ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
                    {item.safety === 'safe' ? '安全' : '谨慎'}
                  </span>
                  <strong className="item-size">{formatBytes(item.size)}</strong>
                  <button
                    type="button"
                    className="reveal-button"
                    onClick={() => onReveal(item.id)}
                    aria-label={`在 Finder 中显示 ${item.name}`}
                    title="在 Finder 中显示"
                  >
                    <ExternalLink size={15} />
                  </button>
                </div>
              );
            })
          )}
        </div>
        {filtered.length > DISPLAY_LIMIT && (
          <footer className="result-limit-note">
            当前显示前 {formatCount(DISPLAY_LIMIT)} 项；使用搜索可定位其余项目，全选仍会覆盖完整分类。
          </footer>
        )}
      </section>
    </div>
  );
}
