import { app } from 'electron'
import { join } from 'node:path'

export type IconKind = 'icon' | 'tray'

export function resolveIconPath(kind: IconKind): string {
  const extension = process.platform === 'win32' ? 'ico' : 'png'
  const filename = `${kind}.${extension}`

  if (app.isPackaged) {
    return join(process.resourcesPath, filename)
  }

  return join(app.getAppPath(), 'build', filename)
}
