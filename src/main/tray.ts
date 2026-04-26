import { BrowserWindow, Menu, Tray, nativeImage } from 'electron'

import { resolveIconPath } from './icon-path'
import { KeepAliveService } from './keep-alive'

interface TrayControllerOptions {
  getWindow: () => BrowserWindow | null
  keepAlive: KeepAliveService
  quit: () => void
}

export class TrayController {
  private tray?: Tray
  private disposeStatusListener?: () => void

  constructor(private readonly options: TrayControllerOptions) {}

  init(): void {
    if (this.tray) {
      return
    }

    this.tray = new Tray(createTrayIcon())
    this.tray.setToolTip('NetKeeper - 校园网保活助手')
    this.tray.on('click', () => {
      this.showWindow()
    })

    this.disposeStatusListener = this.options.keepAlive.onStatusChange(() => {
      this.refreshMenu()
    })

    this.refreshMenu()
  }

  dispose(): void {
    this.disposeStatusListener?.()
    this.tray?.destroy()
  }

  private refreshMenu(): void {
    if (!this.tray) {
      return
    }

    const status = this.options.keepAlive.getStatus()
    const toggleLabel = status.isKeepAliveRunning ? '暂停自动重连' : '开启自动重连'

    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: '打开 NetKeeper',
          click: () => {
            this.showWindow()
          }
        },
        {
          label: toggleLabel,
          click: () => {
            void (status.isKeepAliveRunning
              ? this.options.keepAlive.stop()
              : this.options.keepAlive.start())
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            this.options.quit()
          }
        }
      ])
    )
  }

  private showWindow(): void {
    const window = this.options.getWindow()

    if (!window) {
      return
    }

    if (window.isMinimized()) {
      window.restore()
    }

    window.show()
    window.focus()
  }
}

function createTrayIcon() {
  const icon = nativeImage.createFromPath(resolveIconPath('tray.ico'))

  if (!icon.isEmpty()) {
    return icon.resize({ width: 16, height: 16 })
  }

  return nativeImage.createFromPath(resolveIconPath('icon.ico')).resize({ width: 16, height: 16 })
}
