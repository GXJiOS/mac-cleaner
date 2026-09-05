const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('macCleaner', {
  getRuntime: () => ipcRenderer.invoke('app:get-runtime'),
  startScan: () => ipcRenderer.invoke('scan:start'),
  cancelScan: () => ipcRenderer.invoke('scan:cancel'),
  cleanSelected: (ids) => ipcRenderer.invoke('clean:run', ids),
  revealItem: (id) => ipcRenderer.invoke('item:reveal', id),
  openFullDiskAccess: () => ipcRenderer.invoke('system:open-full-disk-access'),
  onScanEvent: (callback) => subscribe('scan:event', callback),
});
