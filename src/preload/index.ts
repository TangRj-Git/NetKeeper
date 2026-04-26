import { contextBridge, ipcRenderer } from 'electron'

import type { NetKeeperApi } from '../shared/api'
import { IPC_CHANNELS } from '../shared/ipc'

const api: NetKeeperApi = {
  getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.getConfig),
  saveConfig: (config) => ipcRenderer.invoke(IPC_CHANNELS.saveConfig, config),
  setAutoReconnect: (config) => ipcRenderer.invoke(IPC_CHANNELS.setAutoReconnect, config),
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.getStatus),
  getLogs: () => ipcRenderer.invoke(IPC_CHANNELS.getLogs),
  onLog: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, entry: Parameters<typeof callback>[0]) => {
      callback(entry)
    }

    ipcRenderer.on(IPC_CHANNELS.logPush, listener)

    return () => {
      ipcRenderer.off(IPC_CHANNELS.logPush, listener)
    }
  },
  onStatusChange: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, status: Parameters<typeof callback>[0]) => {
      callback(status)
    }

    ipcRenderer.on(IPC_CHANNELS.statusPush, listener)

    return () => {
      ipcRenderer.off(IPC_CHANNELS.statusPush, listener)
    }
  }
}

contextBridge.exposeInMainWorld('netkeeper', api)
