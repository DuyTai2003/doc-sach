const { contextBridge } = require('electron');

// Expose any APIs needed by the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
});
