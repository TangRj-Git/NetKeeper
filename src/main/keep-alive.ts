import { EventEmitter } from 'node:events'

import {
  DEFAULT_APP_STATUS,
  type AppStatus,
  type LoginResult,
  type UserConfig
} from '../shared/types'

import { loginCampusNetwork } from './campus-login'
import { LoggerService } from './logger'
import { checkInternetConnectivity } from './network-checker'
import { ConfigStore } from './store'

export class KeepAliveService {
  private readonly emitter = new EventEmitter()
  private readonly status: AppStatus = { ...DEFAULT_APP_STATUS }
  private timer?: NodeJS.Timeout
  private isChecking = false
  private isLoggingIn = false
  private lastNetworkOnline?: boolean

  constructor(
    private readonly logger: LoggerService,
    private readonly store: ConfigStore
  ) {}

  async initialize(): Promise<void> {
    const config = await this.store.getConfig()

    this.updateStatus({
      autoReconnectEnabled: config.autoReconnect,
      isKeepAliveRunning: false,
      message: config.autoReconnect ? '自动重连待启动' : DEFAULT_APP_STATUS.message
    })

    if (config.autoReconnect) {
      await this.start(false, config)
    }
  }

  async syncWithConfig(config: UserConfig): Promise<void> {
    if (config.autoReconnect) {
      await this.start(false, config)
      return
    }

    await this.stop(false, config)
  }

  onStatusChange(listener: (status: AppStatus) => void): () => void {
    this.emitter.on('status', listener)
    return () => {
      this.emitter.off('status', listener)
    }
  }

  getStatus(): AppStatus {
    return { ...this.status }
  }

  async start(persist = true, existingConfig?: UserConfig): Promise<AppStatus> {
    let config = existingConfig ?? (await this.store.getConfig())
    const wasRunning = Boolean(this.timer)

    if (persist && !config.autoReconnect) {
      config = await this.store.saveConfig({
        ...config,
        autoReconnect: true
      })
    }

    this.clearTimer()
    this.timer = setInterval(() => {
      void this.runHealthCheck()
    }, config.checkInterval * 1000)

    this.updateStatus({
      autoReconnectEnabled: true,
      isKeepAliveRunning: true,
      message: `自动重连已开启，每 ${config.checkInterval} 秒检测一次`
    })

    if (!wasRunning) {
      this.lastNetworkOnline = undefined
      this.logger.info('自动重连开启')
    }

    void this.runHealthCheck()

    return this.getStatus()
  }

  async stop(persist = true, existingConfig?: UserConfig): Promise<AppStatus> {
    let config = existingConfig ?? (await this.store.getConfig())
    const wasRunning = Boolean(this.timer) || this.status.isKeepAliveRunning

    if (persist && config.autoReconnect) {
      config = await this.store.saveConfig({
        ...config,
        autoReconnect: false
      })
    }

    this.clearTimer()

    this.updateStatus({
      networkStatus: 'idle',
      autoReconnectEnabled: false,
      isKeepAliveRunning: false,
      message: '自动重连已暂停'
    })

    this.lastNetworkOnline = undefined

    if (wasRunning) {
      this.logger.info('自动重连关闭')
    }

    return this.getStatus()
  }

  private async runHealthCheck(): Promise<void> {
    if (this.isChecking) {
      return
    }

    const config = await this.store.getConfig()
    if (!config.autoReconnect) {
      return
    }

    this.isChecking = true

    try {
      this.updateStatus({
        networkStatus: 'checking',
        autoReconnectEnabled: true,
        isKeepAliveRunning: true,
        message: '正在检测连通性'
      })

      const result = await checkInternetConnectivity()

      this.updateStatus({
        lastCheckedAt: result.checkedAt
      })

      if (result.online) {
        const previousNetworkOnline = this.lastNetworkOnline
        this.lastNetworkOnline = true

        this.updateStatus({
          networkStatus: 'online',
          message: result.endpoint
            ? `外网探测正常 · ${new URL(result.endpoint).hostname}`
            : '网络正常'
        })

        if (previousNetworkOnline === false) {
          this.logger.success('网络已恢复正常')
        } else if (previousNetworkOnline === undefined) {
          this.logger.success('网络正常')
        }

        return
      }

      const previousNetworkOnline = this.lastNetworkOnline
      this.lastNetworkOnline = false

      this.updateStatus({
        networkStatus: 'offline',
        message: `网络异常：${result.reason}`
      })

      if (previousNetworkOnline !== false) {
        this.logger.warning('网络异常，准备重新登录')
      }

      await this.performLogin(config)
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      const previousNetworkOnline = this.lastNetworkOnline
      this.lastNetworkOnline = false

      this.updateStatus({
        networkStatus: 'offline',
        message: `网络检测失败：${message}`
      })

      if (previousNetworkOnline !== false) {
        this.logger.error(`网络检测失败：${message}`)
      }
    } finally {
      this.isChecking = false
    }
  }

  private async performLogin(config: UserConfig): Promise<LoginResult> {
    if (this.isLoggingIn) {
      return {
        success: false,
        message: '已有登录任务正在执行'
      }
    }

    this.isLoggingIn = true
    this.updateStatus({
      networkStatus: 'logging-in',
      message: '正在执行自动重连'
    })
    this.logger.info('开始重新登录')

    try {
      const result = await loginCampusNetwork(config)

      if (result.success) {
        this.lastNetworkOnline = true

        this.updateStatus({
          networkStatus: 'online',
          message: '重新登录成功'
        })
        this.logger.success('重新登录成功')
        return result
      }

      const failureMessage = `重新登录失败：${result.message}`

      this.updateStatus({
        networkStatus: 'login-failed',
        message: failureMessage
      })
      this.logger.error(failureMessage)
      return result
    } finally {
      this.isLoggingIn = false
    }
  }

  private updateStatus(patch: Partial<AppStatus>): void {
    Object.assign(this.status, patch)
    this.emitter.emit('status', this.getStatus())
  }

  private clearTimer(): void {
    if (!this.timer) {
      return
    }

    clearInterval(this.timer)
    this.timer = undefined
  }
}
