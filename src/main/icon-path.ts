import { app } from 'electron'
import { join } from 'node:path'

export function resolveIconPath(filename: 'icon.ico' | 'tray.ico'): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, filename)
  }

  return join(app.getAppPath(), 'build', filename)
}
