import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LoaderCircle, Play, ShieldAlert, Sparkles, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Overview } from './components/Overview';
import { ResultPanel } from './components/ResultPanel';
import { Sidebar } from './components/Sidebar';
import { CATEGORIES, CATEGORY_MAP } from './data/categories';
import { bridge } from './lib/bridge';
import { formatBytes } from './lib/format';
import type {
  AppPhase,
  CategoryId,
  CleanItem,
  CleanResult,
  RuntimeInfo,
  ScanEvent,
} from './types';

type ItemGroups = Record<CategoryId, CleanItem[]>;
type Toast = { kind: 'success' | 'warning' | 'error'; message: string };
const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

const emptyGroups = (): ItemGroups => ({
  userCache: [],
  devJunk: [],
  largeFiles: [],
  appLeftovers: [],
});

const labelForView = (view: 'overview' | CategoryId) =>
  view === 'overview' ? '空间概览' : CATEGORY_MAP[view].title;

export default function App() {
  const [activeView, setActiveView] = useState<'overview' | CategoryId>('overview');
  const [groups, setGroups] = useState<ItemGroups>(emptyGroups);
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [pendingCategories, setPendingCategories] = useState<Set<CategoryId>>(new Set());
  const [hasScanned, setHasScanned] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    void bridge.getRuntime().then(setRuntime);
    return bridge.onScanEvent((event: ScanEvent) => {
      if (event.type === 'category') {
        setGroups((current) => ({ ...current, [event.category.id]: event.items }));
        setSelectedIDs((current) => {
          const next = new Set(current);
          for (const item of event.items) {
            if (item.safety === 'safe') next.add(item.id);
          }
          return next;
        });
        setPendingCategories((current) => {
          const next = new Set(current);
          next.delete(event.category.id);
          return next;
        });
        return;
      }

      if (event.type === 'complete') {
        setPhase('idle');
        setPendingCategories(new Set());
        return;
      }

      if (event.type === 'cancelled') {
        setPhase('idle');
        setPendingCategories(new Set());
        setToast({ kind: 'warning', message: '扫描已取消，已保留当前结果。' });
        return;
      }

      if (event.type === 'error') {
        setPhase('idle');
        setPendingCategories(new Set());
        setToast({ kind: 'error', message: event.message });
      }
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const allItems = useMemo(() => CATEGORY_IDS.flatMap((id) => groups[id]), [groups]);
  const selectedItems = useMemo(
    () => allItems.filter((item) => selectedIDs.has(item.id)),
    [allItems, selectedIDs],
  );
  const totalSize = useMemo(() => allItems.reduce((sum, item) => sum + item.size, 0), [allItems]);
  const selectedSize = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.size, 0),
    [selectedItems],
  );
  const cautionCount = useMemo(
    () => selectedItems.filter((item) => item.safety === 'caution').length,
    [selectedItems],
  );

  const startScan = async () => {
    setToast(null);
    setGroups(emptyGroups());
    setSelectedIDs(new Set());
    setPendingCategories(new Set(CATEGORY_IDS));
    setHasScanned(true);
    setPhase('scanning');

    try {
      await bridge.startScan();
    } catch (error) {
      setPhase('idle');
      setPendingCategories(new Set());
      setToast({
        kind: 'error',
        message: error instanceof Error ? error.message : '扫描启动失败。',
      });
    }
  };

  const cancelScan = async () => {
    try {
      await bridge.cancelScan();
    } catch (error) {
      setToast({
        kind: 'error',
        message: error instanceof Error ? error.message : '无法取消扫描。',
      });
    }
  };

  const setItemSelected = (id: string, selected: boolean) => {
    if (phase !== 'idle') return;
    setSelectedIDs((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const setCategorySelected = (category: CategoryId, selected: boolean) => {
    if (phase !== 'idle') return;
    setSelectedIDs((current) => {
      const next = new Set(current);
      for (const item of groups[category]) {
        if (selected) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const cleanSelected = async () => {
    setConfirmOpen(false);
    setPhase('cleaning');
    setToast(null);

    try {
      const result: CleanResult = await bridge.cleanSelected([...selectedIDs]);
      const cleaned = new Set(result.cleanedIDs);
      setGroups((current) =>
        Object.fromEntries(
          CATEGORY_IDS.map((category) => [
            category,
            current[category].filter((item) => !cleaned.has(item.id)),
          ]),
        ) as ItemGroups,
      );
      setSelectedIDs((current) => {
        const next = new Set(current);
        for (const id of cleaned) next.delete(id);
        return next;
      });

      if (result.failures.length > 0) {
        setToast({
          kind: 'warning',
          message: `已移至废纸篓 ${result.cleanedIDs.length} 项，${result.failures.length} 项未能处理。`,
        });
      } else {
        setToast({
          kind: 'success',
          message: `已将 ${result.cleanedIDs.length} 项（${formatBytes(result.cleanedSize)}）移至废纸篓。`,
        });
      }
    } catch (error) {
      setToast({
        kind: 'error',
        message: error instanceof Error ? error.message : '清理失败。',
      });
    } finally {
      setPhase('idle');
    }
  };

  const isBusy = phase !== 'idle';

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <Sidebar
        activeView={activeView}
        itemsByCategory={groups}
        pendingCategories={pendingCategories}
        hasScanned={hasScanned}
        runtime={runtime}
        onNavigate={setActiveView}
        onOpenPermissions={() => void bridge.openFullDiskAccess()}
      />

      <main className="main-stage">
        <header className="topbar">
          <div>
            <div className="eyebrow">MAC CLEANER / {runtime?.platform === 'browser' ? '预览模式' : '本机模式'}</div>
            <h1>{labelForView(activeView)}</h1>
          </div>
          <div className="topbar-actions">
            {phase === 'scanning' ? (
              <button className="button button-secondary" onClick={() => void cancelScan()}>
                <X size={16} /> 取消扫描
              </button>
            ) : (
              <button className="button button-secondary" disabled={phase === 'cleaning'} onClick={() => void startScan()}>
                <Play size={16} fill="currentColor" /> {hasScanned ? '重新扫描' : '开始扫描'}
              </button>
            )}
            <button
              className="button button-primary"
              disabled={isBusy || selectedItems.length === 0}
              onClick={() => setConfirmOpen(true)}
            >
              {phase === 'cleaning' ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}
              清理 {selectedItems.length > 0 ? formatBytes(selectedSize) : ''}
            </button>
          </div>
        </header>

        <section className="content-scroll">
          {activeView === 'overview' ? (
            <Overview
              itemsByCategory={groups}
              hasScanned={hasScanned}
              pendingCategories={pendingCategories}
              phase={phase}
              totalSize={totalSize}
              selectedSize={selectedSize}
              itemCount={allItems.length}
              onOpenCategory={setActiveView}
              onStartScan={() => void startScan()}
              onCancelScan={() => void cancelScan()}
            />
          ) : (
            <ResultPanel
              category={CATEGORY_MAP[activeView]}
              items={groups[activeView]}
              selectedIDs={selectedIDs}
              pending={pendingCategories.has(activeView)}
              hasScanned={hasScanned}
              onToggle={setItemSelected}
              onSelectAll={(selected) => setCategorySelected(activeView, selected)}
              onReveal={(id) => void bridge.revealItem(id)}
            />
          )}
        </section>

        <footer className="statusbar">
          <span className={`status-dot ${phase}`} />
          <span>
            {phase === 'scanning'
              ? `正在扫描，剩余 ${pendingCategories.size} 类`
              : phase === 'cleaning'
                ? '正在移至废纸篓…'
                : hasScanned
                  ? `发现 ${allItems.length} 项，可释放 ${formatBytes(totalSize)}`
                  : '准备就绪'}
          </span>
          <span className="status-spacer" />
          <ShieldAlert size={13} /> 所有清理项均进入废纸篓
        </footer>
      </main>

      {toast && (
        <div className={`toast ${toast.kind}`} role="status">
          {toast.kind === 'success' ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
          <span>{toast.message}</span>
          <button aria-label="关闭提示" onClick={() => setToast(null)}><X size={15} /></button>
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          itemCount={selectedItems.length}
          selectedSize={selectedSize}
          cautionCount={cautionCount}
          cleaning={phase === 'cleaning'}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void cleanSelected()}
        />
      )}
    </div>
  );
}
