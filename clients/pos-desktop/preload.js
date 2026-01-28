const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  versions: process.versions,
  printers: {
    list: () => ipcRenderer.invoke('printers:list'),
    print: (payload) => ipcRenderer.invoke('printers:print', payload)
  }
});
