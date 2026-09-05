const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

app.setName('MacCleaner');

const CATEGORY_IDS = new Set(['userCache', 'devJunk', 'largeFiles', 'appLeftovers']);

let mainWindow = null;
let scanProcess = null;
let scanCache = new Map();
let isQuitting = false;

function helperPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'helper', 'MacCleaner')
    : path.join(__dirname, '..', '.build', 'debug', 'MacCleaner');
}

function helperReady() {
  try {
    fs.accessSync(helperPath(), fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function sendScanEvent(event) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('scan:event', event);
  }
}

function safeText(value, maxLength) {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

function normalizeItem(raw, expectedCategory) {
  if (!raw || typeof raw !== 'object') return null;
  const itemPath = safeText(raw.path, 4096);
  const id = safeText(raw.id, 4096);
  const category = safeText(raw.category, 64);
  const safety = raw.safety === 'safe' || raw.safety === 'caution' ? raw.safety : null;
  const size = Number(raw.size);
  if (
    !itemPath.startsWith('/') ||
    id !== itemPath ||
    category !== expectedCategory ||
    !CATEGORY_IDS.has(category) ||
    !safety ||
    !Number.isSafeInteger(size) ||
    size < 0
  ) {
    return null;
  }
  return {
    id,
    path: itemPath,
    name: safeText(raw.name, 512) || path.basename(itemPath),
    detail: safeText(raw.detail, 1024),
    size,
    category,
    safety,
  };
}

function normalizeCategoryEvent(raw) {
  const categoryId = safeText(raw?.category?.id, 64);
  if (!CATEGORY_IDS.has(categoryId) || !Array.isArray(raw?.items)) return null;
  const items = raw.items.slice(0, 50_000).map((item) => normalizeItem(item, categoryId));
  if (items.some((item) => item === null)) return null;
  return {
    type: 'category',
    category: {
      id: categoryId,
      title: safeText(raw.category.title, 80),
      subtitle: safeText(raw.category.subtitle, 240),
    },
    items,
  };
}

function parseLines(onLine) {
  let buffer = '';
  return (chunk) => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) onLine(line);
    }
  };
}

function startScanProcess() {
  if (scanProcess) return { started: false, reason: 'already-running' };
  if (!helperReady()) throw new Error('Swift helper 尚未构建');

  scanCache = new Map();
  let completed = false;
  let parseFailed = false;
  const child = spawn(helperPath(), ['--bridge-scan'], { stdio: ['ignore', 'pipe', 'pipe'] });
  scanProcess = child;

  child.stdout.on('data', parseLines((line) => {
    try {
      const event = JSON.parse(line);
      if (event.type === 'category') {
        const normalized = normalizeCategoryEvent(event);
        if (!normalized) throw new Error('扫描结果格式无效');
        for (const item of normalized.items) scanCache.set(item.id, item);
        sendScanEvent(normalized);
      } else if (event.type === 'complete') {
        completed = true;
        sendScanEvent({ type: 'complete' });
      } else if (event.type === 'error') {
        sendScanEvent({ type: 'error', message: safeText(event.message, 500) });
      }
    } catch (error) {
      parseFailed = true;
      child.kill('SIGTERM');
      sendScanEvent({
        type: 'error',
        message: error instanceof Error ? error.message : '无法解析扫描结果',
      });
    }
  }));

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr = (stderr + chunk.toString('utf8')).slice(-2000);
  });
  child.on('error', (error) => {
    sendScanEvent({ type: 'error', message: error.message });
  });
  child.on('close', (code, signal) => {
    scanProcess = null;
    if (!completed && !parseFailed && signal !== 'SIGTERM') {
      sendScanEvent({
        type: 'error',
        message: stderr.trim() || `扫描进程异常结束（${code ?? 'unknown'}）`,
      });
    }
  });
  return { started: true };
}

function runClean(items) {
  return new Promise((resolve, reject) => {
    const child = spawn(helperPath(), ['--bridge-clean'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let result = null;
    let stderr = '';
    let parseError = null;

    child.stdout.on('data', parseLines((line) => {
      try {
        const event = JSON.parse(line);
        if (event.type === 'error') parseError = new Error(safeText(event.message, 500));
        if (event.type === 'clean-result') result = event;
      } catch {
        parseError = new Error('无法解析清理结果');
      }
    }));
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString('utf8')).slice(-2000);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (parseError) reject(parseError);
      else if (code !== 0 || !result) reject(new Error(stderr.trim() || '清理进程异常结束'));
      else resolve(result);
    });
    child.stdin.end(JSON.stringify({ items }));
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1040,
    minHeight: 700,
    show: false,
    backgroundColor: '#081018',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 18, y: 18 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow?.show();
    mainWindow?.webContents.invalidate();
  });
  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error(`[renderer] ${code}: ${description}`);
  });

  if (app.isPackaged) {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    void mainWindow.loadURL('http://127.0.0.1:5173');
    if (process.env.MACCLEANER_DEBUG === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }
}

ipcMain.handle('app:get-runtime', () => ({
  platform: process.platform,
  version: app.getVersion(),
  helperReady: helperReady(),
}));

ipcMain.handle('scan:start', () => startScanProcess());

ipcMain.handle('scan:cancel', () => {
  if (!scanProcess) return false;
  scanProcess.kill('SIGTERM');
  scanProcess = null;
  sendScanEvent({ type: 'cancelled' });
  return true;
});

ipcMain.handle('clean:run', async (_event, ids) => {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 10_000) {
    throw new Error('清理选择无效');
  }
  const uniqueIDs = [...new Set(ids)];
  if (uniqueIDs.some((id) => typeof id !== 'string' || !scanCache.has(id))) {
    throw new Error('清理请求包含本轮扫描之外的项目');
  }
  const items = uniqueIDs.map((id) => scanCache.get(id));
  const result = await runClean(items);
  for (const id of result.cleanedIDs ?? []) scanCache.delete(id);
  return result;
});

ipcMain.handle('item:reveal', (_event, id) => {
  const item = typeof id === 'string' ? scanCache.get(id) : null;
  if (!item) return false;
  shell.showItemInFolder(item.path);
  return true;
});

ipcMain.handle('system:open-full-disk-access', () =>
  shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles'),
);

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  app.whenReady().then(() => {
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(Menu.buildFromTemplate([
        {
          label: 'MacCleaner',
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        { role: 'editMenu' },
        { role: 'windowMenu' },
      ]));
    }
    createWindow();
  });
  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow();
    else mainWindow.show();
  });
  app.on('before-quit', () => {
    isQuitting = true;
    scanProcess?.kill('SIGTERM');
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' || isQuitting) app.quit();
  });
}
