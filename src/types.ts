export type CategoryId = 'userCache' | 'devJunk' | 'largeFiles' | 'appLeftovers';
export type Safety = 'safe' | 'caution';
export type AppPhase = 'idle' | 'scanning' | 'cleaning';

export interface CleanItem {
  id: string;
  path: string;
  name: string;
  detail: string;
  size: number;
  category: CategoryId;
  safety: Safety;
}

export interface CategoryInfo {
  id: CategoryId;
  title: string;
  subtitle: string;
}

export type ScanEvent =
  | { type: 'category'; category: CategoryInfo; items: CleanItem[] }
  | { type: 'complete' }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

export interface CleanFailure {
  name: string;
  reason: string;
}

export interface CleanResult {
  type: 'clean-result';
  cleanedIDs: string[];
  cleanedSize: number;
  failures: CleanFailure[];
}

export interface RuntimeInfo {
  platform: string;
  version: string;
  helperReady: boolean;
}

export interface MacCleanerBridge {
  getRuntime(): Promise<RuntimeInfo>;
  startScan(): Promise<{ started: boolean; reason?: string }>;
  cancelScan(): Promise<boolean>;
  cleanSelected(ids: string[]): Promise<CleanResult>;
  revealItem(id: string): Promise<boolean>;
  openFullDiskAccess(): Promise<void>;
  onScanEvent(callback: (event: ScanEvent) => void): () => void;
}

declare global {
  interface Window {
    macCleaner?: MacCleanerBridge;
  }
}
