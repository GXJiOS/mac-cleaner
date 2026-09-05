import type {
  CategoryId,
  CleanItem,
  MacCleanerBridge,
  ScanEvent,
} from '../types';

const DEMO_ITEMS: Record<CategoryId, CleanItem[]> = {
  userCache: [
    {
      id: '/Users/demo/Library/Caches/com.example.design',
      path: '/Users/demo/Library/Caches/com.example.design',
      name: 'com.example.design',
      detail: '用户缓存，删除后应用会自动重建',
      size: 1_840_000_000,
      category: 'userCache',
      safety: 'safe',
    },
    {
      id: '/Users/demo/Library/Logs/DiagnosticReports',
      path: '/Users/demo/Library/Logs/DiagnosticReports',
      name: 'DiagnosticReports',
      detail: '应用诊断日志',
      size: 348_000_000,
      category: 'userCache',
      safety: 'safe',
    },
  ],
  devJunk: [
    {
      id: '/Users/demo/Library/Developer/Xcode/DerivedData/App-codex',
      path: '/Users/demo/Library/Developer/Xcode/DerivedData/App-codex',
      name: 'App-codex',
      detail: 'Xcode 构建产物，可随时重新生成',
      size: 4_620_000_000,
      category: 'devJunk',
      safety: 'safe',
    },
    {
      id: '/Users/demo/.gradle/caches',
      path: '/Users/demo/.gradle/caches',
      name: 'Gradle 缓存',
      detail: '删除后 Android 构建需重新下载依赖',
      size: 2_140_000_000,
      category: 'devJunk',
      safety: 'caution',
    },
  ],
  largeFiles: [
    {
      id: '/Users/demo/Downloads/archive-2024.zip',
      path: '/Users/demo/Downloads/archive-2024.zip',
      name: 'archive-2024.zip',
      detail: '上次访问 2024/10/12 · ~/Downloads',
      size: 3_280_000_000,
      category: 'largeFiles',
      safety: 'caution',
    },
  ],
  appLeftovers: [
    {
      id: '/Users/demo/Library/Application Support/com.acme.oldapp',
      path: '/Users/demo/Library/Application Support/com.acme.oldapp',
      name: 'com.acme.oldapp',
      detail: '应用数据 · 未找到对应的应用',
      size: 426_000_000,
      category: 'appLeftovers',
      safety: 'caution',
    },
  ],
};

function createBrowserBridge(): MacCleanerBridge {
  const listeners = new Set<(event: ScanEvent) => void>();
  let timers: number[] = [];
  const emit = (event: ScanEvent) => listeners.forEach((listener) => listener(event));

  return {
    getRuntime: async () => ({
      platform: 'browser',
      version: 'web-preview',
      helperReady: true,
    }),
    startScan: async () => {
      timers.forEach(window.clearTimeout);
      timers = (Object.keys(DEMO_ITEMS) as CategoryId[]).map((categoryId, index) =>
        window.setTimeout(() => {
          const titles: Record<CategoryId, [string, string]> = {
            userCache: ['系统垃圾', '用户缓存、应用日志和临时文件'],
            devJunk: ['开发者垃圾', 'Xcode 构建产物、模拟器和包管理器缓存'],
            largeFiles: ['大文件', '超过 500 MB 且 90 天未访问的文件'],
            appLeftovers: ['应用残留', '疑似已卸载应用留下的配置和数据'],
          };
          emit({
            type: 'category',
            category: { id: categoryId, title: titles[categoryId][0], subtitle: titles[categoryId][1] },
            items: DEMO_ITEMS[categoryId],
          });
        }, 280 + index * 260),
      );
      timers.push(window.setTimeout(() => emit({ type: 'complete' }), 1450));
      return { started: true };
    },
    cancelScan: async () => {
      timers.forEach(window.clearTimeout);
      timers = [];
      emit({ type: 'cancelled' });
      return true;
    },
    cleanSelected: async (ids) => ({
      type: 'clean-result',
      cleanedIDs: ids,
      cleanedSize: Object.values(DEMO_ITEMS)
        .flat()
        .filter((item) => ids.includes(item.id))
        .reduce((total, item) => total + item.size, 0),
      failures: [],
    }),
    revealItem: async () => true,
    openFullDiskAccess: async () => undefined,
    onScanEvent: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}

export const bridge = window.macCleaner ?? createBrowserBridge();
