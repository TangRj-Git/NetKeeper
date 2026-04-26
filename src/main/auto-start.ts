import { app } from 'electron'

// 查询当前是否开启了开机自启动
export function getAutoStartEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin
}

// 设置开机自启动开关，设置后重新读取一次确认是否生效
export function setAutoStartEnabled(enabled: boolean): boolean {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath
  })

  return getAutoStartEnabled()
}
