import { BrowserWindow, app, ipcMain } from 'electron'
import { join } from 'node:path'

import { IPC_CHANNELS } from '../shared/ipc'
import type { UserConfig } from '../shared/types'

import { getAutoStartEnabled, setAutoStartEnabled } from './auto-start'
import { resolveIconPath } from './icon-path'
import { KeepAliveService } from './keep-alive'
import { LoggerService } from './logger'
import { ConfigStore } from './store'
import { TrayController } from './tray'

const WINDOW_TITLE = 'NetKeeper - 校园网保活助手'
const PRELOAD_ENTRY = 'index.mjs'

const logger = new LoggerService()
const store = new ConfigStore()
const keepAlive = new KeepAliveService(logger, store)

let mainWindow: BrowserWindow | null = null
let trayController: TrayController | null = null
let isQuitting = false
let bridgeWired = false

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1100,
    minHeight: 760,
    show: false,
    title: WINDOW_TITLE,
    icon: resolveIconPath('icon.ico'),
    backgroundColor: '#edf4fb',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, `../preload/${PRELOAD_ENTRY}`),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  window.once('ready-to-show', () => {
    window.show()
  })

  window.on('close', (event) => {
    if (isQuitting) {
      return
    }

    event.preventDefault()
    window.hide()
    logger.info('主窗口已隐藏到系统托盘')
  })

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
    }
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

function sendToRenderer(channel: string, payload: unknown): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  mainWindow.webContents.send(channel, payload)
}

function wireRuntimeEvents(): void {
  if (bridgeWired) {
    return
  }

  bridgeWired = true

  logger.onEntry((entry) => {
    sendToRenderer(IPC_CHANNELS.logPush, entry)
  })

  keepAlive.onStatusChange((status) => {
    sendToRenderer(IPC_CHANNELS.statusPush, status)
  })
}

function handle(channel: string, listener: Parameters<typeof ipcMain.handle>[1]): void {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, listener)
}

function registerIpcHandlers(): void {
  handle(IPC_CHANNELS.getConfig, () => store.getConfig())

  handle(IPC_CHANNELS.saveConfig, async (_event, config: UserConfig) => {
    const saved = await store.saveConfig(config)
    if (getAutoStartEnabled() !== saved.autoStart) {
      setAutoStartEnabled(saved.autoStart)
    }
    await keepAlive.syncWithConfig(saved)
    logger.success('配置保存成功')
    return saved
  })

  handle(IPC_CHANNELS.setAutoReconnect, async (_event, config: UserConfig) => {
    const saved = await store.saveConfig(config)

    if (getAutoStartEnabled() !== saved.autoStart) {
      setAutoStartEnabled(saved.autoStart)
    }

    await keepAlive.syncWithConfig(saved)

    return {
      config: saved,
      status: keepAlive.getStatus()
    }
  })

  handle(IPC_CHANNELS.getStatus, () => keepAlive.getStatus())
  handle(IPC_CHANNELS.getLogs, () => logger.getEntries())
}

async function bootstrap(): Promise<void> {
  app.setAppUserModelId('com.netkeeper.app')

  registerIpcHandlers()
  wireRuntimeEvents()

  const config = await store.getConfig()
  if (getAutoStartEnabled() !== config.autoStart) {
    setAutoStartEnabled(config.autoStart)
  }

  mainWindow = createMainWindow()
  trayController = new TrayController({
    getWindow: () => mainWindow,
    keepAlive,
    quit: () => {
      isQuitting = true
      app.quit()
    }
  })
  trayController.init()

  logger.info('软件启动')
  await keepAlive.initialize()
}

app.on('before-quit', () => {
  isQuitting = true
  trayController?.dispose()
})

app.whenReady()
  .then(() => bootstrap())
  .catch((error) => {
    logger.error(`启动失败：${error instanceof Error ? error.message : '未知错误'}`)
    app.quit()
  })

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow()
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
})
