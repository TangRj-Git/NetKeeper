import type { AppStatus, ConfigStatusResult, LogEntry, UserConfig } from './types'

export interface NetKeeperApi {
  getConfig: () => Promise<UserConfig>
  saveConfig: (config: UserConfig) => Promise<UserConfig>
  setAutoReconnect: (config: UserConfig) => Promise<ConfigStatusResult>
  getStatus: () => Promise<AppStatus>
  getLogs: () => Promise<LogEntry[]>
  onLog: (callback: (entry: LogEntry) => void) => () => void
  onStatusChange: (callback: (status: AppStatus) => void) => () => void
}
