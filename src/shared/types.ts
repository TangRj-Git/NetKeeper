// 网络状态枚举：空闲 / 检测中 / 在线 / 离线 / 登录中 / 登录失败
export type NetworkStatus =
  | 'idle'
  | 'checking'
  | 'online'
  | 'offline'
  | 'logging-in'
  | 'login-failed'

// 日志级别
export type LogLevel = 'info' | 'success' | 'warning' | 'error'
// 运营商类型，对应 AUST_OPERATOR_SUFFIXES 中的 key
export type OperatorPresetKey = 'telecom' | 'unicom' | 'mobile'

// 用户配置，保存到 netkeeper.config.json
export interface UserConfig {
  username: string               // 学号
  password?: string              // 密码（可选，未保存时为空）
  operator: string               // 运营商标识：'telecom' | 'unicom' | 'mobile' | ''
  autoReconnect: boolean         // 断网后是否自动重连
  checkInterval: number          // 保活检测间隔（秒）
  autoStart: boolean             // 是否开机自启动
}

// 运营商下拉选项
export interface OperatorOption {
  label: string                  // 界面上显示的文字
  value: string                  // 提交给后端的值
}

// 日志条目
export interface LogEntry {
  id: string                     // 唯一标识
  timestamp: string              // 时间戳
  level: LogLevel                // 日志级别
  message: string                // 日志内容
}

// 登录结果
export interface LoginResult {
  success: boolean               // 是否登录成功
  message: string                // 结果描述信息
}

// 配置和运行状态同步结果
export interface ConfigStatusResult {
  config: UserConfig             // 保存后的配置
  status: AppStatus              // 当前应用状态
}

// 应用运行状态，前端用于界面展示
export interface AppStatus {
  networkStatus: NetworkStatus   // 当前网络状态
  lastCheckedAt?: string         // 上次检测时间
  autoReconnectEnabled: boolean  // 自动重连是否开启
  isKeepAliveRunning: boolean    // 自动重连是否正在运行
  message: string                // 状态描述信息
}

// 保活检测间隔最小值（秒）
export const CHECK_INTERVAL_MIN_SECONDS = 10
// 日志条数上限
export const LOG_LIMIT = 300

// 创建默认的用户配置
export function createDefaultUserConfig(): UserConfig {
  return {
    username: '',
    password: '',
    operator: '',
    autoReconnect: false,
    checkInterval: 30,
    autoStart: false
  }
}

// 创建默认的应用状态
export function createDefaultAppStatus(): AppStatus {
  return {
    networkStatus: 'idle',
    autoReconnectEnabled: false,
    isKeepAliveRunning: false,
    message: '等待保存配置后开始工作'
  }
}

export const DEFAULT_USER_CONFIG = createDefaultUserConfig()
export const DEFAULT_APP_STATUS = createDefaultAppStatus()
