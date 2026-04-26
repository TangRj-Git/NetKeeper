export const IPC_CHANNELS = {
  getConfig: 'netkeeper:get-config',
  saveConfig: 'netkeeper:save-config',
  setAutoReconnect: 'netkeeper:set-auto-reconnect',
  getStatus: 'netkeeper:get-status',
  getLogs: 'netkeeper:get-logs',
  logPush: 'netkeeper:log-push',
  statusPush: 'netkeeper:status-push'
} as const
