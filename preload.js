const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  downloadMP3: (url) => ipcRenderer.invoke("download-mp3", url)
});
