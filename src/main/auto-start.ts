import { app } from 'electron'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const LINUX_AUTOSTART_FILENAME = 'netkeeper.desktop'

function getLinuxAutostartPath(): string {
  return join(app.getPath('appData'), 'autostart', LINUX_AUTOSTART_FILENAME)
}

function escapeDesktopExecPath(value: string): string {
  return value.replace(/[\\"]/g, '\\$&')
}

function getLinuxExecutablePath(): string {
  // AppImage runs from a temporary mount, so the original AppImage path is
  // required for autostart to keep working after a reboot.
  return process.env.APPIMAGE ?? process.execPath
}

function getLinuxAutoStartEnabled(): boolean {
  return existsSync(getLinuxAutostartPath())
}

function setLinuxAutoStartEnabled(enabled: boolean): boolean {
  const filePath = getLinuxAutostartPath()

  try {
    if (enabled) {
      mkdirSync(dirname(filePath), { recursive: true })
      const executable = escapeDesktopExecPath(getLinuxExecutablePath())
      writeFileSync(
        filePath,
        [
          '[Desktop Entry]',
          'Type=Application',
          'Name=NetKeeper',
          'Comment=校园网保活助手',
          `Exec="${executable}" --hidden`,
          'Terminal=false',
          'X-GNOME-Autostart-enabled=true',
          ''
        ].join('\n'),
        'utf8'
      )
    } else if (existsSync(filePath)) {
      unlinkSync(filePath)
    }

    return getLinuxAutoStartEnabled()
  } catch {
    return false
  }
}

// 查询当前是否开启了开机自启动
export function getAutoStartEnabled(): boolean {
  if (process.platform === 'linux') {
    return getLinuxAutoStartEnabled()
  }

  return app.getLoginItemSettings().openAtLogin
}

// 设置开机自启动开关，设置后重新读取一次确认是否生效
export function setAutoStartEnabled(enabled: boolean): boolean {
  if (process.platform === 'linux') {
    return setLinuxAutoStartEnabled(enabled)
  }

  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
    args: ['--hidden']
  })

  return getAutoStartEnabled()
}
