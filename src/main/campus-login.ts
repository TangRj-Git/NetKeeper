import type { LoginResult, OperatorPresetKey, UserConfig } from '../shared/types'

import {
  AUST_LOGIN_FAILURE_KEYWORDS,
  AUST_LOGIN_FIXED_PARAMS,
  AUST_LOGIN_SUCCESS_KEYWORDS,
  AUST_LOGIN_URL,
  AUST_OPERATOR_SUFFIXES,
  AUST_PORTAL_URL,
  createRandomFourDigits
} from './aust-drcom-config'
import { directFetch } from './direct-fetch'
import { GATEWAY_USER_AGENT, REQUEST_ACCEPT_HEADER } from './gateway-http'

// 登录请求超时时间（毫秒）
const REQUEST_TIMEOUT_MS = 8000

// 认证网关会话信息，包含 Cookie 和最终跳转地址
interface SessionInfo {
  finalUrl?: string
}

// 构建好的登录请求，包含完整 URL 和 fetch 参数
interface BuiltRequest {
  url: string
  init: RequestInit
}

// 校园网登录主函数，返回登录结果
export async function loginCampusNetwork(config: UserConfig): Promise<LoginResult> {
  // 校验必填字段
  if (!config.username.trim() || !config.password || !config.operator) {
    return {
      success: false,
      message: '请先完整填写账号、密码和认证出口'
    }
  }

  try {
    // 1. 访问认证首页获取 Cookie
    const session = await prepareGatewaySession()
    // 2. 拼接登录请求的完整 URL 和请求头
    const request = buildLoginRequest(config, session)
    // 3. 发起登录请求
    const response = await directFetch(request.url, request.init)
    const finalUrl = response.url || request.url
    const responseText = await readResponseText(response)
    // 4. 解析响应内容
    const parsedPayload = parseGatewayResponse(responseText)

    // 4a. HTTP 状态码异常
    if (!response.ok) {
      return {
        success: false,
        message: describeLoginHttpStatus(response.status)
      }
    }

    // 4b. 解析到结构化数据，通过 result 字段判断
    if (parsedPayload && typeof parsedPayload.result === 'number') {
      if (parsedPayload.result === 1) {
        return {
          success: true,
          message: '登录成功'
        }
      }

      return {
        success: false,
        message: normalizeFailureMessage(
          readFailureMessage(parsedPayload) ?? '认证返回 result=0'
        )
      }
    }

    // 4c. 已知的特定失败情况（如跳转到错误页面）
    const knownFailure = detectKnownFailure(responseText, finalUrl)
    if (knownFailure) {
      return {
        success: false,
        message: knownFailure
      }
    }

    // 4d. 通过关键字匹配失败响应
    if (containsKeyword(responseText, AUST_LOGIN_FAILURE_KEYWORDS)) {
      return {
        success: false,
        message: normalizeFailureMessage(extractReadableMessage(responseText))
      }
    }

    // 4e. 通过关键字匹配成功响应
    if (containsKeyword(responseText, AUST_LOGIN_SUCCESS_KEYWORDS)) {
      return {
        success: true,
        message: '登录成功'
      }
    }

    // 无法判断登录结果
    return {
      success: false,
      message: '暂时无法确认登录结果，请根据真实接口调整响应判定'
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '登录请求失败'
    }
  }
}

// 访问认证首页，获取 Cookie 和最终跳转地址
async function prepareGatewaySession(): Promise<SessionInfo> {
  try {
    const response = await directFetch(AUST_PORTAL_URL, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': GATEWAY_USER_AGENT,
        Accept: REQUEST_ACCEPT_HEADER
      }
    })

    return {
      finalUrl: response.url || AUST_PORTAL_URL
    }
  } catch {
    return {}
  }
}

// 根据用户配置和会话信息，拼接完整的登录请求
function buildLoginRequest(config: UserConfig, session: SessionInfo): BuiltRequest {
  const headers: Record<string, string> = {
    'User-Agent': GATEWAY_USER_AGENT,
    Accept: REQUEST_ACCEPT_HEADER,
    Referer: session.finalUrl ?? AUST_PORTAL_URL
  }

  // 拼接查询参数
  const payload = new URLSearchParams()
  payload.set('callback', `dr${createRandomFourDigits()}`)
  payload.set('DDDDD', `${config.username.trim()}${resolveOperatorSuffix(config.operator)}`)
  payload.set('upass', config.password ?? '')

  for (const [key, value] of AUST_LOGIN_FIXED_PARAMS) {
    payload.set(key, value)
  }

  payload.set('v', createRandomFourDigits())

  const requestUrl = new URL(AUST_LOGIN_URL)
  requestUrl.search = payload.toString()

  return {
    url: requestUrl.toString(),
    init: {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: 'follow'
    }
  }
}

// 根据运营商标识获取对应的后缀（如 'telecom' → '@aust'）
function resolveOperatorSuffix(operator: string): string {
  return AUST_OPERATOR_SUFFIXES[operator as OperatorPresetKey] ?? operator
}

// 根据 HTTP 状态码生成用户可读的错误提示
function describeLoginHttpStatus(statusCode: number): string {
  if (statusCode === 404) {
    return '登录接口返回 404：当前登录 URL 可能不是本校真实提交地址'
  }

  if (statusCode === 403) {
    return '登录接口返回 403：认证网关拒绝请求，可能需要 Cookie、Referer 或真实请求头'
  }

  return `登录接口返回 ${statusCode}`
}

// 读取响应文本，自动处理编码（Drcom 返回 gbk 编码）
async function readResponseText(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''
  const charsetMatch = /charset=([^;]+)/i.exec(contentType)
  const encoding = charsetMatch?.[1]?.trim().toLowerCase() ?? 'utf-8'
  const bytes = new Uint8Array(await response.arrayBuffer())

  try {
    return new TextDecoder(encoding).decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

// 解析网关响应，支持 JSONP 和 JSON 格式，以及松散格式的 fallback
function parseGatewayResponse(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()

  // JSONP 格式：funcName({...})
  if (/^[A-Za-z_$][\w$]*\s*\(/.test(trimmed)) {
    const firstParen = trimmed.indexOf('(')
    const lastParen = trimmed.lastIndexOf(')')

    if (firstParen !== -1 && lastParen !== -1 && lastParen > firstParen) {
      const payload = trimmed.slice(firstParen + 1, lastParen).trim()
      try {
        return JSON.parse(payload) as Record<string, unknown>
      } catch {
        return parseLooseDrcomPayload(payload)
      }
    }
  }

  // 纯 JSON 格式
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    return parseLooseDrcomPayload(trimmed)
  }
}

// 用正则从非标准格式中提取 result、msg、uid 等字段
function parseLooseDrcomPayload(text: string): Record<string, unknown> | null {
  const result = matchNumberField(text, 'result')
  const msga = matchStringField(text, 'msga')
  const msg = matchStringField(text, 'msg')
  const uid = matchStringField(text, 'uid')

  if (result === null && !msga && !msg && !uid) {
    return null
  }

  return {
    ...(result === null ? {} : { result }),
    ...(msga ? { msga } : {}),
    ...(msg ? { msg } : {}),
    ...(uid ? { uid } : {})
  }
}

// 用正则从文本中提取数字字段的值
function matchNumberField(text: string, field: string): number | null {
  const pattern = new RegExp(`["']?${field}["']?\\s*:\\s*(-?\\d+)`)
  const match = pattern.exec(text)
  return match ? Number(match[1]) : null
}

// 用正则从文本中提取字符串字段的值
function matchStringField(text: string, field: string): string | undefined {
  const pattern = new RegExp(`["']?${field}["']?\\s*:\\s*["']([^"']+)["']`)
  return pattern.exec(text)?.[1]
}

// 从解析后的响应中读取失败信息
function readFailureMessage(payload: Record<string, unknown>): string | undefined {
  const candidateKeys = ['msg', 'message', 'msga', 'error', 'errmsg', 'uid']

  for (const key of candidateKeys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return undefined
}

// 检测已知的特定失败情况（URL 跳转到错误页面等）
function detectKnownFailure(text: string, finalUrl: string): string | undefined {
  if (finalUrl.includes('/a79.htm') || text.includes('账号不存在')) {
    return '账号不存在或认证出口选择错误，请检查学号和营业厅/运营商'
  }

  return undefined
}

// 将 Drcom 返回的原始错误信息转换为用户友好的中文提示
function normalizeFailureMessage(message: string): string {
  if (message.includes('ldap auth error') || message.includes('校园网密码错误')) {
    return '校园网密码错误，请检查密码'
  }

  if (message.includes('Rad:userid error1')) {
    return '账号不存在或认证出口选择错误，请检查学号和营业厅/运营商'
  }

  if (message.includes('账号不存在')) {
    return '账号不存在或认证出口选择错误，请检查学号和营业厅/运营商'
  }

  return message
}

// 检查文本中是否包含关键字数组中的任意一个
function containsKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

// 从响应文本中提取可读信息，去除 HTML 标签
function extractReadableMessage(text: string): string {
  const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  if (!plainText) {
    return '认证接口未返回可读信息'
  }

  return plainText.slice(0, 120)
}
